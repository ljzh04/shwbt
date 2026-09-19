# Pokémon Showdown Stall AI — Research-Grade Build Specification

**Project goal:** build a Pokémon Showdown battle agent that specializes in long-horizon stall and optimizes for a configurable notion of *annoyance* rather than raw win rate alone.

The system is designed around five separable capabilities:

1. **Exact simulation** using Pokémon Showdown's simulator as the rules engine.
2. **State reconstruction** from battle protocol messages into a complete agent-visible state.
3. **Decision intelligence**: opponent modeling, candidate generation, search, and position evaluation.
4. **Team intelligence**: historical priors, team/set mutation, evolutionary search, and adversarial counter-generation.
5. **Self-improvement**: every battle produces structured decision-point data, not merely a replay file.

## Design thesis

The project should not begin as an end-to-end neural network. The first strong baseline should be a deterministic/search-based agent with an inspectable evaluator. Learning components are then added where data can demonstrate that they improve a benchmark.

The central optimization loop is:

```text
Historical data
      ↓
Metagame / set priors
      ↓
Candidate stall teams
      ↓
Self-play + adversarial battles
      ↓
Decision-point telemetry
      ↓
Opponent model + position evaluator
      ↓
Policy/search improvements
      ↓
Team mutations
      ↺
```

## Important scope decision

The agent MUST treat the Pokémon Showdown simulator as the authoritative rules engine. Do not reimplement battle mechanics in the AI layer.

The official Showdown simulator exposes `BattleStream`, accepting player choices and emitting simulator protocol messages. The upstream docs also provide the battle protocol specification. See the references below.

## Recommended initial stack

- **Node.js + TypeScript** for simulator integration and online battle policy.
- **Pokémon Showdown simulator package/repository** pinned to an explicit commit/version.
- **PostgreSQL** for normalized experiment/battle/state metadata.
- **Parquet** for large offline state/action datasets.
- **Python** for optional offline model training and statistical analysis.
- **Docker Compose** for local reproducibility.

## What this repository contains

```text
README.md                         this project contract
docs/ARCHITECTURE.md              system architecture and boundaries
docs/DATA_MODEL.md                battle/team/experience schema
docs/DECISION_ENGINE.md           candidate generation + search + evaluation
docs/OPPONENT_MODEL.md            hidden-set and move prediction
docs/TEAM_LAB.md                  stall team generation and evolution
docs/SELF_IMPROVEMENT.md          replay → learning → evaluation loop
docs/EVALUATION.md                benchmark methodology
configs/objectives.yml            annoyance objective definitions
configs/system.yml                runtime defaults
schemas/*.json                    machine-readable event/state schemas
packages/*                        implementation boundaries/interfaces
scripts/                           operational helpers
tests/                             invariants and regression plans
data/                              local-only generated data
```


## Unattended self-improvement data collection

Yes, the intended system supports an always-on collector. A developer should be able to start local self-play/adversarial generation and leave it running to accumulate experience. The collector writes immutable raw protocol data, extracts validated decision points, deduplicates them, and creates versioned dataset snapshots.

It does **not** silently promote whatever it learns. Training and benchmarking may be automated; production policy promotion is a separate gated step. See `docs/AUTO_LOGGING.md`.

## Coding-agent handoff

This repository is designed to be handed to a fresh coding agent without conversation history. Start with `AGENTS.md`, then `memory/CURRENT_STATE.md` and `memory/OPEN_WORK.md`. Architectural decisions and experiment results live under `memory/`.

Key operational docs:

- `AGENTS.md` — coding rules, invariants, workflow, source-of-truth hierarchy
- `docs/AUTO_LOGGING.md` — always-on collection and training-data pipeline
- `docs/OPERATIONS.md` — startup, collection, dataset, and promotion runbook
- `docs/DATA_GOVERNANCE.md` — provenance, leakage, identity minimization, split policy
- `docs/CODING_AGENT_HANDOFF.md` — first task and definition of done for a new agent
- `memory/` — current state, open work, decisions, and experiment history

## Non-goals for v1

- Replacing Showdown's simulator.
- Training a giant end-to-end model before having a strong baseline.
- Optimizing solely for ladder rating.
- Exploiting AFK/timeouts, connection failures, or platform abuse. The interesting target is in-game positional annoyance: PP depletion, forced switches, repeated low-value decisions, resource denial, and long-horizon pressure.
- Claiming the bot is "perfect". The engineering target is **best action under an explicit objective and an explicit uncertainty model**.

## Research questions

1. Can a transparent stall evaluator outperform simple rules on long-horizon position quality?
2. Does explicit opponent-set belief modeling improve move/switch selection?
3. Does shallow search beat a one-ply evaluator when the objective rewards resource exhaustion?
4. Does evolutionary team search discover useful stall cores that are absent from the seed pool?
5. Does adversarial team generation expose weaknesses that random self-play misses?
6. When does learned prediction add value over Bayesian/heuristic priors?

## Current authoritative references

- Pokémon Showdown repository and simulator overview: https://github.com/smogon/pokemon-showdown
- Simulator API (`BattleStream`): https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
- Simulator protocol: https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md

These references were checked on 2026-09-19. Pin the exact upstream commit used by experiments; never rely on an unpinned moving `master` for reproducibility.
