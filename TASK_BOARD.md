# Team + Agent Task Board

## Ownership

### Agent 1 — BLE / Mesh Core
Owns:
- `android/mesh-core/`
- protocol drafts related to transport behavior
- mesh simulator/fake transport tests
- BLE discovery/relay integration

Must coordinate before changing backend/web contracts.

### Agent 2 — Android Application
Owns:
- `android/app/`
- `android/ui/`
- `android/location/`
- `android/storage/`

Consumes the mesh-core API; should not duplicate relay logic.

### Agent 3 — Backend
Owns:
- `backend/`
- `infra/`
- DB migrations
- ingestion/auth/incident/dispatch/sync APIs

Must preserve idempotent ingestion and offline-sync semantics.

### Agent 4 — Web Command Center
Owns:
- `web/`
- operator UI
- map presentation
- incident/dispatch views

Consumes versioned backend APIs; does not implement BLE protocol.

## Suggested work sequence
### Sprint 0 — Foundation
- Repository inventory
- Build matrix
- Architecture freeze (draft)
- Protocol V1 decision set
- Security threat model
- CI

### Sprint 1 — Mesh vertical slice
- Fake transport
- packet serializer
- dedup cache
- TTL/expiry
- relay scheduler
- local queue
- integration tests

### Sprint 2 — Android SOS
- SOS UI
- local persistence
- mesh send
- receipt states

### Sprint 3 — Backend ingestion
- authenticated gateway endpoint
- idempotent packet ingestion
- incident persistence
- audit log

### Sprint 4 — Web command center
- incident map
- status timeline
- operator verification
- dispatch workflow

### Sprint 5 — Real-device BLE
- phone-to-phone discovery
- relay tests
- packet-loss tests
- battery tests
- Android-version/device matrix

## Status values
- TODO
- IN PROGRESS
- BLOCKED
- REVIEW
- DONE

## Rule
Every task must list owner, files, dependency, acceptance criteria, and test plan.
