//! Request ID middleware.
//!
//! Assigns a unique UUID to every incoming request for tracing and
//! audit log correlation.

use axum::http::{HeaderName, HeaderValue, Request};
use tower_http::request_id::{MakeRequestId, RequestId};
use uuid::Uuid;

/// Generates a UUID v4 for each request.
#[derive(Debug, Clone, Copy)]
pub struct MakeRequestUuid;

impl MakeRequestId for MakeRequestUuid {
    fn make_request_id<B>(&mut self, _request: &Request<B>) -> Option<RequestId> {
        let id = Uuid::new_v4().to_string();
        Some(RequestId::new(HeaderValue::from_str(&id).unwrap()))
    }
}

/// The header name used for request IDs.
pub fn request_id_header() -> HeaderName {
    HeaderName::from_static("x-request-id")
}
