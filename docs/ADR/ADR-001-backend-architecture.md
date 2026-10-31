# ADR-001: Backend Architecture and Serialization Decisions

**Status:** Accepted  
**Date:** 2026-10-22  
**Author:** AI Agent (Backend)

## Context

The Disaster Mesh project requires a backend server to:
1. Ingest mesh packets uploaded by internet-connected gateways.
2. Manage incident lifecycle (SOS creation → operator verification → responder dispatch → resolution).
3. Provide authenticated APIs for the web command center.
4. Enforce idempotent ingestion and offline-sync semantics.

Open questions Q-001 (serialization) and Q-004 (encryption envelope) from `docs/OPEN_QUESTIONS.md` needed resolution to proceed.

## Decisions

### D1: CBOR (RFC 8949) for wire serialization
- **Rationale:** Compact binary encoding suitable for BLE's constrained payloads. First-class Rust (`ciborium`) and Kotlin support. Self-describing, schema-flexible, versioning-friendly.
- **Alternative rejected:** Protocol Buffers — stronger schema enforcement but heavier codegen tooling and less suited to ad-hoc evolution in early protocol iterations.

### D2: Ed25519 for packet signatures
- **Rationale:** Established, reviewed algorithm via `ed25519-dalek`. 64-byte signatures, 32-byte public keys. The `origin_id` field IS the signer's public key, enabling signature verification without a PKI lookup.
- **Not decided here:** Key lifecycle, revocation, and rotation are deferred (see SECURITY_SPEC_V1).

### D3: HS256 JWT for operator/responder auth
- **Rationale:** Simple, well-supported via `jsonwebtoken` crate. Suitable for single-instance deployments. Production should migrate to RS256 or EdDSA with key rotation.

### D4: HMAC-SHA256 for gateway API keys
- **Rationale:** Plaintext key shown once at creation, HMAC hash stored. Server-side HMAC secret prevents rainbow attacks on DB compromise. Constant-time comparison prevents timing attacks.

### D5: PostgreSQL + PostGIS for persistence
- **Rationale:** Per project spec. PostGIS enables spatial indexing for incident locations. Uncertainty metadata (accuracy_meters) stored alongside coordinates.

### D6: Axum + Tokio for HTTP framework
- **Rationale:** Per project spec. Type-safe extractors, tower middleware ecosystem, async.

## Consequences

- Android/gateway clients must produce CBOR-encoded `MeshPacketV1` packets with Ed25519 signatures.
- The protocol crate (`disaster-mesh-protocol`) is the shared source of truth for wire types.
- JWT secret management and key rotation are deployment concerns not yet addressed.
- The dedup cache requires periodic cleanup (implemented as background task).

## Related
- `protocol/PACKET_SPEC_V1.md`
- `protocol/SECURITY_SPEC_V1.md`
- `docs/OPEN_QUESTIONS.md` (Q-001, Q-004)
