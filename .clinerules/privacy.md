# Privacy Rules

## Data minimization
Collect only what a specific emergency workflow needs. Separate operational identifiers from directly identifying user data.

## BLE privacy
BLE advertisements should expose only what the mesh needs to discover/route at that layer. Do not expose:
- name
- phone number
- email
- home address
- human-readable account ID
- exact GPS coordinates

## Location
Location is sensitive. Store source, accuracy/uncertainty, timestamp and retention semantics. Avoid presenting inferred coordinates as exact truth.

## Retention
Define retention by data class. Emergency payloads, location, audit logs, and diagnostics should not all have the same retention policy.

## Access control
Web operators should have least-privilege access. Sensitive data should be visible only to roles that need it.

## Analytics
No third-party analytics in the offline emergency path. Do not silently transmit sensitive telemetry for product analytics.
