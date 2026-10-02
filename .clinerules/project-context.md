# Project Context

## Product
A disaster-response and civic-reporting platform designed for network-disrupted environments.

## Core scenario
A user may be stranded in an area with no cellular service, no internet, and possibly no usable GPS. Nearby Android devices should be able to exchange emergency information over BLE. Messages can be relayed hop-by-hop until they reach a node with an internet path or a designated relief/command node.

## Core capabilities
- SOS creation and acknowledgement.
- Store-and-forward emergency messaging.
- Nearby issue/civic reporting and monitoring.
- Administrator verification before dispatch where policy requires it.
- Approximate location with uncertainty rather than false precision.
- Relief-camp / safe-destination awareness.
- Responder dispatch and live incident status when connectivity exists.
- MeshMap concept: emergency operators receive useful route/obstruction information.
- Offline-first client behavior.

## Important concepts already discussed
- BLE mesh / opportunistic relay.
- RSSI as a noisy signal, not a precise distance oracle.
- TTL and hop information.
- Deduplication using packet identifiers.
- Store-and-forward for intermittently connected nodes.
- Battery-aware relay priority as a policy input, never as a single routing truth.
- PDR/IMU can estimate movement when GPS is unavailable, but uncertainty accumulates.
- Multilateration can be explored when enough peer/reference measurements exist.
- A relief camp or ground-zero coordinate can act as a known reference anchor in controlled deployments.
- The system should degrade gracefully when sensors or peers disappear.

## Product philosophy
Resilience first. Privacy by design. Explicit uncertainty. Deterministic protocol contracts. Observable failures. No dependency on the AI tooling at runtime.
