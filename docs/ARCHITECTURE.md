# Disaster Mesh Architecture

## System view
```text
                ┌──────────────────────────┐
                │ Web Command Center       │
                │ Next.js / TypeScript     │
                └────────────┬─────────────┘
                             │ HTTPS
                             ▼
                ┌──────────────────────────┐
                │ Rust Backend              │
                │ Auth / SOS / Incident /  │
                │ Dispatch / Sync          │
                └────────────┬─────────────┘
                             │
                       PostgreSQL/PostGIS
                             │
                 Internet-connected gateway
                             │
                            BLE
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
        Android Node A  Android Node B  Android Node C
             └────────────── opportunistic mesh ────────┘
```

## Design principles
- Offline emergency operation is first-class.
- Internet is opportunistic.
- BLE transport is replaceable behind an abstraction.
- Protocol contracts are versioned.
- Sensitive data is minimized and protected.
- Location is represented with uncertainty.
- Operators receive evidence and provenance, not false certainty.

## Core data flows
### SOS offline
1. User creates SOS.
2. Client persists SOS locally.
3. Client creates protocol packet.
4. Nearby peers discover/receive packet.
5. Relays deduplicate, authenticate and forward within TTL/expiry constraints.
6. A connected gateway uploads the packet.
7. Backend validates, persists and triggers authorized workflow.
8. Receipt/ack status can propagate back through the mesh.

### Issue report
Same basic path, but issue reports are lower priority and subject to local abuse controls and retention rules.

### Location
Use the strongest currently available source; always preserve source, timestamp and uncertainty. Offline estimates are estimates.

## Component ownership
See `TASK_BOARD.md`.
