# Open Architecture Questions

Agents MUST add unresolved architectural questions here instead of guessing.

## Q-001 — Serialization
Which wire encoding gives the right balance of compactness, Android/Rust interoperability, validation simplicity and long-term versioning?

## Q-002 — Fragmentation
What is the maximum usable BLE application payload for the chosen transport, and what fragmentation/reassembly protocol is required?

## Q-003 — Identity model
How should device identity, user/account identity and incident origin identity relate while preserving privacy?

## Q-004 — Encryption envelope
Should emergency payloads use per-message keys, session keys, recipient-specific encryption, or a hybrid scheme?

## Q-005 — Gateway discovery
How does a disconnected mesh know that a nearby node has a viable internet gateway path without leaking unnecessary information?

## Q-006 — ACK semantics
Which acknowledgements are local-hop, end-to-end, gateway receipt, backend accepted, operator verified and responder dispatched?

## Q-007 — Background BLE
What device/Android-version matrix is supported and what degraded behavior is acceptable?

## Q-008 — Positioning
What uncertainty model is used for GPS, PDR and BLE multilateration estimates?

## Q-009 — Routing
Should V1 use controlled epidemic flooding with heuristics, destination-scoped forwarding, or a more explicit routing table protocol?

## Q-010 — Abuse policy
How are emergency priority, false-report resistance, and battery fairness balanced?
