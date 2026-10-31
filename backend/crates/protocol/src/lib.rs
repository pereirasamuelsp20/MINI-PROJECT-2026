//! Disaster Mesh Protocol — Wire format, CBOR serialization, and cryptographic types.
//!
//! This crate is the **source of truth** for the mesh packet envelope
//! defined in `protocol/PACKET_SPEC_V1.md`. It is consumed by both the
//! backend server and (eventually) the Android client.
//!
//! # Design decisions
//! - CBOR (RFC 8949) for compact binary serialization over BLE.
//! - Ed25519 for packet authenticity/integrity (no hand-rolled crypto).
//! - All enums serialize as integers for wire compactness.
//! - Binary fields use CBOR byte-string encoding via `serde_bytes`.

pub mod crypto;
pub mod packet;
pub mod types;
pub mod validation;

// ── Protocol constants ─────────────────────────────────────
/// Current protocol version.
pub const PROTOCOL_VERSION: u8 = 1;

/// Maximum allowed packet size in bytes (CBOR-encoded).
pub const MAX_PACKET_SIZE: usize = 512;

/// Maximum payload size in bytes (leaves room for header + signature).
pub const MAX_PAYLOAD_SIZE: usize = 256;

/// Maximum time-to-live (hop budget).
pub const MAX_TTL: u8 = 10;

/// Size of an Ed25519 public key in bytes.
pub const PUBLIC_KEY_SIZE: usize = 32;

/// Size of an Ed25519 signature in bytes.
pub const SIGNATURE_SIZE: usize = 64;

/// Size of a packet identifier in bytes.
pub const PACKET_ID_SIZE: usize = 16;

// ── Re-exports for convenience ─────────────────────────────
pub use crypto::{verify_packet_signature, CryptoError};
pub use packet::MeshPacketV1;
pub use types::{DestinationScope, MessageType, PayloadKind, Priority};
pub use validation::{validate_packet, ValidationError};
