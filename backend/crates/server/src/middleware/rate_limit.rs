//! In-memory sliding-window rate limiter.
//!
//! Uses `DashMap` for lock-free concurrent access. This is suitable for
//! single-instance deployments. For multi-instance, replace with a
//! Redis-backed counter.

use std::time::{Duration, Instant};

use dashmap::DashMap;

/// Sliding-window rate limiter keyed by an identity string (IP, gateway ID, etc.).
#[derive(Debug)]
pub struct RateLimiter {
    /// Map of identity → list of request timestamps within the window.
    windows: DashMap<String, Vec<Instant>>,
    /// Maximum requests allowed per window.
    max_requests: usize,
    /// Window duration.
    window: Duration,
}

impl RateLimiter {
    /// Create a new rate limiter.
    pub fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            windows: DashMap::new(),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Check if a request from `identity` is allowed.
    ///
    /// Returns `true` if the request is within limits, `false` if it
    /// should be rejected (HTTP 429).
    pub fn check_rate_limit(&self, identity: &str) -> bool {
        let now = Instant::now();
        let cutoff = now - self.window;

        let mut entry = self.windows.entry(identity.to_string()).or_default();

        // Evict expired timestamps
        entry.retain(|t| *t > cutoff);

        if entry.len() >= self.max_requests {
            false
        } else {
            entry.push(now);
            true
        }
    }

    /// Periodically clean up stale entries to bound memory usage.
    ///
    /// Call this from a background task (e.g., every 5 minutes).
    pub fn cleanup_stale_entries(&self) {
        let now = Instant::now();
        let cutoff = now - self.window;

        self.windows.retain(|_, timestamps| {
            timestamps.retain(|t| *t > cutoff);
            !timestamps.is_empty()
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_within_limit() {
        let limiter = RateLimiter::new(5, 60);
        for _ in 0..5 {
            assert!(limiter.check_rate_limit("test_ip"));
        }
    }

    #[test]
    fn rejects_over_limit() {
        let limiter = RateLimiter::new(3, 60);
        assert!(limiter.check_rate_limit("test_ip"));
        assert!(limiter.check_rate_limit("test_ip"));
        assert!(limiter.check_rate_limit("test_ip"));
        assert!(!limiter.check_rate_limit("test_ip")); // 4th request rejected
    }

    #[test]
    fn different_identities_independent() {
        let limiter = RateLimiter::new(1, 60);
        assert!(limiter.check_rate_limit("ip_a"));
        assert!(!limiter.check_rate_limit("ip_a")); // over limit
        assert!(limiter.check_rate_limit("ip_b")); // independent
    }
}
