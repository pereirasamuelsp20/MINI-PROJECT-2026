//! API route definitions and router construction.

pub mod auth;
pub mod dispatch;
pub mod gateway;
pub mod health;
pub mod incidents;
pub mod sync;

use axum::routing::{get, patch, post};
use axum::Router;

use crate::AppState;

/// Build the complete application router.
pub fn build_router() -> Router<AppState> {
    let api_v1 = Router::new()
        // Gateway ingestion (API key auth)
        .route("/gateway/ingest", post(gateway::ingest))
        // Authentication (no auth required)
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        // Incidents (JWT auth)
        .route("/incidents", get(incidents::list))
        .route("/incidents/:id", get(incidents::get_detail))
        .route("/incidents/:id/verify", patch(incidents::verify))
        .route("/incidents/:id/reject", patch(incidents::reject))
        .route("/incidents/:id/resolve", patch(incidents::resolve))
        // Dispatch (JWT auth)
        .route("/incidents/:id/dispatch", post(dispatch::create))
        .route("/dispatches/:id/status", patch(dispatch::update_status))
        // Sync (JWT or API key auth)
        .route("/sync/pull", post(sync::pull))
        .route("/sync/push", post(sync::push))
        // Audit log (admin JWT auth)
        .route("/audit", get(auth::audit_log));

    Router::new()
        .route("/health", get(health::check))
        .nest("/api/v1", api_v1)
}
