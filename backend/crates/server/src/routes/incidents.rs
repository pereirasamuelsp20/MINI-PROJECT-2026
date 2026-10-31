//! Incident CRUD and lifecycle endpoints.

use axum::extract::{Path, Query, State};
use axum::Json;
use uuid::Uuid;

use crate::auth::roles::{require_role, Role};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::incident::{IncidentDetail, IncidentFilter, IncidentRecord, VerifyRequest};
use crate::services::{audit, incident};
use crate::AppState;

/// GET /api/v1/incidents — list incidents with optional filters.
pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(filter): Query<IncidentFilter>,
) -> Result<Json<Vec<IncidentRecord>>, AppError> {
    require_role(auth.role, Role::Operator)?;

    let incidents = incident::list_incidents(&state.db, &filter).await?;
    Ok(Json(incidents))
}

/// GET /api/v1/incidents/:id — get incident detail with locations.
pub async fn get_detail(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<IncidentDetail>, AppError> {
    require_role(auth.role, Role::Operator)?;

    let detail = incident::get_incident_detail(&state.db, id).await?;
    Ok(Json(detail))
}

/// PATCH /api/v1/incidents/:id/verify — operator verifies an incident.
pub async fn verify(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<VerifyRequest>,
) -> Result<Json<IncidentRecord>, AppError> {
    require_role(auth.role, Role::Operator)?;

    let record = incident::verify_incident(
        &state.db,
        id,
        auth.user_id,
        body.title,
        body.description,
    )
    .await?;

    audit::log(
        &state.db,
        Some(auth.user_id),
        "user",
        "incident_verify",
        "incident",
        Some(&id.to_string()),
        None,
        None,
    )
    .await;

    Ok(Json(record))
}

/// PATCH /api/v1/incidents/:id/reject — operator rejects an incident.
pub async fn reject(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<IncidentRecord>, AppError> {
    require_role(auth.role, Role::Operator)?;

    let record = incident::reject_incident(&state.db, id, auth.user_id).await?;

    audit::log(
        &state.db,
        Some(auth.user_id),
        "user",
        "incident_reject",
        "incident",
        Some(&id.to_string()),
        None,
        None,
    )
    .await;

    Ok(Json(record))
}

/// PATCH /api/v1/incidents/:id/resolve — mark an incident as resolved.
pub async fn resolve(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<IncidentRecord>, AppError> {
    require_role(auth.role, Role::Operator)?;

    let record = incident::resolve_incident(&state.db, id).await?;

    audit::log(
        &state.db,
        Some(auth.user_id),
        "user",
        "incident_resolve",
        "incident",
        Some(&id.to_string()),
        None,
        None,
    )
    .await;

    Ok(Json(record))
}
