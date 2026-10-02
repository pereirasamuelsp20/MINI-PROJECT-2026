# Disaster Mesh — AI Engineering Constitution

## Mission
Build a privacy-preserving disaster-response platform with an Android client, resilient BLE store-and-forward mesh, Rust backend, and web command dashboard.

The system must remain useful when cellular internet, Wi-Fi infrastructure, and GPS are unavailable. Cloud services are an enhancement, never a dependency of the offline emergency path.

## Non-negotiable rules
1. Read this file and all applicable `.clinerules/*` before changing code.
2. Inspect the existing repository before restructuring. Do not delete or replace working code because a new architecture looks cleaner.
3. Never invent cryptography. Use established, reviewed libraries and platform keystores.
4. Never implement a mesh protocol ad hoc in feature code. All wire behavior belongs under `protocol/` and `android/mesh-core`.
5. Every mesh packet MUST have a stable packet identifier, origin identifier, protocol version, TTL, expiry semantics, and authenticity/integrity protection.
6. Relays MUST deduplicate, enforce expiry, enforce TTL, and apply forwarding backoff/jitter.
7. Never treat BLE RSSI as an exact distance or exact position measurement.
8. GPS-derived coordinates MUST carry an accuracy/uncertainty value and source metadata.
9. Do not broadcast PII such as names, phone numbers, email addresses, or exact home addresses over BLE.
10. Minimize stored sensitive data. Encrypt sensitive local data at rest and protect keys with platform secure storage where practical.
11. Do not log emergency payloads, authentication secrets, private keys, access tokens, or precise location unless explicitly required for a controlled test.
12. Do not put cloud/database dependencies on the offline path.
13. Avoid battery-hostile continuous scanning/advertising. Mesh behavior must have explicit duty-cycle and power policies.
14. Do not silently change a protocol field, serialization format, cryptographic envelope, or semantic without recording an ADR and protocol-version implications.
15. Cross-module contracts must be documented before implementation changes are merged.
16. Security-sensitive changes require tests and a second human review.
17. Never commit secrets, certificates, private keys, production credentials, or real victim/responder data.
18. Agents must not modify another agent's owned area without coordinating through `TASK_BOARD.md` and the team mailbox/mission-log mechanism used by the coding environment.
19. When requirements are missing or contradictory, create an entry in `docs/OPEN_QUESTIONS.md` rather than guessing.
20. Tests must cover failure modes, not only happy paths.

## Architecture boundaries
- Android app owns user interaction, local persistence, device capabilities, and mesh transport integration.
- `mesh-core` owns packet lifecycle, deduplication, relay policy, queues, and routing/forwarding decisions.
- `protocol/` is the source of truth for wire contracts.
- Backend owns authenticated internet-side coordination, incident workflows, dispatch, persistence, synchronization, and administrative policy.
- Web owns command-center presentation and operator workflows; it does not implement mesh transport.

## Default stack
- Android: Kotlin, Jetpack Compose, Coroutines/Flow, Room; secure local storage as specified by the security rules.
- BLE: platform BLE APIs behind an internal transport abstraction; Nordic BLE libraries may be used as a reference/integration foundation after license and API review.
- Backend: Rust, Axum, Tokio, SQLx, PostgreSQL/PostGIS unless an existing repo constraint requires otherwise.
- Web: Next.js + TypeScript; MapLibre or another approved offline-friendly map renderer where appropriate.

## Development behavior
Before implementation:
1. Inspect the current repository.
2. Produce/update architecture inventory.
3. Identify the task's owned files/modules.
4. Check protocol dependencies.
5. Add/update tests.

After implementation:
1. Run targeted tests.
2. Run lint/static analysis for the affected module.
3. Report changed files, interfaces, risks, and unresolved questions.
4. Never claim a BLE behavior was tested on physical devices if it was only unit-tested.

## Definition of done
A change is done only when:
- it builds;
- affected tests pass;
- contracts are documented;
- privacy/security implications are considered;
- offline behavior is preserved where required;
- no secrets or sensitive fixtures were introduced;
- the handoff is understandable to the next agent/person.
