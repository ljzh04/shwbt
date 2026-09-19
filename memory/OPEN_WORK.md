# Open Work

Priority order is intentionally coarse. Pick one vertical slice at a time.

## P0 — foundation

- [x] Pin a specific Pokémon Showdown commit and record it in `configs/system.yml`.
- [x] Add the Showdown dependency or deterministic local checkout strategy.
- [x] Implement `BattleStream` smoke harness.
- [x] Implement protocol event parser/reducer.
- [x] Define canonical agent-visible state.
- [x] Define legal action representation.
- [x] Create state hashing and deterministic replay tests.

## P1 — automatic experience collection

- [x] Implement append-only battle event writer.
- [x] Implement decision-point extractor.
- [x] Implement quality validation.
- [x] Implement deduplication/content hashes.
- [x] Implement dataset manifests and train/validation/test split enforcement.
- [x] Implement long-running collector CLI.
- [x] Add restart/checkpoint support.

## P1 — baseline decision engine

- [x] Implement resource/position feature extractor.
- [x] Implement stall objective vector.
- [x] Implement deterministic rule-based baseline.
- [x] Implement one-ply simulator-backed evaluator.
- [x] Add explanation telemetry.

## P2 — opponent model

- [x] Set priors.
- [x] Hidden-item/ability hypotheses.
- [x] Move probability model.
- [x] Switch/stay action model.
- [x] Player behavior features where attribution is permitted.
- [x] Calibration benchmark.

## P2 — search

- [x] Exact branch/restore.
- [x] Beam search.
- [x] Expected-value opponent model.
- [x] Tail-risk / catastrophic-loss penalty.
- [x] Search budget instrumentation.

## P2 — team lab

- [x] Team/set normalization.
- [x] Role/coverage feature model.
- [x] Mutation operators.
- [x] Population evaluator.
- [x] Elite selection.
- [x] Adversarial counterteam generation.

## P3 — learning

- [x] Candidate action predictor.
- [x] Hidden-set classifier.
- [x] Position value model.
- [x] Hard-example miner.
- [x] Counterfactual dataset generator.
- [x] Benchmark-gated model promotion.

## P3 — operations

- [ ] Dockerized collector.
- [ ] Collector health metrics.
- [ ] Disk/retention policy.
- [ ] Dataset compaction.
- [ ] Scheduled benchmark runs.
- [ ] Rollback tooling.

## Explicitly deferred

- LLM in authoritative move-selection path.
- Live ladder automation.
- Platform-specific automation tricks.
- Distributed training.
- GPU-first architecture.
