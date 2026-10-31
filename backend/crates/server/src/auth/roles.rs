//! Role-based access control (RBAC).
//!
//! Authorization is separate from authentication per project rules.
//! A valid JWT proves identity; this module decides what that identity
//! is allowed to do.

use serde::{Deserialize, Serialize};

use crate::error::AppError;

/// User roles, ordered by privilege level (admin > operator > responder).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Admin,
    Operator,
    Responder,
}

impl Role {
    /// Numeric privilege level (higher = more privileged).
    fn privilege_level(self) -> u8 {
        match self {
            Self::Responder => 1,
            Self::Operator => 2,
            Self::Admin => 3,
        }
    }

    /// Check if this role meets or exceeds the required minimum.
    pub fn has_at_least(self, minimum: Role) -> bool {
        self.privilege_level() >= minimum.privilege_level()
    }

    /// Parse from database string representation.
    pub fn from_db_str(s: &str) -> Result<Self, AppError> {
        match s {
            "admin" => Ok(Self::Admin),
            "operator" => Ok(Self::Operator),
            "responder" => Ok(Self::Responder),
            other => Err(AppError::Internal(format!("unknown role: {other}"))),
        }
    }

    /// Database string representation.
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Admin => "admin",
            Self::Operator => "operator",
            Self::Responder => "responder",
        }
    }
}

/// Require that the caller has at least the specified role.
///
/// Returns `Err(AppError::Forbidden)` if insufficient privileges.
pub fn require_role(actual: Role, minimum: Role) -> Result<(), AppError> {
    if actual.has_at_least(minimum) {
        Ok(())
    } else {
        Err(AppError::Forbidden(format!(
            "requires {} role or higher",
            minimum.as_db_str()
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn admin_has_all_roles() {
        assert!(Role::Admin.has_at_least(Role::Responder));
        assert!(Role::Admin.has_at_least(Role::Operator));
        assert!(Role::Admin.has_at_least(Role::Admin));
    }

    #[test]
    fn operator_has_operator_and_responder() {
        assert!(Role::Operator.has_at_least(Role::Responder));
        assert!(Role::Operator.has_at_least(Role::Operator));
        assert!(!Role::Operator.has_at_least(Role::Admin));
    }

    #[test]
    fn responder_only_has_responder() {
        assert!(Role::Responder.has_at_least(Role::Responder));
        assert!(!Role::Responder.has_at_least(Role::Operator));
    }

    #[test]
    fn require_role_rejects_insufficient() {
        assert!(require_role(Role::Responder, Role::Operator).is_err());
    }
}
