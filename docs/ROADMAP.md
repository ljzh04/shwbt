# Implementation Roadmap

## Phase 0 — Reproducible simulator harness

Deliverables:
- pinned Showdown commit
- `BattleStream` smoke test
- format config
- team packing / validation
- deterministic seeded battles
- canonical state snapshots

Exit condition: the same seed/config produces the same normalized state trajectory.

## Phase 1 — Legal action + state foundation

Deliverables:
- protocol reducer
- battle state schema
- legal action extraction
- event log
- decision-point writer

Exit condition: complete battle can be replayed into identical state hashes.

## Phase 2 — Transparent baseline

Deliverables:
- rule-based stall policy
- vector position evaluator
- one-ply search
- explanations from evaluator features

Exit condition: beats random legal agent and passes all hand-built tactical tests.

## Phase 3 — Automatic experience collection

Deliverables:
- append-only collector
- normalized decision-point extraction
- data quality/quarantine
- versioned dataset manifests
- restart-safe checkpoints
- unattended local self-play runner

Exit condition: the collector can run for a long period, restart safely, and produce reproducible train/validation/holdout snapshots.

## Phase 4 — Opponent belief model

Deliverables:
- set priors
- move priors
- Bayesian updates
- action probability model
- calibration metrics

Exit condition: probability calibration is measured against held-out replays.

## Phase 5 — Search

Deliverables:
- exact branch/restore mechanism
- beam search
- expected-value aggregation over opponent actions
- risk penalty / tail-loss handling

Exit condition: search produces statistically significant improvement over baseline on frozen benchmarks.

## Phase 6 — Team Lab

Deliverables:
- seed database
- set normalization
- role compatibility model
- mutation operators
- evolutionary population
- adversarial counterpopulation

Exit condition: generated teams outperform their parents on an unseen benchmark without collapsing to one archetype.

## Phase 7 — Self-improvement

Deliverables:
- experience mining
- counterfactual generation
- hard-example mining
- model training
- promotion gate

Exit condition: new model wins the promotion benchmark and does not regress safety metrics.

## Phase 8 — Advanced learning

Only after earlier phases:

- learned value model
- learned action model
- learned team embeddings
- MCTS / policy-value hybrid
- curriculum generation

## Phase 9 — Live adapter

Only after deterministic offline evaluation is mature.

Keep live interaction isolated behind a transport interface, and follow the platform's current rules/terms for automation.
