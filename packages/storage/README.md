# storage

Persistence boundary for battles, decision points, experiments, and datasets.

## Responsibilities

- append-only raw event writing
- normalized decision-point persistence
- provenance/lineage
- content hashes and idempotency
- PostgreSQL metadata
- Parquet dataset export
- manifests and split enforcement
- collector checkpoints/heartbeats/quarantine

## Data tiers

```text
raw → normalized → experience → frozen training snapshot
```

Raw data is evidence and should not be edited in place.

## Recommended tables

- `experiments`
- `agent_versions`
- `objective_versions`
- `simulator_versions`
- `teams`
- `team_members`
- `battles`
- `participants`
- `decision_points`
- `predictions`
- `evaluation_runs`
- `evaluation_results`
- `datasets`
- `dataset_members`
- `collector_runs`
- `collector_checkpoints`
- `data_quality_events`

## Dataset output

Write wide numeric training matrices to Parquet; retain rich nested raw/normalized events separately.

Every row must carry enough lineage to trace it to:

```text
run → battle → decision point → simulator commit → agent → objective → dataset
```

## Critical rule

Storage must never decide whether a model is "better". It records evidence. Evaluation/promotion owns that judgment.
