//! Incident lifecycle service.

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::incident::{
    IncidentDetail, IncidentFilter, IncidentLocationRecord, IncidentRecord, IncidentStatus,
};

/// List incidents with optional filters.
pub async fn list_incidents(
    db: &PgPool,
    filter: &IncidentFilter,
) -> Result<Vec<IncidentRecord>, AppError> {
    // Build a dynamic query with optional filters
    let mut query = String::from(
        "SELECT id, origin_id, message_type::text, priority::text, status, \
         title, description, verified_by, verified_at, resolved_at, \
         source_packet_id, created_at, updated_at \
         FROM incidents WHERE 1=1"
    );
    let mut param_idx = 1u32;

    // We'll use a simple approach: build the SQL string with placeholders
    // and collect params. Since sqlx doesn't support dynamic queries easily
    // with compile-time checks, we use query_as with runtime SQL.
    struct Params {
        status: Option<String>,
        priority: Option<String>,
        message_type: Option<String>,
        limit: i64,
        offset: i64,
    }

    let params = Params {
        status: filter.status.clone(),
        priority: filter.priority.clone(),
        message_type: filter.message_type.clone(),
        limit: filter.limit.min(100), // cap at 100
        offset: filter.offset.max(0),
    };

    if params.status.is_some() {
        query.push_str(&format!(" AND status = ${param_idx}::incident_status"));
        param_idx += 1;
    }
    if params.priority.is_some() {
        query.push_str(&format!(" AND priority = ${param_idx}::priority_level"));
        param_idx += 1;
    }
    if params.message_type.is_some() {
        query.push_str(&format!(" AND message_type = ${param_idx}::message_type_enum"));
        param_idx += 1;
    }

    query.push_str(&format!(" ORDER BY created_at DESC LIMIT ${param_idx}"));
    param_idx += 1;
    query.push_str(&format!(" OFFSET ${param_idx}"));

    let mut q = sqlx::query_as::<_, IncidentRecord>(&query);

    if let Some(ref s) = params.status {
        q = q.bind(s);
    }
    if let Some(ref p) = params.priority {
        q = q.bind(p);
    }
    if let Some(ref m) = params.message_type {
        q = q.bind(m);
    }
    q = q.bind(params.limit);
    q = q.bind(params.offset);

    let incidents = q.fetch_all(db).await?;
    Ok(incidents)
}

/// Get a single incident with its location history.
pub async fn get_incident_detail(
    db: &PgPool,
    incident_id: Uuid,
) -> Result<IncidentDetail, AppError> {
    let incident = sqlx::query_as::<_, IncidentRecord>(
        "SELECT id, origin_id, message_type::text, priority::text, status, \
         title, description, verified_by, verified_at, resolved_at, \
         source_packet_id, created_at, updated_at \
         FROM incidents WHERE id = $1"
    )
    .bind(incident_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("incident {incident_id} not found")))?;

    let locations = sqlx::query_as::<_, IncidentLocationRecord>(
        "SELECT id, incident_id, latitude, longitude, accuracy_meters, \
         altitude_meters, source, captured_at, created_at \
         FROM incident_locations WHERE incident_id = $1 \
         ORDER BY captured_at DESC"
    )
    .bind(incident_id)
    .fetch_all(db)
    .await?;

    Ok(IncidentDetail { incident, locations })
}

/// Verify an incident (operator confirms it as real).
pub async fn verify_incident(
    db: &PgPool,
    incident_id: Uuid,
    verified_by: Uuid,
    title: Option<String>,
    description: Option<String>,
) -> Result<IncidentRecord, AppError> {
    // Check current status
    let current = get_current_status(db, incident_id).await?;
    if !current.can_transition_to(IncidentStatus::Verified) {
        return Err(AppError::Conflict(format!(
            "cannot verify incident in '{}' status",
            serde_json::to_string(&current).unwrap_or_default()
        )));
    }

    let record = sqlx::query_as::<_, IncidentRecord>(
        "UPDATE incidents SET \
         status = 'verified'::incident_status, \
         verified_by = $2, verified_at = $3, \
         title = COALESCE($4, title), \
         description = COALESCE($5, description) \
         WHERE id = $1 \
         RETURNING id, origin_id, message_type::text, priority::text, status, \
         title, description, verified_by, verified_at, resolved_at, \
         source_packet_id, created_at, updated_at"
    )
    .bind(incident_id)
    .bind(verified_by)
    .bind(Utc::now())
    .bind(title)
    .bind(description)
    .fetch_one(db)
    .await?;

    Ok(record)
}

/// Reject an incident.
pub async fn reject_incident(
    db: &PgPool,
    incident_id: Uuid,
    rejected_by: Uuid,
) -> Result<IncidentRecord, AppError> {
    let current = get_current_status(db, incident_id).await?;
    if !current.can_transition_to(IncidentStatus::Rejected) {
        return Err(AppError::Conflict(format!(
            "cannot reject incident in '{}' status",
            serde_json::to_string(&current).unwrap_or_default()
        )));
    }

    let record = sqlx::query_as::<_, IncidentRecord>(
        "UPDATE incidents SET \
         status = 'rejected'::incident_status, \
         verified_by = $2, verified_at = $3 \
         WHERE id = $1 \
         RETURNING id, origin_id, message_type::text, priority::text, status, \
         title, description, verified_by, verified_at, resolved_at, \
         source_packet_id, created_at, updated_at"
    )
    .bind(incident_id)
    .bind(rejected_by)
    .bind(Utc::now())
    .fetch_one(db)
    .await?;

    Ok(record)
}

/// Resolve an incident.
pub async fn resolve_incident(
    db: &PgPool,
    incident_id: Uuid,
) -> Result<IncidentRecord, AppError> {
    let current = get_current_status(db, incident_id).await?;
    if !current.can_transition_to(IncidentStatus::Resolved) {
        return Err(AppError::Conflict(format!(
            "cannot resolve incident in '{}' status",
            serde_json::to_string(&current).unwrap_or_default()
        )));
    }

    let record = sqlx::query_as::<_, IncidentRecord>(
        "UPDATE incidents SET \
         status = 'resolved'::incident_status, \
         resolved_at = $2 \
         WHERE id = $1 \
         RETURNING id, origin_id, message_type::text, priority::text, status, \
         title, description, verified_by, verified_at, resolved_at, \
         source_packet_id, created_at, updated_at"
    )
    .bind(incident_id)
    .bind(Utc::now())
    .fetch_one(db)
    .await?;

    Ok(record)
}

/// Get the current status of an incident.
async fn get_current_status(db: &PgPool, incident_id: Uuid) -> Result<IncidentStatus, AppError> {
    let status: IncidentStatus = sqlx::query_scalar("SELECT status FROM incidents WHERE id = $1")
        .bind(incident_id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("incident {incident_id} not found")))?;
    Ok(status)
}
