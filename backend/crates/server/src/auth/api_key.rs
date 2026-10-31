//! Gateway API key authentication.
//!
//! API keys are hashed with HMAC-SHA256 before storage; the plaintext
//! key is shown once at creation and never stored by the server.

use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// Compute the HMAC-SHA256 hash of an API key.
///
/// The `hmac_secret` is a server-side secret that salts the hash,
/// preventing rainbow-table attacks even if the database is compromised.
pub fn hash_api_key(key: &str, hmac_secret: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(hmac_secret.as_bytes())
        .expect("HMAC accepts any key length");
    mac.update(key.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Verify an API key against its stored hash.
///
/// Uses constant-time comparison via HMAC verification.
pub fn verify_api_key(key: &str, expected_hash: &str, hmac_secret: &str) -> bool {
    let computed = hash_api_key(key, hmac_secret);
    // constant-time comparison for the hex strings
    constant_time_eq(computed.as_bytes(), expected_hash.as_bytes())
}

/// Generate a new random API key (hex-encoded, 32 bytes of entropy).
pub fn generate_api_key() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 32] = rng.gen();
    hex::encode(bytes)
}

/// Constant-time byte comparison to prevent timing attacks.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify() {
        let secret = "test_hmac_secret";
        let key = generate_api_key();
        let hash = hash_api_key(&key, secret);
        assert!(verify_api_key(&key, &hash, secret));
    }

    #[test]
    fn wrong_key_fails() {
        let secret = "test_hmac_secret";
        let key = generate_api_key();
        let hash = hash_api_key(&key, secret);
        assert!(!verify_api_key("wrong_key", &hash, secret));
    }

    #[test]
    fn different_secrets_produce_different_hashes() {
        let key = "same_key";
        let hash1 = hash_api_key(key, "secret_a");
        let hash2 = hash_api_key(key, "secret_b");
        assert_ne!(hash1, hash2);
    }
}
