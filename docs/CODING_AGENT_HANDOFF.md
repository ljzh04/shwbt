# Coding Agent Handoff

## Mission in one sentence

Build a reproducible, simulator-grounded Pokémon Showdown stall research agent whose team construction, opponent modeling, action search, and self-improvement are independently testable and benchmarked.

## What is already decided

- Showdown is the authoritative rules engine.
- TypeScript/Node is the primary runtime.
- Raw telemetry is append-only.
- Training datasets are versioned.
- Hidden information is probabilistic, never silently revealed.
- Teams and policies evolve separately.
- No automatic production promotion without a frozen benchmark.
- Annoyance is a measurable multi-term objective, not simply battle length.

## What you should build first

Implement the smallest complete vertical slice:

```text
BattleStream
  ↓
protocol parser
  ↓
agent-visible canonical state
  ↓
legal actions
  ↓
one deterministic baseline action
  ↓
decision telemetry
  ↓
raw + normalized persistence
```

Do not start with MCTS, neural networks, or evolutionary teams until this slice is stable.

## Definition of done for the first slice

A test can:

1. create a deterministic local battle,
2. feed two known teams,
3. consume protocol output,
4. reconstruct the agent-visible state,
5. enumerate legal actions,
6. choose a deterministic action,
7. log the decision,
8. replay the battle,
9. reproduce the same state hashes.

## Where to look

- Architecture: `docs/ARCHITECTURE.md`
- Data model: `docs/DATA_MODEL.md`
- Decision engine: `docs/DECISION_ENGINE.md`
- Opponent model: `docs/OPPONENT_MODEL.md`
- Team lab: `docs/TEAM_LAB.md`
- Self-improvement: `docs/SELF_IMPROVEMENT.md`, `docs/AUTO_LOGGING.md`
- Evaluation: `docs/EVALUATION.md`
- Roadmap: `docs/ROADMAP.md`
- Current status: `memory/CURRENT_STATE.md`
- Open work: `memory/OPEN_WORK.md`

## Anti-patterns

Do not:

- use an LLM as the source of truth for battle legality
- train directly from raw protocol logs
- let evaluation battles leak into training
- assume the opponent's hidden set is known
- silently change simulator versions
- optimize only for turns survived
- treat self-play choices as labels of optimal play
- auto-promote every newly trained candidate

## Expected coding style

Prefer small interfaces and pure transformations:

```text
protocol event → reducer → state
state → beliefs
state + beliefs → candidates
state + candidates → search
state/action/outcome → telemetry
```

Each arrow should have tests.

## If blocked

Do not invent battle semantics. Inspect the pinned Showdown source/protocol and add a focused regression test around the discovered behavior.

## Handoff requirement

Before ending a work session:

- run applicable tests
- update `memory/CURRENT_STATE.md`
- update `memory/OPEN_WORK.md`
- record any new architectural decision in `memory/DECISIONS.md`
- summarize the next concrete task in the final commit/message
