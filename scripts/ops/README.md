# Operations Scripts

This directory is reserved for restart-safe operational scripts.

Planned scripts:

- `collect-selfplay.ts` — long-running local simulator collector
- `compact-dataset.ts` — raw → normalized/Parquet compaction
- `validate-dataset.ts` — quality/lineage/split checks
- `run-benchmark.ts` — frozen evaluation
- `train-candidate.py` — offline training entry point
- `promote-candidate.ts` — gated candidate promotion

No script is considered production-ready until its command, inputs, outputs, failure behavior, and tests are documented here and in `docs/OPERATIONS.md`.
