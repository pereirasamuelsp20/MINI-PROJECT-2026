# Threat Model — Initial

## Assets
- Emergency message confidentiality.
- Message integrity/authenticity.
- User identity and contact information.
- Location information.
- Responder information.
- Backend credentials.
- Mesh availability and battery/storage resources.
- Operator audit trail.

## Adversaries
### Passive observer
Can listen to BLE advertisements/traffic.

### Packet injector
Attempts to inject forged emergency packets.

### Replay attacker
Re-transmits old valid traffic.

### Compromised device
Has legitimate access to the mesh and may behave maliciously.

### Resource attacker
Attempts to flood queues, consume battery, or inflate database workload.

### Backend attacker
Attempts credential abuse, malformed API traffic, privilege escalation or unauthorized dispatch.

## Initial mitigations
| Threat | Initial mitigation |
|---|---|
| Passive observation | Minimized BLE metadata; encrypted application payloads where needed |
| Injection | Authenticity/integrity checks; admission controls |
| Replay | Packet IDs + expiry + server idempotency |
| Flooding | TTL, size limits, deduplication, rate limits, jitter |
| Privacy leakage | Ephemeral identifiers, data minimization, least privilege |
| Device compromise | Assume a compromised node can observe its own plaintext; avoid trusting a single node with network-wide secrets |
| Backend abuse | Authentication, authorization, validation, rate limiting, audit logs |

## Unresolved high-risk questions
- Identity recovery and account binding when the phone is offline.
- How responders prove authority without exposing long-lived credentials over BLE.
- What happens when a compromised node intentionally lies about location or incident severity.
- How key revocation works during a prolonged network outage.
- How background BLE constraints vary across Android device vendors.
