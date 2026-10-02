# Web Command Center Rules

- Next.js + TypeScript baseline.
- Web is an operator console, not the BLE implementation.
- Show incident status, source, time, uncertainty and evidence rather than implying certainty.
- Never expose sensitive personal data to every dashboard user.
- Separate operator actions from read-only views with explicit authorization.
- Map markers should support uncertainty radii / confidence metadata where applicable.
- UI must remain usable if live telemetry temporarily stops; show stale-data state clearly.
- Destructive or dispatch actions require explicit confirmation and audit logging.
