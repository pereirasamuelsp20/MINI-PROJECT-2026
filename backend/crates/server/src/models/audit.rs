//! Audit log model.
//!
//! The audit log is append-only. Metadata must NEVER contain payloads,
//! tokens, private keys, or precise locations per security rules.

use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// An audit log entry.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct AuditRecord {
    pub id: i64,
    pub occurred_at: DateTime<Utc>,
    pub actor_id: Option<Uuid>,
    pub actor_type: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
    // ip_address intentionally excluded from API responses
}
