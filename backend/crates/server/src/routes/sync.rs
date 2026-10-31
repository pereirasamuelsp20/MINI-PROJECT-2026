//! Offline sync endpoints.
//!
//! These support clients (gateways or apps) that may have been
//! disconnected and need to reconcile state.

use axum::extract::State;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::incident::IncidentRecord;
use crate::AppState;

/// Sync pull request — "give me everything since this timestamp".
#[derive(Debug, Deserialize)]
pub struct SyncPullRequest {
    /// ISO 8601 timestamp of last successful sync.
    pub since: DateTime<Utc>,
    /// Maximum number of records to return.
    #[serde(default = "default_sync_limit")]
    pub limit: i64,
}

fn default_sync_limit() -> i64 {
    100
}

/// Sync pull response — incidents updated since the requested timestamp.
#[derive(Debug, Serialize)]
pub struct SyncPullResponse {
    /// Incidents created or updated since `since`.
    pub incidents: Vec<IncidentRecord>,
    /// Server timestamp for the next sync cursor.
    pub server_time: DateTime<Utc>,
    /// Whether there are more records to fetch.
    pub has_more: bool,
}

/// POST /api/v1/sync/pull — pull updates since a timestamp.
pub async fn pull(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<SyncPullRequest>,
) -> Result<Json<SyncPullResponse>, AppError> {
    let limit = body.limit.min(200).max(1);

    let incidents = sqlx::query_as::<_, IncidentRecord>(
        "SELECT id, origin_id, message_type::text, priority::text, status, \
         title, description, verified_by, verified_at, resolved_at, \
         source_packet_id, created_at, updated_at \
         FROM incidents WHERE updated_at > $1 \
         ORDER BY updated_at ASC LIMIT $2"
    )
    .bind(body.since)
    .bind(limit + 1) // fetch one extra to detect has_more
    .fetch_all(&state.db)
    .await?;

    let has_more = incidents.len() as i64 > limit;
    let incidents: Vec<_> = incidents.into_iter().take(limit as usize).collect();

    Ok(Json(SyncPullResponse {
        incidents,
        server_time: Utc::now(),
        has_more,
    }))
}

/// Sync push request — placeholder for client-to-server push.
#[derive(Debug, Deserialize)]
pub struct SyncPushRequest {
    /// Base64-encoded CBOR packets to ingest (same as gateway ingest).
    pub packets: Option<Vec<String>>,
}

/// POST /api/v1/sync/push — push buffered data from client.
///
/// This is a simplified sync push that delegates to the ingestion
/// pipeline. Full bidirectional sync semantics are a future milestone.
pub async fn push(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<SyncPushRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if let Some(packets) = body.packets {
        if !packets.is_empty() {
            let results = crate::services::ingestion::ingest_packets(
                &state.db,
                &format!("user:{}", auth.user_id),
                &packets,
                state.config.max_packet_size,
            )
            .await?;

            return Ok(Json(serde_json::json!({
                "processed": results.len(),
                "server_time": Utc::now(),
            })));
        }
    }

    Ok(Json(serde_json::json!({
        "processed": 0,
        "server_time": Utc::now(),
    })))
}
