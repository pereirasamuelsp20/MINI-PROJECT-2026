//! Dispatch workflow service.

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::dispatch::{DispatchRecord, DispatchStatus};
use crate::models::incident::IncidentStatus;

/// Create a new dispatch (assign a responder to an incident).
pub async fn create_dispatch(
    db: &PgPool,
    incident_id: Uuid,
    responder_id: Uuid,
    assigned_by: Uuid,
    notes: Option<String>,
) -> Result<DispatchRecord, AppError> {
    // Verify the incident exists and is in a dispatchable state
    let status: IncidentStatus =
        sqlx::query_scalar("SELECT status FROM incidents WHERE id = $1")
            .bind(incident_id)
            .fetch_optional(db)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("incident {incident_id} not found")))?;

    if !status.can_transition_to(IncidentStatus::Dispatched) {
        return Err(AppError::Conflict(format!(
            "incident cannot be dispatched from current status"
        )));
    }

    // Verify the responder exists and has the responder role
    let responder_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND is_active = true \
         AND (role = 'responder' OR role = 'admin'))"
    )
    .bind(responder_id)
    .fetch_one(db)
    .await?;

    if !responder_exists {
        return Err(AppError::BadRequest(
            "responder not found or not active".to_string(),
        ));
    }

    let mut tx = db.begin().await?;

    // Create the dispatch
    let dispatch = sqlx::query_as::<_, DispatchRecord>(
        "INSERT INTO dispatches (incident_id, responder_id, assigned_by, notes) \
         VALUES ($1, $2, $3, $4) \
         RETURNING id, incident_id, responder_id, status, notes, \
         assigned_by, assigned_at, accepted_at, completed_at, updated_at"
    )
    .bind(incident_id)
    .bind(responder_id)
    .bind(assigned_by)
    .bind(notes)
    .fetch_one(&mut *tx)
    .await?;

    // Update incident status
    sqlx::query("UPDATE incidents SET status = 'dispatched'::incident_status WHERE id = $1")
        .bind(incident_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(dispatch)
}

/// Update the status of an existing dispatch.
pub async fn update_dispatch_status(
    db: &PgPool,
    dispatch_id: Uuid,
    new_status: DispatchStatus,
    notes: Option<String>,
) -> Result<DispatchRecord, AppError> {
    let mut tx = db.begin().await?;

    // Get current dispatch
    let current: DispatchRecord = sqlx::query_as(
        "SELECT id, incident_id, responder_id, status, notes, \
         assigned_by, assigned_at, accepted_at, completed_at, updated_at \
         FROM dispatches WHERE id = $1 FOR UPDATE"
    )
    .bind(dispatch_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("dispatch {dispatch_id} not found")))?;

    // Build update query based on new status
    let accepted_at = if new_status == DispatchStatus::Accepted {
        Some(chrono::Utc::now())
    } else {
        current.accepted_at
    };

    let completed_at = if matches!(new_status, DispatchStatus::Completed | DispatchStatus::Cancelled) {
        Some(chrono::Utc::now())
    } else {
        current.completed_at
    };

    let dispatch = sqlx::query_as::<_, DispatchRecord>(
        "UPDATE dispatches SET \
         status = $2, notes = COALESCE($3, notes), \
         accepted_at = $4, completed_at = $5 \
         WHERE id = $1 \
         RETURNING id, incident_id, responder_id, status, notes, \
         assigned_by, assigned_at, accepted_at, completed_at, updated_at"
    )
    .bind(dispatch_id)
    .bind(new_status)
    .bind(notes)
    .bind(accepted_at)
    .bind(completed_at)
    .fetch_one(&mut *tx)
    .await?;

    // Update incident status based on dispatch status
    let incident_status = match new_status {
        DispatchStatus::EnRoute | DispatchStatus::OnScene => Some("in_progress"),
        DispatchStatus::Completed => Some("resolved"),
        _ => None,
    };

    if let Some(status_str) = incident_status {
        let query = format!(
            "UPDATE incidents SET status = '{status_str}'::incident_status WHERE id = $1"
        );
        sqlx::query(&query)
            .bind(current.incident_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    Ok(dispatch)
}

/// List dispatches for an incident.
pub async fn list_dispatches_for_incident(
    db: &PgPool,
    incident_id: Uuid,
) -> Result<Vec<DispatchRecord>, AppError> {
    let dispatches = sqlx::query_as::<_, DispatchRecord>(
        "SELECT id, incident_id, responder_id, status, notes, \
         assigned_by, assigned_at, accepted_at, completed_at, updated_at \
         FROM dispatches WHERE incident_id = $1 ORDER BY assigned_at DESC"
    )
    .bind(incident_id)
    .fetch_all(db)
    .await?;

    Ok(dispatches)
}
