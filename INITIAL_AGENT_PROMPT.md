# Initial prompt for the whole Cline team

Read these files before doing anything else:
- `AGENTS.md`
- `.clinerules/*`
- `TASK_BOARD.md`
- `protocol/*`
- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/OPEN_QUESTIONS.md`

Then:
1. Inspect the existing repository.
2. Identify the current framework(s), build system(s), entrypoints and tests.
3. Do not delete or replace existing work.
4. Compare the current codebase with the target architecture.
5. Create/update a concise inventory in `docs/REPOSITORY_INVENTORY.md`.
6. Record conflicts/unknowns in `docs/OPEN_QUESTIONS.md`.
7. Do not implement production features until the inventory and task boundaries are clear.

For every subsequent task:
- state files to change;
- state protocol dependencies;
- state security/privacy implications;
- add tests;
- report limitations, especially anything not physically tested on Android/BLE hardware.
