# Mesh Security Specification V1 — Draft

Status: **DRAFT — do not freeze algorithms until reviewed**

## Security objectives
1. Protect private emergency content from passive BLE observers and unnecessary relay-node access.
2. Authenticate messages and prevent undetected tampering.
3. Reduce replay and packet-injection abuse.
4. Limit resource exhaustion.
5. Keep human identity separate from radio-visible identifiers where possible.

## Key hierarchy (conceptual)
```text
Device hardware/OS secure storage
        ↓
Long-term device identity key (protected)
        ↓
Session/ephemeral identifiers and message keys
        ↓
Encrypted/authenticated packet payload
```

## Candidate implementation approach
- Android Keystore for protected private key material.
- A high-level approved crypto library such as Tink for application cryptographic operations where its supported primitives fit.
- libsodium is an alternative for portable cryptographic needs, subject to review.

## Required properties
- Cryptographically secure randomness from platform/library primitives.
- No hand-rolled cryptography.
- Key rotation/expiration strategy.
- Replay protection.
- Forwarding without requiring relay nodes to know private payload plaintext where practical.
- Secure deletion/retention strategy appropriate to the platform.

## Important distinction
Packet authenticity is not the same thing as authorization. A validly signed packet can still represent a malicious or false incident; server/operator policy must decide what actions are authorized.

## Abuse controls
- Maximum packet size.
- TTL limit.
- Rate limits per ephemeral/device identity where possible.
- Queue depth limits.
- Expiry-based cleanup.
- Backoff/jitter.
- Gateway/server admission controls.

## Freeze gate
No agent may claim the security spec is production-ready until algorithms, key lifecycles, serialization and threat assumptions have been reviewed by a human.
