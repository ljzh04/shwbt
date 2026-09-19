# Master Specification

## Product statement

Build a reproducible research platform that evolves stall teams and a battle policy against Pokémon Showdown's exact simulator, using historical battle data plus generated experience. The policy optimizes a configurable long-horizon objective in which winning remains relevant but resource denial, forced switching, status/hazard pressure, information advantage, and sustained positional control can receive explicit weight.

## Core architecture

```text
                 ┌───────────────────────────┐
                 │       DATA INGESTION      │
                 └─────────────┬─────────────┘
                               ▼
                    historical prior store
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
          team population              opponent priors
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                    exact Showdown engine
                               │
                               ▼
                       battle state
                               │
                    ┌──────────┴───────────┐
                    ▼                      ▼
              belief model            action generator
                    │                      │
                    └──────────┬───────────┘
                               ▼
                        search / policy
                               │
                               ▼
                      position evaluator
                               │
                               ▼
                           action
                               │
                               ▼
                          next state
                               │
                               ▼
                      decision telemetry
                               │
              ┌────────────────┴───────────────┐
              ▼                                ▼
        model improvement                team improvement
              │                                │
              └────────────────┬───────────────┘
                               ▼
                        frozen evaluation
```

## Non-negotiable engineering rules

### Rule 1 — Exact rules live in Showdown

The AI must consume the simulator rather than maintaining a second battle engine.

### Rule 2 — Hidden information is probabilistic

The model must never treat unrevealed moves/items/sets as known unless the information is legitimately observable from the battle state.

### Rule 3 — Search must be exact

A search branch should use an exact simulator snapshot/clone or an exact replay-to-state method.

### Rule 4 — Annoyance is measurable

Avoid vague statements like "stall harder". Every objective term must resolve to a measurable feature and a normalization method.

### Rule 5 — Teams and policies evolve independently

Team search and action search have different timescales and should have different evaluation harnesses.

### Rule 6 — Data lineage is mandatory

Every result must identify simulator, ruleset, team, agent, objective, model, dataset, and random seed.

### Rule 7 — Self-improvement is gated

No self-generated model automatically becomes the new baseline.

## Minimum viable research system

The first serious milestone is complete when all of the following exist:

1. Local deterministic Showdown battle harness.
2. Canonical normalized state representation.
3. Legal action extraction.
4. Rule-based stall evaluator.
5. One-ply search agent.
6. Structured decision-point dataset.
7. Historical team/set ingestion format.
8. Frozen benchmark suite.
9. Reproducible experiment registry.

At that point the project can start answering research questions instead of merely demonstrating a bot.

## Recommended first implementation

```text
M0  repo + simulator pin
M1  protocol reducer
M2  state/action schema
M3  baseline evaluator
M4  one-ply agent
M5  replay/experience DB
M6  opponent beliefs
M7  beam search
M8  team evolution
M9  adversarial teams
M10 model training
M11 promotion pipeline
```
