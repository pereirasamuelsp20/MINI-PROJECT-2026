//! Incident database model and lifecycle types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Incident status lifecycle.
///
/// ```text
/// pending → verified → dispatched → in_progress → resolved
///         ↘ rejected
///         ↘ expired
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "incident_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum IncidentStatus {
    Pending,
    Verified,
    Dispatched,
    InProgress,
    Resolved,
    Rejected,
    Expired,
}

impl IncidentStatus {
    /// Valid transitions from the current status.
    pub fn valid_transitions(self) -> &'static [IncidentStatus] {
        match self {
            Self::Pending => &[Self::Verified, Self::Rejected, Self::Expired],
            Self::Verified => &[Self::Dispatched, Self::Rejected],
            Self::Dispatched => &[Self::InProgress, Self::Resolved],
            Self::InProgress => &[Self::Resolved],
            Self::Resolved | Self::Rejected | Self::Expired => &[],
        }
    }

    /// Check if transitioning to `target` is allowed.
    pub fn can_transition_to(self, target: IncidentStatus) -> bool {
        self.valid_transitions().contains(&target)
    }
}

/// An incident record as stored in the database.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct IncidentRecord {
    pub id: Uuid,
    pub origin_id: Vec<u8>,
    pub message_type: String,
    pub priority: String,
    pub status: IncidentStatus,
    pub title: Option<String>,
    pub description: Option<String>,
    pub verified_by: Option<Uuid>,
    pub verified_at: Option<DateTime<Utc>>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub source_packet_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Location data attached to an incident.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct IncidentLocationRecord {
    pub id: Uuid,
    pub incident_id: Uuid,
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy_meters: f64,
    pub altitude_meters: Option<f64>,
    pub source: String,
    pub captured_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Incident detail with locations (API response).
#[derive(Debug, Serialize)]
pub struct IncidentDetail {
    #[serde(flatten)]
    pub incident: IncidentRecord,
    pub locations: Vec<IncidentLocationRecord>,
}

/// Query filters for listing incidents.
#[derive(Debug, Deserialize)]
pub struct IncidentFilter {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub message_type: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

/// Request body for verifying an incident.
#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    pub title: Option<String>,
    pub description: Option<String>,
}
