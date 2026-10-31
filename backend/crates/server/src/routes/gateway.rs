//! Gateway mesh packet ingestion endpoint.

use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::middleware::auth::GatewayAuth;
use crate::models::packet::IngestResult;
use crate::services::{audit, ingestion};
use crate::AppState;

/// Request body for gateway packet ingestion.
#[derive(Debug, Deserialize)]
pub struct IngestRequest {
    /// Base64-encoded CBOR packets.
    pub packets: Vec<String>,
}

/// Response body for ingestion results.
#[derive(Debug, Serialize)]
pub struct IngestResponse {
    /// Per-packet results.
    pub results: Vec<IngestResult>,
    /// Total accepted.
    pub accepted: usize,
    /// Total duplicates (idempotent).
    pub duplicates: usize,
    /// Total rejected.
    pub rejected: usize,
}

/// POST /api/v1/gateway/ingest — idempotent mesh packet ingestion.
///
/// Authenticated via X-API-Key header (gateway API key).
/// Rate-limited per gateway identity.
pub async fn ingest(
    State(state): State<AppState>,
    gateway_auth: GatewayAuth,
    Json(body): Json<IngestRequest>,
) -> Result<Json<IngestResponse>, AppError> {
    // Rate limit check
    if !state.rate_limiter.check_rate_limit(&format!("gw:{}", gateway_auth.gateway_id)) {
        return Err(AppError::RateLimited);
    }

    // Batch size check
    if body.packets.len() > state.config.max_ingest_batch_size {
        return Err(AppError::BadRequest(format!(
            "batch size {} exceeds maximum {}",
            body.packets.len(),
            state.config.max_ingest_batch_size
        )));
    }

    if body.packets.is_empty() {
        return Err(AppError::BadRequest("no packets provided".to_string()));
    }

    // Process the batch
    let results = ingestion::ingest_packets(
        &state.db,
        &gateway_auth.gateway_id,
        &body.packets,
        state.config.max_packet_size,
    )
    .await?;

    let accepted = results.iter().filter(|r| r.status == crate::models::packet::IngestStatus::Accepted).count();
    let duplicates = results.iter().filter(|r| r.status == crate::models::packet::IngestStatus::Duplicate).count();
    let rejected = results.iter().filter(|r| r.status == crate::models::packet::IngestStatus::Rejected).count();

    // Audit log (fire-and-forget)
    audit::log(
        &state.db,
        None,
        "gateway",
        "packet_ingest",
        "packets",
        Some(&gateway_auth.gateway_id),
        Some(serde_json::json!({
            "batch_size": body.packets.len(),
            "accepted": accepted,
            "duplicates": duplicates,
            "rejected": rejected,
        })),
        None,
    )
    .await;

    Ok(Json(IngestResponse {
        results,
        accepted,
        duplicates,
        rejected,
    }))
}
