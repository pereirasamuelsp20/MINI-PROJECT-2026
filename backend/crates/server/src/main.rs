//! Disaster Mesh Backend Server
//!
//! Entry point for the Axum-based API server. Sets up:
//! - Database connection pool with automatic migrations
//! - CORS, tracing, request-ID middleware
//! - Rate limiting
//! - Route handlers for gateway ingestion, incidents, dispatch, sync, auth
//! - Background task for rate limiter cleanup

mod auth;
mod config;
mod db;
mod error;
mod middleware;
mod models;
mod routes;
mod services;

use std::sync::Arc;

use axum::http::{header, Method};
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::request_id::{PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::config::AppConfig;
use crate::middleware::rate_limit::RateLimiter;
use crate::middleware::request_id::{request_id_header, MakeRequestUuid};

/// Shared application state available to all handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<AppConfig>,
    pub rate_limiter: Arc<RateLimiter>,
}

#[tokio::main]
async fn main() {
    // Load .env file if present (development only)
    let _ = dotenvy::dotenv();

    // Initialize structured logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "disaster_mesh_server=info,tower_http=info".into()),
        )
        .with_target(true)
        .with_thread_ids(false)
        .init();

    info!("starting Disaster Mesh backend server");

    // Load configuration
    let config = AppConfig::from_env();
    let listen_addr = config.listen_addr;

    info!(listen_addr = %listen_addr, "configuration loaded");

    // Initialize database pool + run migrations
    let db = db::init_pool(&config.database_url).await;

    // Create rate limiter
    let rate_limiter = Arc::new(RateLimiter::new(
        config.rate_limit_requests,
        config.rate_limit_window_secs,
    ));

    // Spawn background cleanup for rate limiter
    let rl_cleanup = Arc::clone(&rate_limiter);
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            rl_cleanup.cleanup_stale_entries();
        }
    });

    // Spawn background cleanup for dedup cache (remove entries older than 24h)
    let db_cleanup = db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            let result = sqlx::query(
                "DELETE FROM dedup_cache WHERE first_seen_at < NOW() - INTERVAL '24 hours'"
            )
            .execute(&db_cleanup)
            .await;
            match result {
                Ok(r) => {
                    if r.rows_affected() > 0 {
                        tracing::debug!(removed = r.rows_affected(), "dedup cache cleanup");
                    }
                }
                Err(e) => tracing::warn!(error = %e, "dedup cache cleanup failed"),
            }
        }
    });

    // Build application state
    let state = AppState {
        db,
        config: Arc::new(config),
        rate_limiter,
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any) // Restrict in production
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            HeaderName::from_static("x-api-key"),
            HeaderName::from_static("x-request-id"),
        ]);

    let req_id_header = request_id_header();

    // Build the application
    let app = routes::build_router()
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(PropagateRequestIdLayer::new(req_id_header.clone()))
        .layer(SetRequestIdLayer::new(req_id_header, MakeRequestUuid));

    // Start the server
    info!(addr = %listen_addr, "server listening");
    let listener = tokio::net::TcpListener::bind(listen_addr)
        .await
        .expect("failed to bind listener");

    axum::serve(listener, app)
        .await
        .expect("server error");
}

use axum::http::HeaderName;
