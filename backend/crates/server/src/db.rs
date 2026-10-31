//! Database connection pool setup.

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

/// Create and return a PostgreSQL connection pool.
///
/// Runs pending migrations automatically on startup.
pub async fn init_pool(database_url: &str) -> PgPool {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(std::time::Duration::from_secs(300))
        .connect(database_url)
        .await
        .expect("failed to connect to database — check DATABASE_URL");

    info!("database connection pool established");

    // Run migrations (path relative to this crate's Cargo.toml)
    let migrator = sqlx::migrate!("../../migrations");
    migrator
        .run(&pool)
        .await
        .expect("failed to run database migrations");

    info!("database migrations applied");

    pool
}
