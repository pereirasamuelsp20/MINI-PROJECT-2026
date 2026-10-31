//! Dispatch database model.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Dispatch status lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "dispatch_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum DispatchStatus {
    Assigned,
    Accepted,
    EnRoute,
    OnScene,
    Completed,
    Cancelled,
}

/// A dispatch record as stored in the database.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct DispatchRecord {
    pub id: Uuid,
    pub incident_id: Uuid,
    pub responder_id: Uuid,
    pub status: DispatchStatus,
    pub notes: Option<String>,
    pub assigned_by: Uuid,
    pub assigned_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

/// Request body for creating a dispatch.
#[derive(Debug, Deserialize)]
pub struct CreateDispatchRequest {
    pub responder_id: Uuid,
    pub notes: Option<String>,
}

/// Request body for updating dispatch status.
#[derive(Debug, Deserialize)]
pub struct UpdateDispatchStatusRequest {
    pub status: DispatchStatus,
    pub notes: Option<String>,
}
