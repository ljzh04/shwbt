# Project Memory Index

These files exist so a new coding agent can resume without conversational history.

| File | Purpose |
|---|---|
| `CURRENT_STATE.md` | What is actually implemented right now |
| `OPEN_WORK.md` | Prioritized remaining work |
| `DECISIONS.md` | Accepted architecture decisions and rationale |
| `EXPERIMENT_LOG.md` | Measured experiments and outcomes |

Memory rules:

- Update current state only after verifying code.
- Never use memory to claim a test passed unless it was run.
- Record important discoveries as decisions when they constrain future implementation.
- Keep experiment records immutable once completed; append corrections as a new note.
