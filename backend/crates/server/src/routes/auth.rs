//! Authentication endpoints (login, refresh, audit log).

use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;

use crate::auth::jwt::{create_token_pair, validate_refresh_token, TokenPair};
use crate::auth::roles::{require_role, Role};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::audit::AuditRecord;
use crate::models::user::{LoginRequest, RefreshRequest, UserRecord};
use crate::services::audit;
use crate::AppState;

/// POST /api/v1/auth/login — authenticate and receive tokens.
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<TokenPair>, AppError> {
    // Rate limit login attempts by username
    if !state.rate_limiter.check_rate_limit(&format!("login:{}", body.username)) {
        return Err(AppError::RateLimited);
    }

    // Look up user
    let user: UserRecord = sqlx::query_as(
        "SELECT id, username, password_hash, role::text, display_name, \
         is_active, created_at, updated_at \
         FROM users WHERE username = $1"
    )
    .bind(&body.username)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("invalid credentials".to_string()))?;

    if !user.is_active {
        return Err(AppError::Unauthorized("account is deactivated".to_string()));
    }

    // Verify password
    let password_valid = verify_password(&body.password, &user.password_hash)?;
    if !password_valid {
        return Err(AppError::Unauthorized("invalid credentials".to_string()));
    }

    // Generate tokens
    let tokens = create_token_pair(
        &user.id,
        &user.role,
        &state.config.jwt_secret,
        state.config.jwt_access_expiry_secs,
        state.config.jwt_refresh_expiry_secs,
    )?;

    // Audit log
    audit::log(
        &state.db,
        Some(user.id),
        "user",
        "login",
        "auth",
        Some(&user.id.to_string()),
        None,
        None,
    )
    .await;

    Ok(Json(tokens))
}

/// POST /api/v1/auth/refresh — refresh an access token.
pub async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<TokenPair>, AppError> {
    let claims = validate_refresh_token(&body.refresh_token, &state.config.jwt_secret)?;

    let user_id: uuid::Uuid = claims
        .sub
        .parse()
        .map_err(|_| AppError::Unauthorized("invalid token subject".to_string()))?;

    // Verify user still exists and is active
    let user: UserRecord = sqlx::query_as(
        "SELECT id, username, password_hash, role::text, display_name, \
         is_active, created_at, updated_at \
         FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("user not found".to_string()))?;

    if !user.is_active {
        return Err(AppError::Unauthorized("account is deactivated".to_string()));
    }

    let tokens = create_token_pair(
        &user.id,
        &user.role,
        &state.config.jwt_secret,
        state.config.jwt_access_expiry_secs,
        state.config.jwt_refresh_expiry_secs,
    )?;

    Ok(Json(tokens))
}

/// Query parameters for audit log.
#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

/// GET /api/v1/audit — query the audit log (admin only).
pub async fn audit_log(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<AuditQuery>,
) -> Result<Json<Vec<AuditRecord>>, AppError> {
    require_role(auth.role, Role::Admin)?;

    let records = audit::query_audit_log(
        &state.db,
        query.resource_type.as_deref(),
        query.resource_id.as_deref(),
        query.limit,
        query.offset,
    )
    .await?;

    Ok(Json(records))
}

/// Verify a password against an argon2 hash.
fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    use argon2::{Argon2, PasswordHash, PasswordVerifier};

    let parsed = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("invalid password hash format: {e}")))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}
