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

- [x] Dockerized collector.
- [x] Collector health metrics.
- [x] Disk/retention policy.
- [x] Dataset compaction.
- [x] Scheduled benchmark runs.
- [x] Rollback tooling.

## Integration Hardening — next priority

- [ ] Connect self-play collector to `DecisionSink` and persist validated decision records during battles.
- [ ] Finalize pending decisions with chosen action, observed transition, and objective delta.
- [ ] Persist battle completion/outcome events and classify abnormal termination.
- [ ] Validate emitted event and decision records against JSON schemas.
- [ ] Make collector raw/decision paths configurable instead of hard-coded.
- [ ] Add deterministic multi-turn self-play fixture with repeated state-hash comparison.
- [ ] Add replay ingestion from saved protocol NDJSON.
- [ ] Replace in-memory deduplication with restart-safe content-hash indexing.
- [ ] Add PostgreSQL repository for battles, decisions, and dataset manifests.
- [ ] Run frozen benchmark harness against baseline and candidate policies.
- [ ] Verify Docker collector image end to end.

## Known implementation ceilings

- Current reducer covers only a conservative subset of protocol events.
- Current decision records are pending-only; chosen action and transition fields remain unpopulated.
- Current damage wrapper is a direct Showdown oracle, not a full battle-state damage feature extractor.
- Learning and team-lab modules are deterministic baselines, not trained models or evolutionary runs.

## Explicitly deferred

- LLM in authoritative move-selection path.
- Live ladder automation.
- Platform-specific automation tricks.
- Distributed training.
- GPU-first architecture.
