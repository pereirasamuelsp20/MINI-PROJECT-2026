# Repository Inventory

Status: VERIFIED — inspected and updated during Sprint 4 (Web Command Center & Interactive Mobile UI).

## Current Structure

- [ ] Android client: Not yet implemented in repository (`android/` directory not created). Assigned to Agent 1 (mesh-core) & Agent 2 (UI/app).
- [x] Backend: Implemented in `backend/` (Rust workspace with `crates/protocol` and `crates/server`).
- [x] Web: Implemented in `web/` (Next.js 14 + React 18 + TypeScript + Tailwind CSS + Leaflet).
- [x] Database: PostgreSQL schema in `backend/migrations/20261022000000_initial_schema.sql` (Dockerized in `backend/docker-compose.yml`).
- [x] Infrastructure: `backend/Dockerfile`, `backend/docker-compose.yml`.
- [x] Protocol: `protocol/PACKET_SPEC_V1.md`, `protocol/SECURITY_SPEC_V1.md`, Rust CBOR/Ed25519 implementation in `backend/crates/protocol`.
- [x] Documentation: `AGENTS.md`, `TASK_BOARD.md`, `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, `docs/OPEN_QUESTIONS.md`, `docs/ADR/`.
- [x] Design Reference: `figma-exports/` (PNGs from Figma Make/Slides), `figma-site-source/` (published site source from `https://sting-eject-38072602.figma.site/`).

## Existing Technologies

- Android: Planned (Kotlin, Jetpack Compose, Room, platform BLE) — Sprint 2.
- Backend: Rust 1.80+, Axum 0.7, Tokio 1.0, SQLx 0.7, PostgreSQL 16 (PostGIS-ready), Ciborium (CBOR), ed25519-dalek.
- Web: Next.js 14.2, React 18.3, TypeScript 5.6, Tailwind CSS 3.4, Leaflet 1.9, Lucide React icons.
- Database: PostgreSQL with SQLx migrations (`incidents`, `packets`, `operator_actions`, `dispatch_logs`).
- Mapping: OpenStreetMap tiles via Next.js server proxy (`/api/map-tile/[...coords]`), fallback to CartoDB, client-side Leaflet rendering with GPS uncertainty rings and safe route polyline.
- Auth: Ed25519 signatures for mesh packets; JWT / API tokens for backend operator endpoints.
- Build tooling: Cargo for Rust backend; npm / Next.js for web frontend.

## Existing Constraints

1. **Offline-first mesh path**: The web and mobile apps must operate locally when disconnected from cellular/Wi-Fi. Web client caches alerts, channels, and messages in `localStorage` before attempting backend sync.
2. **GPS uncertainty metadata**: All geographic coordinates must carry accuracy/uncertainty values (`accuracyMeters`) and source flags per Constitutional Rule 8.
3. **No PII broadcast over BLE**: Names, emails, and exact home addresses are never transmitted in mesh broadcast payloads per Rule 9.
4. **Power-saving mode**: Ultra-low power mode (#000000 black background with #00ff41 neon green text) for OLED battery conservation in disaster/blackout scenarios.
5. **Mobile tile delivery**: OSM tiles are proxied through `/api/map-tile/` with caching headers and fallback so phones do not get blocked by CORS or rate limits during local network development.

## Verification & Build Status

- Backend: `cargo check` passes with 0 errors.
- Web: `npm run build` succeeds (all static pages generated, TypeScript and Tailwind compilation clean). Dev server running at `http://localhost:3000`.
- Wire protocol: MeshPacketV1 CBOR serialization and Ed25519 signature verification implemented in `backend/crates/protocol`.
