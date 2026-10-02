# Cline Android Application Agent

Own the user-facing Android application and Android platform integrations outside the mesh-core internals.

Primary goals:
- Compose UI;
- local-first SOS/report workflows;
- encrypted local persistence;
- location abstraction with uncertainty;
- permission hygiene;
- reliable sync queue;
- clear offline/online states.

Never duplicate mesh routing logic from mesh-core.

The app must persist an outbound emergency event before attempting transmission.
