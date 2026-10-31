//! JWT token creation and validation (HS256).
//!
//! Uses `jsonwebtoken` — an established library. HS256 is used for the
//! development scaffold; production deployments should consider RS256
//! or EdDSA with key rotation.

use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

/// JWT claims payload.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject — user ID.
    pub sub: String,
    /// User role (admin, operator, responder).
    pub role: String,
    /// Token type: "access" or "refresh".
    pub token_type: String,
    /// Expiration time (Unix timestamp).
    pub exp: usize,
    /// Issued-at time (Unix timestamp).
    pub iat: usize,
    /// Unique token identifier (for revocation / audit).
    pub jti: String,
}

/// Token pair returned on successful authentication.
#[derive(Debug, Serialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    /// Access token lifetime in seconds.
    pub expires_in: u64,
    pub token_type: &'static str,
}

/// Create a new access + refresh token pair.
pub fn create_token_pair(
    user_id: &Uuid,
    role: &str,
    secret: &str,
    access_expiry_secs: u64,
    refresh_expiry_secs: u64,
) -> Result<TokenPair, AppError> {
    let now = Utc::now().timestamp() as usize;

    let access_claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        token_type: "access".to_string(),
        exp: now + access_expiry_secs as usize,
        iat: now,
        jti: Uuid::new_v4().to_string(),
    };

    let refresh_claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        token_type: "refresh".to_string(),
        exp: now + refresh_expiry_secs as usize,
        iat: now,
        jti: Uuid::new_v4().to_string(),
    };

    let key = EncodingKey::from_secret(secret.as_bytes());

    let access_token = encode(&Header::default(), &access_claims, &key)
        .map_err(|e| AppError::Internal(format!("JWT encoding failed: {e}")))?;

    let refresh_token = encode(&Header::default(), &refresh_claims, &key)
        .map_err(|e| AppError::Internal(format!("JWT encoding failed: {e}")))?;

    Ok(TokenPair {
        access_token,
        refresh_token,
        expires_in: access_expiry_secs,
        token_type: "Bearer",
    })
}

/// Validate a JWT token and extract claims.
///
/// Returns an error if the token is expired, malformed, or has an
/// invalid signature.
pub fn validate_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    let mut validation = Validation::default();
    validation.validate_exp = true;
    validation.required_spec_claims.insert("sub".to_string());

    let token_data = decode::<Claims>(token, &key, &validation)
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                AppError::Unauthorized("token expired".to_string())
            }
            _ => AppError::Unauthorized("invalid token".to_string()),
        })?;

    Ok(token_data.claims)
}

/// Validate specifically an access token (rejects refresh tokens).
pub fn validate_access_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let claims = validate_token(token, secret)?;
    if claims.token_type != "access" {
        return Err(AppError::Unauthorized("expected access token".to_string()));
    }
    Ok(claims)
}

/// Validate specifically a refresh token (rejects access tokens).
pub fn validate_refresh_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let claims = validate_token(token, secret)?;
    if claims.token_type != "refresh" {
        return Err(AppError::Unauthorized("expected refresh token".to_string()));
    }
    Ok(claims)
}
