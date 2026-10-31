//! Packet validation rules.
//!
//! Implements the relay rules from `protocol/PACKET_SPEC_V1.md`:
//! reject malformed, expired, oversized, or out-of-version packets
//! **before** any cryptographic or persistence work.

use std::time::{SystemTime, UNIX_EPOCH};

use crate::packet::MeshPacketV1;
use crate::{MAX_PACKET_SIZE, MAX_PAYLOAD_SIZE, MAX_TTL, PACKET_ID_SIZE, PROTOCOL_VERSION, PUBLIC_KEY_SIZE};

/// Validation errors — each variant maps to a specific relay rejection rule.
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("unsupported protocol version {0}, expected {PROTOCOL_VERSION}")]
    UnsupportedVersion(u8),

    #[error("packet_id length {0}, expected {PACKET_ID_SIZE}")]
    InvalidPacketIdLength(usize),

    #[error("origin_id length {0}, expected {PUBLIC_KEY_SIZE}")]
    InvalidOriginIdLength(usize),

    #[error("packet expired: expires_at={expires_at}, now={now}")]
    Expired { expires_at: u64, now: u64 },

    #[error("expires_at ({expires_at}) must be after created_at ({created_at})")]
    InvalidTimeRange { created_at: u64, expires_at: u64 },

    #[error("TTL {0} exceeds maximum {MAX_TTL}")]
    TtlExceeded(u8),

    #[error("TTL is zero — packet has exhausted its forwarding budget")]
    TtlExhausted,

    #[error("hop_count ({hop_count}) exceeds TTL ({ttl})")]
    HopCountExceedsTtl { hop_count: u8, ttl: u8 },

    #[error("payload size {0} exceeds maximum {MAX_PAYLOAD_SIZE}")]
    PayloadTooLarge(usize),

    #[error("encoded packet size {0} exceeds maximum {MAX_PACKET_SIZE}")]
    PacketTooLarge(usize),

    #[error("empty payload")]
    EmptyPayload,

    #[error("empty auth_tag — packet is not signed")]
    MissingAuthTag,
}

/// Validate a deserialized packet against all structural/semantic rules.
///
/// This does **not** verify the cryptographic signature — that is a
/// separate step in [`crate::crypto::verify_packet_signature`].
pub fn validate_packet(packet: &MeshPacketV1) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();

    // Version compatibility
    if packet.version != PROTOCOL_VERSION {
        errors.push(ValidationError::UnsupportedVersion(packet.version));
    }

    // Field lengths
    if packet.packet_id.len() != PACKET_ID_SIZE {
        errors.push(ValidationError::InvalidPacketIdLength(packet.packet_id.len()));
    }
    if packet.origin_id.len() != PUBLIC_KEY_SIZE {
        errors.push(ValidationError::InvalidOriginIdLength(packet.origin_id.len()));
    }

    // Time range sanity
    if packet.expires_at <= packet.created_at {
        errors.push(ValidationError::InvalidTimeRange {
            created_at: packet.created_at,
            expires_at: packet.expires_at,
        });
    }

    // Expiry check (do not trust remote clocks blindly, but reject obviously expired)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    if packet.expires_at < now {
        errors.push(ValidationError::Expired {
            expires_at: packet.expires_at,
            now,
        });
    }

    // TTL checks
    if packet.ttl > MAX_TTL {
        errors.push(ValidationError::TtlExceeded(packet.ttl));
    }
    if packet.ttl == 0 {
        errors.push(ValidationError::TtlExhausted);
    }
    if packet.hop_count > packet.ttl {
        errors.push(ValidationError::HopCountExceedsTtl {
            hop_count: packet.hop_count,
            ttl: packet.ttl,
        });
    }

    // Payload size
    if packet.payload.is_empty() {
        errors.push(ValidationError::EmptyPayload);
    }
    if packet.payload.len() > MAX_PAYLOAD_SIZE {
        errors.push(ValidationError::PayloadTooLarge(packet.payload.len()));
    }

    // Auth tag presence (actual verification is separate)
    if packet.auth_tag.is_empty() {
        errors.push(ValidationError::MissingAuthTag);
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Validate the raw CBOR byte size before deserialization.
///
/// Call this **before** [`MeshPacketV1::from_cbor`] to reject oversized
/// payloads without parsing them.
pub fn validate_packet_size(cbor_bytes: &[u8]) -> Result<(), ValidationError> {
    if cbor_bytes.len() > MAX_PACKET_SIZE {
        Err(ValidationError::PacketTooLarge(cbor_bytes.len()))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn valid_packet() -> MeshPacketV1 {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        MeshPacketV1 {
            version: PROTOCOL_VERSION,
            packet_id: vec![1u8; PACKET_ID_SIZE],
            origin_id: vec![2u8; PUBLIC_KEY_SIZE],
            destination_scope: DestinationScope::AreaGateway,
            message_type: MessageType::Sos,
            created_at: now,
            expires_at: now + 3600,
            ttl: 5,
            hop_count: 1,
            priority: Priority::Critical,
            payload_kind: PayloadKind::Emergency,
            payload: b"test payload".to_vec(),
            auth_tag: vec![3u8; 64],
        }
    }

    #[test]
    fn valid_packet_passes() {
        assert!(validate_packet(&valid_packet()).is_ok());
    }

    #[test]
    fn wrong_version_rejected() {
        let mut pkt = valid_packet();
        pkt.version = 99;
        let errs = validate_packet(&pkt).unwrap_err();
        assert!(errs.iter().any(|e| matches!(e, ValidationError::UnsupportedVersion(99))));
    }

    #[test]
    fn expired_packet_rejected() {
        let mut pkt = valid_packet();
        pkt.created_at = 1000;
        pkt.expires_at = 2000; // far in the past
        let errs = validate_packet(&pkt).unwrap_err();
        assert!(errs.iter().any(|e| matches!(e, ValidationError::Expired { .. })));
    }

    #[test]
    fn zero_ttl_rejected() {
        let mut pkt = valid_packet();
        pkt.ttl = 0;
        let errs = validate_packet(&pkt).unwrap_err();
        assert!(errs.iter().any(|e| matches!(e, ValidationError::TtlExhausted)));
    }

    #[test]
    fn oversized_payload_rejected() {
        let mut pkt = valid_packet();
        pkt.payload = vec![0u8; MAX_PAYLOAD_SIZE + 1];
        let errs = validate_packet(&pkt).unwrap_err();
        assert!(errs.iter().any(|e| matches!(e, ValidationError::PayloadTooLarge(_))));
    }

    #[test]
    fn missing_auth_tag_rejected() {
        let mut pkt = valid_packet();
        pkt.auth_tag = vec![];
        let errs = validate_packet(&pkt).unwrap_err();
        assert!(errs.iter().any(|e| matches!(e, ValidationError::MissingAuthTag)));
    }

    #[test]
    fn multiple_errors_collected() {
        let mut pkt = valid_packet();
        pkt.version = 99;
        pkt.ttl = 0;
        pkt.payload = vec![];
        pkt.auth_tag = vec![];
        let errs = validate_packet(&pkt).unwrap_err();
        assert!(errs.len() >= 4, "expected at least 4 errors, got {}", errs.len());
    }
}
