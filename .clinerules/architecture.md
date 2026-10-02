# Architecture Rules

## Logical layers
1. Presentation/UI
2. Application/use cases
3. Domain models
4. Infrastructure/adapters
5. Transport/protocol

Keep business logic independent from Android UI and web components.

## Suggested repository boundaries
```text
android/
  app/
  mesh-core/
  crypto/
  location/
  storage/
  ui/
backend/
  api/
  auth/
  incidents/
  dispatch/
  mesh-ingress/
  sync/
web/
protocol/
docs/
infra/
tests/
```

If the current repository is materially different, preserve it initially and create a migration ADR before moving code.

## Offline path
The minimum emergency path MUST be:
user -> Android local queue -> BLE transport -> relay(s) -> connected gateway/command node -> backend.

No remote API call should be required to create or retain an SOS locally.

## Online sync
Use idempotent server operations. A client may replay the same logical message after reconnection. The server must reject or coalesce duplicates safely.

## Failure containment
A failure in map rendering, analytics, remote configuration, telemetry, or a non-essential API must not prevent creation, persistence, or relay of emergency packets.
