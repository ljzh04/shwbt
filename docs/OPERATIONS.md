# Operations Runbook

## Development startup

1. Install dependencies.
2. Ensure the configured Showdown commit is present.
3. Start PostgreSQL with Docker Compose if storage tests need it.
4. Run typecheck, tests, and lint.
5. Run the simulator smoke battle.

```bash
npm install
npm run typecheck
npm test
npm run lint
```

## Long-running data collection

The intended unattended workflow is:

```text
start collector
  → checkpoint
  → collect N battles
  → flush raw log
  → extract decision points
  → validate
  → continue
```

The collector should be restart-safe. A crash must lose at most the currently open atomic batch, not the entire run.

## Before a training run

Verify:

- dataset manifest exists
- simulator commit is pinned
- format/ruleset is explicit
- train/validation/test split hashes differ as expected
- holdout IDs are excluded from training
- data quality thresholds passed
- feature extractor version is recorded
- objective hash is recorded

## Before promotion

Run:

1. baseline vs candidate on identical seeds
2. frozen tactical regression suite
3. calibration benchmark
4. catastrophic-loss slice
5. annoyance-objective benchmark
6. compute/latency benchmark

Keep the previous model/policy as rollback target.

## Disk policy

Raw protocol data can grow quickly. Use content-addressed or compressed append-only files with configurable retention.

Recommended layout:

```text
data/raw/YYYY/MM/DD/run-*.ndjson.zst
data/normalized/YYYY/MM/DD/part-*.parquet
data/experience/YYYY/MM/DD/part-*.parquet
data/manifests/*.json
data/holdout/*.parquet
```

## Failure handling

A malformed battle is a data-quality event, not a worker-fatal exception.

Quarantine the battle with:

- raw hash
- error class
- parser version
- simulator commit
- run ID

Then continue collection.
