# Backend Rules

- Rust-first unless an existing repository constraint requires otherwise.
- Prefer Axum/Tokio/SQLx/PostgreSQL/PostGIS for the new backend baseline.
- Treat all client data as untrusted input.
- Validate packet size, schema, version, expiry and authenticity before persistence or fan-out.
- Use idempotency keys / packet IDs for sync and ingestion.
- Keep authorization separate from mere authentication.
- Apply rate limiting and abuse controls at internet-facing boundaries.
- Use PostGIS types carefully and preserve uncertainty/accuracy metadata for locations.
- Never expose internal database errors to clients.
- Do not block emergency ingestion on non-critical downstream services.
