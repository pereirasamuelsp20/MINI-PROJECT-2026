# Android Rules

- Kotlin-first.
- Keep UI state out of mesh/transport domain code.
- Use structured concurrency with Coroutines.
- Model mesh state as observable state/flows, not callback spaghetti.
- Abstract Bluetooth so the mesh engine can run in JVM tests with fake transports.
- Treat background execution as a platform constraint and document device/version behavior.
- Persist outbound emergency packets before attempting BLE transmission.
- Make retries idempotent.
- Protect sensitive local storage and keys.
- Do not request permissions that are unrelated to the current feature.
- Build explicit diagnostics for BLE state, queue depth, peer count, packet age and last successful relay.
