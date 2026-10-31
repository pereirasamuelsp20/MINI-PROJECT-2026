//! Audit logging service.
//!
//! All state-changing operations MUST be recorded here.
//! Metadata must NEVER contain payloads, tokens, private keys, or
//! precise locations per security rules.

use serde_json::Value as JsonValue;
use sqlx::PgPool;
use tracing::warn;
use uuid::Uuid;

/// Record an audit log entry.
///
/// This is fire-and-forget — audit logging failures must not block
/// emergency operations. Errors are logged but not propagated.
pub async fn log(
    db: &PgPool,
    actor_id: Option<Uuid>,
    actor_type: &str,
    action: &str,
    resource_type: &str,
    resource_id: Option<&str>,
    metadata: Option<JsonValue>,
    ip_address: Option<&str>,
) {
    let result = sqlx::query(
        "INSERT INTO audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata, ip_address) \
         VALUES ($1, $2, $3, $4, $5, $6, $7::inet)"
    )
    .bind(actor_id)
    .bind(actor_type)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .bind(metadata)
    .bind(ip_address)
    .execute(db)
    .await;

    if let Err(e) = result {
        // Log the error but do NOT propagate — emergency ingestion must
        // not be blocked by audit log failures.
        warn!(
            actor_type,
            action,
            resource_type,
            error = %e,
            "audit log write failed"
        );
    }
}

/// Query audit log entries with filters.
pub async fn query_audit_log(
    db: &PgPool,
    resource_type: Option<&str>,
    resource_id: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<crate::models::audit::AuditRecord>, crate::error::AppError> {
    let limit = limit.min(200);
    let offset = offset.max(0);

    let records = if let Some(rt) = resource_type {
        if let Some(ri) = resource_id {
            sqlx::query_as::<_, crate::models::audit::AuditRecord>(
                "SELECT id, occurred_at, actor_id, actor_type, action, \
                 resource_type, resource_id, metadata \
                 FROM audit_log \
                 WHERE resource_type = $1 AND resource_id = $2 \
                 ORDER BY occurred_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(rt)
            .bind(ri)
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
            .await?
        } else {
            sqlx::query_as::<_, crate::models::audit::AuditRecord>(
                "SELECT id, occurred_at, actor_id, actor_type, action, \
                 resource_type, resource_id, metadata \
                 FROM audit_log \
                 WHERE resource_type = $1 \
                 ORDER BY occurred_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(rt)
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
            .await?
        }
    } else {
        sqlx::query_as::<_, crate::models::audit::AuditRecord>(
            "SELECT id, occurred_at, actor_id, actor_type, action, \
             resource_type, resource_id, metadata \
             FROM audit_log \
             ORDER BY occurred_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(db)
        .await?
    };

    Ok(records)
}
