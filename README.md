# Disaster Mesh AI Engineering Package

This package is the initial engineering constitution for the disaster-response mesh project.

## How to use
Copy the contents into the root of `MINI-PROJECT-2026`.

Recommended first commands after copying:

```bash
git checkout -b chore/architecture-foundation
```

Then ask the coding agent to:

> Read `AGENTS.md`, `.clinerules/`, `protocol/`, `docs/`, and `TASK_BOARD.md`. Inventory the existing repository. Do not delete or rewrite existing application code. Produce a proposed repository inventory and list any conflicts with the target architecture in `docs/OPEN_QUESTIONS.md`. Do not begin feature implementation until the inventory is complete.

## Reference projects
These are architectural/implementation references, not instructions to copy code blindly:

- Knit: https://github.com/getknit/knit
- MeshTalk: https://github.com/chartmann1590/bluetooth-chat
- Sparrow Mesh: https://github.com/sparrow-platform/sparrow-mesh
- Nordic Kotlin BLE Library: https://github.com/NordicSemiconductor/Kotlin-BLE-Library
- Nordic Kotlin Mesh Library: https://github.com/NordicSemiconductor/Kotlin-Mesh-Library
- Google Tink: https://github.com/tink-crypto/tink-java
- libsodium: https://github.com/jedisct1/libsodium
- SQLCipher for Android: https://github.com/sqlcipher/sqlcipher-android

Before incorporating any code, review license compatibility and the project's maintenance status.

## AI collaboration principle
The repository is the persistent source of truth. Architecture decisions belong in ADRs and protocol specifications. AI agents must not rely on conversation memory for critical contracts.
