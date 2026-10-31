//! Protocol-level enum types.
//!
//! All enums serialize as their `repr(u8)` integer value for CBOR
//! compactness (via `serde_repr`). String-based serialization is the
//! responsibility of the HTTP/JSON layer in the server crate.

use serde_repr::{Deserialize_repr, Serialize_repr};

/// The type of mesh message.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum MessageType {
    Sos = 0,
    SosAck = 1,
    IssueReport = 2,
    StatusUpdate = 3,
    GatewayReceipt = 4,
    LocationUpdate = 5,
}

impl MessageType {
    /// Whether this message type can originate an incident.
    pub fn creates_incident(self) -> bool {
        matches!(self, Self::Sos | Self::IssueReport)
    }

    /// Database-friendly string representation.
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Sos => "sos",
            Self::SosAck => "sos_ack",
            Self::IssueReport => "issue_report",
            Self::StatusUpdate => "status_update",
            Self::GatewayReceipt => "gateway_receipt",
            Self::LocationUpdate => "location_update",
        }
    }
}

/// Packet priority level.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum Priority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
}

impl Priority {
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Normal => "normal",
            Self::Low => "low",
        }
    }
}

/// Destination scope for packet routing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum DestinationScope {
    /// Flood to all reachable nodes.
    LocalBroadcast = 0,
    /// Route toward any internet-connected gateway.
    AreaGateway = 1,
    /// Addressed to a specific responder service.
    SpecificResponder = 2,
    /// Route to all known gateways.
    AllGateways = 3,
}

/// Kind of payload carried by the packet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum PayloadKind {
    Emergency = 0,
    IssueReport = 1,
    StatusUpdate = 2,
    Acknowledgement = 3,
    LocationEstimate = 4,
}
