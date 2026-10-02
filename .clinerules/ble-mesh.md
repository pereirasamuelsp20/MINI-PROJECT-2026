# BLE Mesh Engineering Rules

## Goal
Build an opportunistic, phone-centric BLE store-and-forward network rather than assuming a permanently provisioned Bluetooth Mesh installation.

## Transport design
Hide Android BLE details behind interfaces such as:
- scanner/discovery
- advertiser
- connection manager
- GATT transport
- packet serializer/deserializer
- relay scheduler

The mesh engine must be testable without a physical radio.

## Relay lifecycle
A received packet should conceptually follow:
1. Parse framing and version.
2. Validate size and structural constraints.
3. Verify authenticity/integrity.
4. Check expiry.
5. Check deduplication cache.
6. Evaluate destination/interest.
7. Persist if store-and-forward policy permits.
8. Decrement/advance hop state according to protocol.
9. Schedule forwarding with bounded jitter/backoff.
10. Remove expired/terminal packets.

## Broadcast-storm controls
- Deduplication cache is mandatory.
- TTL is mandatory.
- Expiry time is mandatory.
- Relay jitter is mandatory.
- Packet size must be bounded.
- Retry count and queue depth must be bounded.
- Do not endlessly retransmit packets already observed from multiple peers.

## Discovery
Do not assume every Android version behaves identically in background. Isolate platform constraints and document empirical device-matrix results.

## RSSI
Never infer exact distance from a single RSSI value. Account for device model, orientation, body blockage, antenna behavior, environment and variance. Prefer measurement history and uncertainty bounds.

## Power
Use explicit operating modes:
- normal
- elevated emergency participation
- critical-low-battery
- responder/gateway

Battery percentage can influence relay priority, but emergency priority, TTL, queue age, and gateway reachability must also be considered.

## Protocol evolution
No agent may change packet layout without updating `protocol/PACKET_SPEC_V1.md` and recording compatibility/migration behavior.
