# Disaster Mesh — Backend

Rust API server for the Disaster Mesh platform. Handles gateway ingestion, incident lifecycle, responder dispatch, offline sync, and operator authentication.

## Quick start

```bash
# 1. Copy environment template
cp .env.example .env
# Edit .env — set real secrets for JWT_SECRET and API_KEY_HMAC_SECRET:
#   openssl rand -hex 64  →  JWT_SECRET
#   openssl rand -hex 32  →  API_KEY_HMAC_SECRET

# 2. Start PostgreSQL + PostGIS
docker compose up -d db

# 3. Run the server (migrations run automatically)
cargo run

# 4. Verify
curl http://localhost:3001/health
```

## Docker (full stack)

```bash
docker compose up --build
```

## Architecture

```
backend/
├── crates/
│   ├── protocol/       # Wire format (MeshPacketV1), CBOR, Ed25519 crypto
│   └── server/         # Axum API server
│       └── src/
│           ├── auth/       # JWT, API keys, RBAC
│           ├── middleware/  # Rate limiting, auth extractors, request ID
│           ├── models/     # DB record types
│           ├── services/   # Business logic (ingestion, incidents, dispatch)
│           └── routes/     # HTTP endpoints
├── migrations/         # SQLx/PostgreSQL schema
├── Dockerfile          # Multi-stage production build
└── docker-compose.yml  # Local dev environment
```

## API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | — | Readiness probe |
| `POST` | `/api/v1/gateway/ingest` | API Key | Idempotent mesh packet ingestion |
| `POST` | `/api/v1/auth/login` | — | Operator login → JWT |
| `POST` | `/api/v1/auth/refresh` | JWT | Token refresh |
| `GET` | `/api/v1/incidents` | JWT (operator+) | List incidents |
| `GET` | `/api/v1/incidents/:id` | JWT (operator+) | Incident detail + locations |
| `PATCH` | `/api/v1/incidents/:id/verify` | JWT (operator+) | Verify incident |
| `PATCH` | `/api/v1/incidents/:id/reject` | JWT (operator+) | Reject incident |
| `PATCH` | `/api/v1/incidents/:id/resolve` | JWT (operator+) | Resolve incident |
| `POST` | `/api/v1/incidents/:id/dispatch` | JWT (operator+) | Dispatch responder |
| `PATCH` | `/api/v1/dispatches/:id/status` | JWT (responder+) | Update dispatch status |
| `POST` | `/api/v1/sync/pull` | JWT | Pull updates since timestamp |
| `POST` | `/api/v1/sync/push` | JWT | Push buffered packets |
| `GET` | `/api/v1/audit` | JWT (admin) | Query audit log |

## Security

- All client input treated as untrusted
- Ed25519 signature verification on ingested packets
- Argon2 password hashing
- HMAC-SHA256 API key verification with constant-time comparison
- Per-identity rate limiting
- Idempotent ingestion (duplicate packet_id → 200 OK)
- No internal errors exposed to clients
- Audit log on all state-changing operations
- No secrets in the repository (`.env.example` has placeholders only)

## Testing

```bash
# Protocol crate unit tests (no DB required)
cargo test -p disaster-mesh-protocol

# All tests
cargo test
```
