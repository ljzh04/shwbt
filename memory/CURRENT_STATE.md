# Current State

**Last updated:** 2026-09-19

## Project state

The repository is a **research-grade deterministic scaffold with an end-to-end local collection path**, not yet a complete battle-playing implementation.

The intended stack is TypeScript/Node for simulator + online policy, PostgreSQL for metadata, Parquet for large training datasets, Python optionally for offline training/analysis, and Docker Compose for local infrastructure.

## Implemented in repository

- project specification and architecture documents
- objective configurations
- system configuration with explicit simulator pin
- JSON schemas for decision points and teams
- deterministic canonical battle-state hashing utility
- conservative protocol reducer for core public battle events
- legal-action extraction from simulator choice requests
- deterministic local Showdown checkout script pinned to `2ddfa0476f8207e12e204b1c69f7c7683b17633c`
- BattleStream adapter starts pinned local battles and exposes legal choices
- deterministic command-log replay cloning produces matching state hashes
- perspective-aware state filtering blocks opponent-private split data
- append-only NDJSON raw event writer validates provenance and sequence order
- pending decision extractor links protocol requests to canonical state hashes and legal actions
- pending decision quality validator checks provenance, actions, turn, and state hash
- raw event SHA-256 hashing and in-process duplicate suppression
- dataset manifest hashing and battle-level split isolation validation
- one-shot self-play collector heartbeat with atomic restart checkpoint
- conservative observable-only baseline evaluation features and stall objective vector
- deterministic baseline policy ranks legal actions with conservative move categories
- baseline decisions emit category-specific reason contributions
- generic one-ply evaluator branches through SimulatorBattle clone and optional opponent action
- heuristic opponent model supports normalized action/set priors and hard evidence updates
- one-ply expected-value evaluator aggregates exact branches over opponent action beliefs
- P2 utilities cover beam budgets, CVaR risk, behavior/calibration metrics, and team evolution primitives
- frequency action predictor and hard benchmark promotion gate are tested
- learning utilities cover hidden-set priors, position values, hard examples, and simulated counterfactual labels
- collector health tracker and dry-run-capable raw-file retention utility
- Dockerized collector entrypoint, atomic compaction, benchmark scheduling, and rollback pointer utilities
- deterministic self-play collector writes raw protocol events from both player perspectives
- simulator-owned damage oracle wraps pinned Showdown BattleActions.getDamage
- decision sink reduces protocol sideupdates, validates pending decisions, and persists decision records
- self-play collector writes configurable raw protocol and validated decision NDJSON outputs
- self-play collector persists simulator outcome events through a result callback
- event envelopes and pending decisions pass dependency-free schema-boundary validation
- DecisionSink finalizes legal pending actions with transition and objective-delta telemetry
- replay ingestion reprocesses saved raw NDJSON sequentially into validated decisions
- persistent content-hash deduplication survives collector restart
- repeated fixed-seed multi-turn self-play state hashes are regression-tested
- collector image builds cleanly with pinned Showdown and passes container heartbeat smoke
- deterministic frozen benchmark runner reports accuracy and catastrophic-loss rate
- live analysis snapshot builder exposes turn-synced PredictionSnapshot from canonical state
- DecisionSink persists unscored analysis snapshot events alongside pending decisions
- snapshots carry observable-only resource pressure from the engine evaluator; per-move damage stays deferred (needs full team sets, not invented)
- DecisionSink feeds newly revealed opponent moves into the heuristic opponent model behind snapshot beliefs
- pending snapshots carry deterministic baseline candidate scores (injectable policy, silent fallback to unscored)
- reducer tracks entry hazards (-sidestart/-sideend) and healing (-heal); screens and other side conditions stay untracked
- local analysis server serves latest/turn-pinned snapshots over HTTP from decision NDJSON (`scripts/serve-analysis.ts`)
- zero-dependency static panel (`apps/showdown-panel/panel.html`) served at `/`, polls snapshots with KNOWN/INFERRED labels
- `/timeline` endpoint plus panel timeline view shows per-turn top candidate, newly revealed opponent moves, and top belief
- injectable PostgreSQL metadata repository covers battles, decisions, and dataset manifests
- package boundaries/readmes for simulator, engine, agent, storage, teamlab, training, and CLI
- roadmap, evaluation methodology, team lab design, opponent model design, and self-improvement design
- PostgreSQL/Docker scaffolding

## Known gaps

- full protocol coverage beyond the conservative reducer subset
- exact Showdown snapshot API; branching uses deterministic command replay
- production PostgreSQL wiring and migrations beyond the injectable repository boundary
- pending decision finalization is exposed, but self-play policy telemetry does not yet call it automatically
- learning/team-lab utilities are deterministic baselines, not trained models or evolutionary runs
- benchmark runner is a metric harness, not yet a full simulator-backed frozen campaign

## Current target

Harden the first vertical slice:

```text
Showdown BattleStream
  → protocol reducer
  → canonical state
  → legal actions
  → deterministic telemetry
  → persisted raw/decision records
```

The local simulator, raw protocol logging, decision extraction, validation, replay ingestion, and benchmark scaffolding now exist; next work should close the integration gaps above before introducing learned policies.

## Simulator assumptions to verify in code

- Showdown exposes a JavaScript `BattleStream` API.
- Simulator input/output uses the documented text protocol.
- Choice requests expose legal decision information to the player side.
- `|split|` messages distinguish secret player-specific information from public information.
- Simulator commit must be pinned before reproducible experiments.

These are supported by current upstream documentation checked 2026-09-19; see `docs/SOURCES.md`.

## Default safety posture

- Local simulator by default.
- Live transport disabled by default.
- Raw collection enabled only when explicitly requested.
- Training may be automated; promotion may not.
- Evaluation splits are frozen and isolated.
