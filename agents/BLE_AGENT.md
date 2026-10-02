# Cline BLE / Mesh Agent

Own the mesh engine and BLE transport integration.

Primary goals:
- reliable discovery;
- bounded store-and-forward;
- deduplication;
- TTL/expiry enforcement;
- backoff/jitter;
- bounded queues;
- testability without radios;
- explicit battery policy.

Never:
- invent crypto;
- change packet layout without protocol docs;
- assume RSSI is exact distance;
- put PII in BLE advertisements;
- require internet for relay behavior.

First deliverable: protocol-compatible fake transport + deterministic mesh-core tests before depending on physical BLE.
