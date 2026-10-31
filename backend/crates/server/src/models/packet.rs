//! Packet database model.

use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// A mesh packet record as stored in the database.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct PacketRecord {
    pub id: Uuid,
    pub packet_id: Vec<u8>,
    pub protocol_version: i16,
    pub origin_id: Vec<u8>,
    pub destination_scope: i16,
    pub message_type: String,
    pub priority: String,
    pub ttl: i16,
    pub hop_count: i16,
    pub payload_kind: i16,
    pub payload_encrypted: Vec<u8>,
    pub signature: Vec<u8>,
    pub signature_valid: bool,
    pub packet_created_at: DateTime<Utc>,
    pub packet_expires_at: DateTime<Utc>,
    pub ingested_at: DateTime<Utc>,
    pub gateway_id: Option<String>,
    // raw_cbor intentionally excluded from default queries (large binary)
    pub incident_id: Option<Uuid>,
}

/// Result of an ingestion attempt for a single packet.
#[derive(Debug, Serialize)]
pub struct IngestResult {
    /// Hex-encoded packet_id from the mesh layer.
    pub packet_id: String,
    /// Whether this was a new packet or a duplicate.
    pub status: IngestStatus,
    /// If a new incident was created, its ID.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub incident_id: Option<Uuid>,
    /// If validation or verification failed, the reason.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Outcome of ingesting a single packet.
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IngestStatus {
    /// New packet accepted and persisted.
    Accepted,
    /// Packet was already seen (idempotent — 200 OK).
    Duplicate,
    /// Packet failed validation or signature verification.
    Rejected,
}
