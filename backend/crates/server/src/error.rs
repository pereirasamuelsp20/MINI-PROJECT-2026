//! Application error types.
//!
//! Per project rules: never expose raw internal/database errors to
//! clients. All errors are mapped to safe, opaque messages.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

/// Unified application error type.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("forbidden: {0}")]
    Forbidden(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("rate limited")]
    RateLimited,

    #[error("unprocessable entity: {0}")]
    UnprocessableEntity(String),

    #[error("internal error")]
    Internal(String),
}

/// JSON error response body.
#[derive(Serialize)]
struct ErrorBody {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message, code) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone(), None),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone(), None),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone(), None),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg.clone(), None),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone(), Some("DUPLICATE".to_string())),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "rate limit exceeded — try again later".to_string(),
                Some("RATE_LIMITED".to_string()),
            ),
            AppError::UnprocessableEntity(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone(), None),
            AppError::Internal(msg) => {
                // Log the real error server-side, return opaque message to client
                tracing::error!(internal_error = %msg, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "an internal error occurred".to_string(),
                    None,
                )
            }
        };

        (status, Json(ErrorBody { error: message, code })).into_response()
    }
}

/// Convert sqlx errors into AppError (never exposing DB details).
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => AppError::NotFound("resource not found".to_string()),
            sqlx::Error::Database(db_err) => {
                // Check for unique constraint violations → conflict
                if db_err.code().map_or(false, |c| c == "23505") {
                    AppError::Conflict("resource already exists".to_string())
                } else {
                    AppError::Internal(format!("database error: {err}"))
                }
            }
            _ => AppError::Internal(format!("database error: {err}")),
        }
    }
}
