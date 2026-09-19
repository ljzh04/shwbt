# Architecture

## 1. System diagram

```text
                         ┌────────────────────────────┐
                         │        DATA SOURCES        │
                         │ replays / teams / battles  │
                         │ curated sets / benchmarks  │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────┐
                         │      DATA INGESTION        │
                         │ parse → normalize → hash   │
                         └──────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴─────────────────────┐
                 ▼                                            ▼
      ┌──────────────────────┐                    ┌──────────────────────┐
      │   TEAM / SET LAB     │                    │ EXPERIENCE STORE     │
      │ priors, mutations,   │                    │ states/actions/obs   │
      │ evolutionary search  │                    │ outcomes/predictions │
      └──────────┬───────────┘                    └──────────┬───────────┘
                 │                                            │
                 └──────────────────┬─────────────────────────┘
                                    ▼
                         ┌────────────────────────────┐
                         │       BATTLE ENGINE        │
                         │ exact Showdown simulation  │
                         └──────────────┬─────────────┘
                                        │ state
                                        ▼
                         ┌────────────────────────────┐
                         │    OBSERVER / BELIEF        │
                         │ hidden set hypotheses      │
                         │ move/item/ability beliefs  │
                         │ opponent behavior model    │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────┐
                         │     ACTION GENERATOR       │
                         │ legal moves + switches    │
                         │ strategic candidate prune │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────┐
                         │       SEARCH ENGINE        │
                         │ 1-ply → beam → MCTS/expect │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────┐
                         │     POSITION EVALUATOR     │
                         │ survival / resources /     │
                         │ denial / progress / risk   │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                               selected action
                                        │
                                        ▼
                         simulator / opponent / replay
                                        │
                                        ▼
                            decision-point telemetry
                                        │
                                        └──────────→ learning loop
```

## 2. Core boundaries

### `packages/simulator`
Owns all Showdown-specific mechanics and protocol translation.

Responsibilities:
- create battles
- write choices
- consume protocol events
- expose legal choices
- snapshot state
- optionally clone/branch a battle for search
- enforce simulator version pinning

It must NOT decide which action is good.

### `packages/engine`
Pure battle-state abstractions and deterministic scoring.

Responsibilities:
- canonical state model
- resource accounting
- position features
- legality-independent strategic features
- evaluator interfaces

It should be unit-testable without a live Showdown connection.

### `packages/agent`
The online decision policy.

Responsibilities:
- belief update
- candidate action ranking
- search
- final action selection
- telemetry

### `packages/teamlab`
Team construction and set optimization.

Responsibilities:
- seed team import
- archetype detection/tagging
- team mutation
- constraint checking
- population management
- fitness aggregation
- counterteam generation

### `packages/storage`
Persistence and dataset writing.

Responsibilities:
- PostgreSQL records
- Parquet export
- content hashes
- experiment lineage
- replay/index metadata

### `packages/training`
Optional learned models. No production dependency until benchmarks justify them.

Potential models:
- opponent action predictor
- hidden-set classifier
- value model
- team component embeddings

## 3. Online decision pipeline

```text
protocol event
  ↓
state reducer
  ↓
state checksum
  ↓
belief update
  ↓
legal action list
  ↓
strategic pruning
  ↓
branch / search
  ↓
position evaluator
  ↓
objective transform
  ↓
final action
  ↓
telemetry event
```

Every step should be observable and replayable.

## 4. Three execution modes

### `train`
Millions of local simulator battles; no network dependency required.

### `evaluate`
Frozen agents and frozen benchmark sets. Used for statistically valid comparisons.

### `live`
Human/online interface adapter. It must be isolated from training so live observations cannot silently contaminate evaluation data.

## 5. Reproducibility

Every experiment must record:

- Showdown repository commit
- format ID
- ruleset/mod
- team hash
- opponent generator version
- agent build hash
- objective config hash
- random seed
- search budget
- model version
- dataset version

An experiment without these fields is not considered reproducible.
