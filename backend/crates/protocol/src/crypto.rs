//! Cryptographic verification for mesh packets.
//!
//! Uses Ed25519 (via `ed25519-dalek`) — an established, reviewed
//! algorithm. This module performs **verification only**; key generation
//! and signing happen on the originating device (Android Keystore).
//!
//! Per project rules: no hand-rolled crypto.

use ed25519_dalek::{Signature, Verifier, VerifyingKey};

use crate::packet::MeshPacketV1;
use crate::{PUBLIC_KEY_SIZE, SIGNATURE_SIZE};

/// Cryptographic operation errors.
#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("invalid public key length: expected {PUBLIC_KEY_SIZE}, got {0}")]
    InvalidKeyLength(usize),

    #[error("invalid signature length: expected {SIGNATURE_SIZE}, got {0}")]
    InvalidSignatureLength(usize),

    #[error("invalid public key: {0}")]
    InvalidPublicKey(String),

    #[error("invalid signature encoding: {0}")]
    InvalidSignature(String),

    #[error("signature verification failed")]
    VerificationFailed,

    #[error("failed to produce signable bytes: {0}")]
    SignableBytesFailed(String),
}

/// Verify the Ed25519 signature on a [`MeshPacketV1`].
///
/// The `origin_id` field is interpreted as the signer's Ed25519 public
/// key. The signable bytes are `CBOR(packet − auth_tag)`.
///
/// Returns `Ok(true)` if the signature is valid, `Ok(false)` is never
/// returned — an invalid signature produces `Err(CryptoError::VerificationFailed)`.
pub fn verify_packet_signature(packet: &MeshPacketV1) -> Result<(), CryptoError> {
    // Parse origin_id as Ed25519 public key
    let key_bytes: &[u8; PUBLIC_KEY_SIZE] = packet
        .origin_id
        .as_slice()
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyLength(packet.origin_id.len()))?;

    let verifying_key = VerifyingKey::from_bytes(key_bytes)
        .map_err(|e| CryptoError::InvalidPublicKey(e.to_string()))?;

    // Parse auth_tag as Ed25519 signature
    let sig_bytes: &[u8; SIGNATURE_SIZE] = packet
        .auth_tag
        .as_slice()
        .try_into()
        .map_err(|_| CryptoError::InvalidSignatureLength(packet.auth_tag.len()))?;

    let signature = Signature::from_bytes(sig_bytes);

    // Compute signable bytes and verify
    let message = packet
        .signable_bytes()
        .map_err(|e| CryptoError::SignableBytesFailed(e.to_string()))?;

    verifying_key
        .verify(&message, &signature)
        .map_err(|_| CryptoError::VerificationFailed)
}

/// Verify a raw Ed25519 signature over arbitrary message bytes.
///
/// Useful when the caller has already extracted the signable bytes.
pub fn verify_raw_signature(
    public_key: &[u8],
    message: &[u8],
    signature_bytes: &[u8],
) -> Result<(), CryptoError> {
    let key_bytes: &[u8; PUBLIC_KEY_SIZE] = public_key
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyLength(public_key.len()))?;

    let verifying_key = VerifyingKey::from_bytes(key_bytes)
        .map_err(|e| CryptoError::InvalidPublicKey(e.to_string()))?;

    let sig_bytes: &[u8; SIGNATURE_SIZE] = signature_bytes
        .try_into()
        .map_err(|_| CryptoError::InvalidSignatureLength(signature_bytes.len()))?;

    let signature = Signature::from_bytes(sig_bytes);

    verifying_key
        .verify(message, &signature)
        .map_err(|_| CryptoError::VerificationFailed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;
    use ed25519_dalek::{Signer, SigningKey};

    /// Helper: create a packet signed with a fresh ephemeral key.
    fn signed_packet() -> (MeshPacketV1, SigningKey) {
        let mut rng = rand::thread_rng();
        let signing_key = SigningKey::generate(&mut rng);
        let verifying_key = signing_key.verifying_key();

        let mut pkt = MeshPacketV1 {
            version: 1,
            packet_id: vec![42u8; 16],
            origin_id: verifying_key.to_bytes().to_vec(),
            destination_scope: DestinationScope::AreaGateway,
            message_type: MessageType::Sos,
            created_at: 1700000000,
            expires_at: 1700003600,
            ttl: 5,
            hop_count: 0,
            priority: Priority::Critical,
            payload_kind: PayloadKind::Emergency,
            payload: b"help".to_vec(),
            auth_tag: Vec::new(),
        };

        let signable = pkt.signable_bytes().expect("signable");
        let sig = signing_key.sign(&signable);
        pkt.auth_tag = sig.to_bytes().to_vec();

        (pkt, signing_key)
    }

    #[test]
    fn valid_signature_passes() {
        let (pkt, _) = signed_packet();
        assert!(verify_packet_signature(&pkt).is_ok());
    }

    #[test]
    fn tampered_payload_fails() {
        let (mut pkt, _) = signed_packet();
        pkt.payload = b"tampered".to_vec();
        assert!(verify_packet_signature(&pkt).is_err());
    }

    #[test]
    fn wrong_origin_id_fails() {
        let (mut pkt, _) = signed_packet();
        pkt.origin_id = vec![0xffu8; 32]; // different key
        // This should fail — either invalid key or verification failure
        assert!(verify_packet_signature(&pkt).is_err());
    }

    #[test]
    fn short_signature_fails() {
        let (mut pkt, _) = signed_packet();
        pkt.auth_tag = vec![0u8; 32]; // too short
        match verify_packet_signature(&pkt) {
            Err(CryptoError::InvalidSignatureLength(32)) => {}
            other => panic!("expected InvalidSignatureLength(32), got {other:?}"),
        }
    }
}
