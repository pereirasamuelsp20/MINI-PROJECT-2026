//! Health check endpoint.

use axum::http::StatusCode;
use axum::extract::State;
use axum::Json;
use serde::Serialize;

use crate::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
    pub protocol_version: u8,
}

/// GET /health — readiness probe.
pub async fn check(State(state): State<AppState>) -> Result<Json<HealthResponse>, StatusCode> {
    // Verify database connectivity
    sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;

    Ok(Json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
        protocol_version: disaster_mesh_protocol::PROTOCOL_VERSION,
    }))
}
