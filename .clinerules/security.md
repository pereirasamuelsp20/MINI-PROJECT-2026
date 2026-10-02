# Security Rules

## Threat model assumptions
Assume attackers may:
- inject packets;
- replay previously seen packets;
- impersonate a node;
- observe BLE radio traffic;
- compromise one phone;
- capture a device physically;
- submit false incident reports;
- flood the mesh with bogus traffic;
- attempt to exhaust battery/storage/network resources.

## Cryptography
Use established primitives and audited platform/library implementations. Do not write AES, ChaCha, X25519, Ed25519, HKDF, random-number generators, signature schemes, or key derivation implementations yourself.

Candidate libraries:
- Android: Android Keystore plus an approved high-level crypto library such as Tink.
- Cross-platform components: libsodium or another specifically reviewed library where needed.

The exact algorithms and key lifecycle belong in `protocol/SECURITY_SPEC_V1.md` and must be reviewed before implementation.

## Identity
Use pseudonymous/ephemeral radio identities where feasible. Do not put human identity directly into BLE advertisements.

## Confidentiality
Relay nodes should not need plaintext access to private emergency payloads merely to forward them.

## Integrity/authenticity
Messages must have an authenticity/integrity mechanism strong enough for the threat model. Backend authorization is separate from packet authenticity.

## Replay resistance
Use packet identifiers plus expiry/sequence semantics. Server ingestion must be idempotent.

## Secrets
Never commit `.env` files containing real secrets. Provide `.env.example` with placeholders.

## Logging
Default to metadata-only operational logs. Never log payloads, tokens, private keys, raw coordinates, or contact details in production logging.
