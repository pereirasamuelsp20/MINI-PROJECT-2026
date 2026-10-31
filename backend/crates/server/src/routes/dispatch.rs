//! Dispatch endpoints.

use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

use crate::auth::roles::{require_role, Role};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::dispatch::{CreateDispatchRequest, DispatchRecord, UpdateDispatchStatusRequest};
use crate::services::{audit, dispatch};
use crate::AppState;

/// POST /api/v1/incidents/:id/dispatch — assign a responder.
pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(incident_id): Path<Uuid>,
    Json(body): Json<CreateDispatchRequest>,
) -> Result<Json<DispatchRecord>, AppError> {
    require_role(auth.role, Role::Operator)?;

    let record = dispatch::create_dispatch(
        &state.db,
        incident_id,
        body.responder_id,
        auth.user_id,
        body.notes,
    )
    .await?;

    audit::log(
        &state.db,
        Some(auth.user_id),
        "user",
        "dispatch_create",
        "dispatch",
        Some(&record.id.to_string()),
        Some(serde_json::json!({
            "incident_id": incident_id,
            "responder_id": body.responder_id,
        })),
        None,
    )
    .await;

    Ok(Json(record))
}

/// PATCH /api/v1/dispatches/:id/status — update dispatch status.
pub async fn update_status(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(dispatch_id): Path<Uuid>,
    Json(body): Json<UpdateDispatchStatusRequest>,
) -> Result<Json<DispatchRecord>, AppError> {
    // Responders can update their own dispatches, operators can update any
    require_role(auth.role, Role::Responder)?;

    let record = dispatch::update_dispatch_status(
        &state.db,
        dispatch_id,
        body.status,
        body.notes,
    )
    .await?;

    audit::log(
        &state.db,
        Some(auth.user_id),
        "user",
        "dispatch_status_update",
        "dispatch",
        Some(&dispatch_id.to_string()),
        Some(serde_json::json!({
            "new_status": body.status,
        })),
        None,
    )
    .await;

    Ok(Json(record))
}
