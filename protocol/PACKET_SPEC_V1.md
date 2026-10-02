# Mesh Packet Specification V1 — Draft

Status: **DRAFT — implementation must wait for architecture/security review**

## Purpose
Define a bounded, authenticated, replay-resistant envelope for store-and-forward emergency messages.

## Envelope (conceptual)
```text
MeshPacketV1 {
  version
  packet_id
  origin_id
  destination_scope
  message_type
  created_at
  expires_at
  ttl
  hop_count
  priority
  payload_kind
  payload_length
  payload
  auth_tag_or_signature
}
```

## Required semantics
- `version`: wire compatibility identifier.
- `packet_id`: globally unique enough for the protocol's practical lifetime; used for deduplication/idempotency.
- `origin_id`: privacy-preserving node/message origin identifier, not a human-readable identity.
- `destination_scope`: e.g. local broadcast, area/gateway, specific responder service.
- `message_type`: SOS, acknowledgement, issue report, status, gateway receipt, etc.
- `created_at` and `expires_at`: used for freshness and cleanup. Do not trust remote clocks blindly for security decisions.
- `ttl`: bounds forwarding.
- `hop_count`: operational visibility; exact update semantics must be defined before implementation.
- `priority`: emergency policy input, not a license to bypass all abuse controls.
- `payload_length`: validates framing and protects parsers.
- `payload`: encrypted/authenticated application data where confidentiality is required.
- `auth_tag_or_signature`: cryptographic authenticity/integrity mechanism defined by Security Spec.

## Relay rules
A node MUST NOT relay a packet that is:
- malformed;
- expired;
- already seen according to the dedup cache;
- outside the node's accepted protocol versions;
- over configured size limits;
- disallowed by local abuse/priority policy.

A relay MUST decrement the forwarding budget and MUST NOT allow an attacker to restore TTL/hop budget.

## Open decisions
Before V1 is frozen, explicitly decide:
1. Serialization format (CBOR, protobuf, fixed binary, etc.).
2. Maximum packet size and fragmentation strategy.
3. Exact TTL/hop semantics.
4. Destination addressing/scoping.
5. Offline clock/freshness behavior.
6. Signature/encryption envelope.
7. ACK semantics and failure states.
8. Store-and-forward retention limits.
