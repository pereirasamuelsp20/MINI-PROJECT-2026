//! Authentication extractors for Axum handlers.
//!
//! These extractors pull credentials from HTTP headers and validate
//! them, providing typed auth context to route handlers.

use async_trait::async_trait;
use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use uuid::Uuid;

use crate::auth::jwt::validate_access_token;
use crate::auth::roles::Role;
use crate::error::AppError;
use crate::AppState;

/// Authenticated user context extracted from a JWT Bearer token.
///
/// Use this as a handler parameter to require JWT authentication:
/// ```ignore
/// async fn handler(auth: AuthUser) -> impl IntoResponse { ... }
/// ```
#[derive(Debug, Clone)]
pub struct AuthUser {
    /// User ID from the JWT `sub` claim.
    pub user_id: Uuid,
    /// User role.
    pub role: Role,
    /// Unique token ID for audit correlation.
    pub token_id: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        // Extract Bearer token from Authorization header
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("missing Authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("expected Bearer token".to_string()))?;

        // Validate the JWT
        let claims = validate_access_token(token, &state.config.jwt_secret)?;

        // Parse user ID
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::Unauthorized("invalid user ID in token".to_string()))?;

        // Parse role
        let role = Role::from_db_str(&claims.role)?;

        Ok(AuthUser {
            user_id,
            role,
            token_id: claims.jti,
        })
    }
}

/// Gateway authentication context extracted from X-API-Key header.
///
/// Use this as a handler parameter to require gateway API key auth:
/// ```ignore
/// async fn handler(auth: GatewayAuth) -> impl IntoResponse { ... }
/// ```
#[derive(Debug, Clone)]
pub struct GatewayAuth {
    /// Gateway identifier from the verified API key record.
    pub gateway_id: String,
}

#[async_trait]
impl FromRequestParts<AppState> for GatewayAuth {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let api_key = parts
            .headers
            .get("x-api-key")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("missing X-API-Key header".to_string()))?;

        // Hash the provided key and look it up in the database
        let key_hash = crate::auth::api_key::hash_api_key(api_key, &state.config.api_key_hmac_secret);

        let record = sqlx::query_as::<_, ApiKeyRecord>(
            "SELECT gateway_id, is_active, expires_at FROM api_keys WHERE key_hash = $1"
        )
        .bind(&key_hash)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::Internal(format!("API key lookup failed: {e}")))?
        .ok_or_else(|| AppError::Unauthorized("invalid API key".to_string()))?;

        // Check if key is active
        if !record.is_active {
            return Err(AppError::Unauthorized("API key is deactivated".to_string()));
        }

        // Check expiry
        if let Some(expires_at) = record.expires_at {
            if expires_at < chrono::Utc::now() {
                return Err(AppError::Unauthorized("API key has expired".to_string()));
            }
        }

        // Update last_used_at (fire-and-forget, don't block the request)
        let db = state.db.clone();
        let hash = key_hash.clone();
        tokio::spawn(async move {
            let _ = sqlx::query("UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1")
                .bind(&hash)
                .execute(&db)
                .await;
        });

        Ok(GatewayAuth {
            gateway_id: record.gateway_id,
        })
    }
}

/// Minimal row type for API key lookups.
#[derive(sqlx::FromRow)]
struct ApiKeyRecord {
    gateway_id: String,
    is_active: bool,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
}
