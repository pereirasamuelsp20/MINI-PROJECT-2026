//! Application configuration loaded from environment variables.
//!
//! All secrets are read from the environment at startup — never
//! hard-coded, never from `.env` in production.

use std::net::SocketAddr;

/// Top-level application configuration.
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Address the HTTP server binds to.
    pub listen_addr: SocketAddr,
    /// PostgreSQL connection string.
    pub database_url: String,
    /// JWT signing / verification secret (HS256).
    pub jwt_secret: String,
    /// Access token lifetime in seconds.
    pub jwt_access_expiry_secs: u64,
    /// Refresh token lifetime in seconds.
    pub jwt_refresh_expiry_secs: u64,
    /// HMAC secret for gateway API key verification.
    pub api_key_hmac_secret: String,
    /// Rate limit: max requests per window per identity.
    pub rate_limit_requests: usize,
    /// Rate limit: window duration in seconds.
    pub rate_limit_window_secs: u64,
    /// Maximum CBOR packet size accepted during ingestion.
    pub max_packet_size: usize,
    /// Maximum number of packets in a single ingest batch.
    pub max_ingest_batch_size: usize,
}

impl AppConfig {
    /// Load configuration from environment variables.
    ///
    /// Panics on missing or invalid required values — this is
    /// intentional so mis-configuration is caught at startup.
    pub fn from_env() -> Self {
        Self {
            listen_addr: env_parse("LISTEN_ADDR", "0.0.0.0:3001"),
            database_url: env_required("DATABASE_URL"),
            jwt_secret: env_required("JWT_SECRET"),
            jwt_access_expiry_secs: env_parse("JWT_ACCESS_TOKEN_EXPIRY_SECS", "3600"),
            jwt_refresh_expiry_secs: env_parse("JWT_REFRESH_TOKEN_EXPIRY_SECS", "604800"),
            api_key_hmac_secret: env_required("API_KEY_HMAC_SECRET"),
            rate_limit_requests: env_parse("RATE_LIMIT_REQUESTS_PER_WINDOW", "100"),
            rate_limit_window_secs: env_parse("RATE_LIMIT_WINDOW_SECS", "60"),
            max_packet_size: env_parse("MAX_PACKET_SIZE_BYTES", "512"),
            max_ingest_batch_size: env_parse("MAX_INGEST_BATCH_SIZE", "50"),
        }
    }
}

/// Read a required environment variable; panic if absent.
fn env_required(key: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("required env var {key} is not set"))
}

/// Read an environment variable with a default, parsing into the target type.
fn env_parse<T: std::str::FromStr>(key: &str, default: &str) -> T
where
    T::Err: std::fmt::Debug,
{
    std::env::var(key)
        .unwrap_or_else(|_| default.to_string())
        .parse()
        .unwrap_or_else(|e| panic!("env var {key} is not a valid {}: {e:?}", std::any::type_name::<T>()))
}
