//! MeshPacketV1 — the canonical wire-format envelope.
//!
//! Corresponds to the structure in `protocol/PACKET_SPEC_V1.md`.
//! CBOR-encoded for BLE compactness; binary fields use `serde_bytes`
//! for proper CBOR byte-string encoding.

use serde::{Deserialize, Serialize};

use crate::types::{DestinationScope, MessageType, PayloadKind, Priority};

/// The V1 mesh packet envelope.
///
/// This is the unit of data that travels over BLE and is ingested by
/// the backend via gateway upload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshPacketV1 {
    /// Protocol version — must be `1` for V1 packets.
    pub version: u8,

    /// Globally unique packet identifier (16 bytes).
    /// Used for deduplication and idempotent ingestion.
    #[serde(with = "serde_bytes")]
    pub packet_id: Vec<u8>,

    /// Privacy-preserving origin identifier (32 bytes).
    /// This is the Ed25519 public key of the originating device.
    #[serde(with = "serde_bytes")]
    pub origin_id: Vec<u8>,

    /// Routing scope.
    pub destination_scope: DestinationScope,

    /// Semantic message type.
    pub message_type: MessageType,

    /// Unix timestamp (seconds) when the packet was created.
    pub created_at: u64,

    /// Unix timestamp (seconds) when the packet expires.
    /// Relays and the backend MUST reject expired packets.
    pub expires_at: u64,

    /// Time-to-live: maximum remaining forwards allowed.
    pub ttl: u8,

    /// Number of hops this packet has traversed so far.
    pub hop_count: u8,

    /// Emergency/scheduling priority.
    pub priority: Priority,

    /// Describes what `payload` contains.
    pub payload_kind: PayloadKind,

    /// Encrypted/authenticated application data.
    /// Relay nodes do NOT need plaintext access to forward.
    #[serde(with = "serde_bytes")]
    pub payload: Vec<u8>,

    /// Ed25519 signature over the signable portion of this packet.
    /// Provides authenticity and integrity protection.
    #[serde(with = "serde_bytes")]
    pub auth_tag: Vec<u8>,
}

/// The signable subset of a [`MeshPacketV1`] (everything except `auth_tag`).
///
/// Serialized to CBOR to produce the bytes that are signed/verified.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SignablePacketV1 {
    pub version: u8,
    #[serde(with = "serde_bytes")]
    pub packet_id: Vec<u8>,
    #[serde(with = "serde_bytes")]
    pub origin_id: Vec<u8>,
    pub destination_scope: DestinationScope,
    pub message_type: MessageType,
    pub created_at: u64,
    pub expires_at: u64,
    pub ttl: u8,
    pub hop_count: u8,
    pub priority: Priority,
    pub payload_kind: PayloadKind,
    #[serde(with = "serde_bytes")]
    pub payload: Vec<u8>,
}

impl MeshPacketV1 {
    /// Serialize the packet to CBOR bytes.
    pub fn to_cbor(&self) -> Result<Vec<u8>, CborError> {
        let mut buf = Vec::new();
        ciborium::into_writer(self, &mut buf).map_err(CborError::Encode)?;
        Ok(buf)
    }

    /// Deserialize a packet from CBOR bytes.
    pub fn from_cbor(bytes: &[u8]) -> Result<Self, CborError> {
        ciborium::from_reader(bytes).map_err(CborError::Decode)
    }

    /// Produce the canonical byte sequence that is signed / verified.
    ///
    /// This is CBOR(all fields except `auth_tag`).
    pub fn signable_bytes(&self) -> Result<Vec<u8>, CborError> {
        let signable = SignablePacketV1 {
            version: self.version,
            packet_id: self.packet_id.clone(),
            origin_id: self.origin_id.clone(),
            destination_scope: self.destination_scope,
            message_type: self.message_type,
            created_at: self.created_at,
            expires_at: self.expires_at,
            ttl: self.ttl,
            hop_count: self.hop_count,
            priority: self.priority,
            payload_kind: self.payload_kind,
            payload: self.payload.clone(),
        };
        let mut buf = Vec::new();
        ciborium::into_writer(&signable, &mut buf).map_err(CborError::Encode)?;
        Ok(buf)
    }
}

/// CBOR serialization/deserialization errors.
#[derive(Debug, thiserror::Error)]
pub enum CborError {
    #[error("CBOR encoding failed: {0}")]
    Encode(ciborium::ser::Error<std::io::Error>),
    #[error("CBOR decoding failed: {0}")]
    Decode(ciborium::de::Error<std::io::Error>),
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn sample_packet() -> MeshPacketV1 {
        MeshPacketV1 {
            version: 1,
            packet_id: vec![0u8; 16],
            origin_id: vec![0u8; 32],
            destination_scope: DestinationScope::AreaGateway,
            message_type: MessageType::Sos,
            created_at: 1700000000,
            expires_at: 1700003600,
            ttl: 5,
            hop_count: 0,
            priority: Priority::Critical,
            payload_kind: PayloadKind::Emergency,
            payload: vec![1, 2, 3, 4],
            auth_tag: vec![0u8; 64],
        }
    }

    #[test]
    fn roundtrip_cbor() {
        let pkt = sample_packet();
        let cbor = pkt.to_cbor().expect("encode");
        let decoded = MeshPacketV1::from_cbor(&cbor).expect("decode");
        assert_eq!(pkt.version, decoded.version);
        assert_eq!(pkt.packet_id, decoded.packet_id);
        assert_eq!(pkt.message_type, decoded.message_type);
        assert_eq!(pkt.payload, decoded.payload);
    }

    #[test]
    fn signable_bytes_excludes_auth_tag() {
        let mut pkt = sample_packet();
        let sig1 = pkt.signable_bytes().expect("signable");
        pkt.auth_tag = vec![0xffu8; 64]; // change auth_tag
        let sig2 = pkt.signable_bytes().expect("signable");
        assert_eq!(sig1, sig2, "signable bytes must be independent of auth_tag");
    }

    #[test]
    fn cbor_is_compact() {
        let pkt = sample_packet();
        let cbor = pkt.to_cbor().expect("encode");
        assert!(
            cbor.len() < crate::MAX_PACKET_SIZE,
            "CBOR encoding ({} bytes) exceeds MAX_PACKET_SIZE ({})",
            cbor.len(),
            crate::MAX_PACKET_SIZE
        );
    }
}
