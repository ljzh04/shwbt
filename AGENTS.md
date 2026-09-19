# AGENTS.md — Pokémon Showdown Stall AI

## Mission

Build a reproducible research system that can:

1. construct and evolve stall teams,
2. reconstruct the exact agent-visible battle state from Pokémon Showdown,
3. predict opponent actions and hidden set components under uncertainty,
4. choose switches/moves with long-horizon search,
5. continuously collect high-quality battle/decision data while running,
6. improve policies and teams only through versioned, benchmark-gated experiments.

The project is **not** an end-to-end LLM project. The Showdown simulator is the authoritative rules engine; learned models are advisory components around it.

## Read before changing code

Read in this order:

1. `AGENTS.md`
2. `memory/CURRENT_STATE.md`
3. `memory/OPEN_WORK.md`
4. `docs/MASTER_SPEC.md`
5. `docs/ARCHITECTURE.md`
6. the package-local `README.md` for the area you are changing
7. relevant tests in `tests/TEST_PLAN.md`

For simulator/protocol work also read:

- `docs/SOURCES.md`
- `docs/IMPLEMENTATION_NOTES.md`
- `docs/SIMULATOR_PIN.md` if it exists

## Source-of-truth hierarchy

When documents conflict, use this order:

1. actual source code + tests
2. pinned Showdown version and its protocol/docs
3. machine-readable schemas/configs
4. `docs/MASTER_SPEC.md`
5. package docs
6. memory files / handoff notes

Memory is operational context, not authority over code.

## Non-negotiable invariants

### Simulator

- Never reimplement Pokémon battle mechanics in the AI layer.
- Never silently update the Showdown dependency.
- Record the exact simulator commit for every reproducible experiment.
- Search/counterfactual branches must use the real simulator or deterministic replay through the real simulator.

### Information boundaries

- The agent must only use information available to its side at the decision point.
- Never use omniscient opponent data in the production policy.
- Hidden information may exist in the raw simulator process; it must be kept out of agent-visible state.
- Counterfactual labels must be marked as simulated, never observed.

### Data

- Raw telemetry is append-only and immutable.
- Normalize raw telemetry before creating training examples.
- Training datasets are versioned artifacts, not live database views.
- Evaluation/holdout data must never be used for training.
- A self-generated example is not automatically trusted: validate, deduplicate, quality-score, then include according to dataset policy.
- Every training example must be traceable back to a battle and decision point.

### Self-improvement

- Never auto-promote a newly trained model solely because it was produced.
- Every candidate must pass the frozen promotion benchmark.
- Keep the previous production policy available for rollback.
- A model that improves annoyance while causing unacceptable catastrophic losses is a regression.

### Objective

The target is not merely "long battles". Optimize measurable in-game control such as PP depletion, forced switches, status/hazard pressure, structural preservation, information gain, and win progress.

Do not optimize platform abuse, AFK exploitation, timeout manipulation, disconnect behavior, or anything outside the battle position itself.

## Architecture boundaries

### `packages/simulator`

Owns Showdown process integration, protocol parsing, exact state reconstruction, legal choices, snapshots/branching, and simulator pinning.

### `packages/engine`

Owns pure domain objects, derived position features, resource accounting, objective evaluation, and deterministic scoring.

### `packages/agent`

Owns belief updates, candidate generation, search, action selection, and decision telemetry.

### `packages/teamlab`

Owns team/set normalization, team constraints, mutations, population management, fitness, and adversarial team generation.

### `packages/storage`

Owns persistence, event envelopes, hashes, lineage, Parquet exports, and dataset manifests.

### `packages/training`

Owns offline model training/evaluation only. Production code must have deterministic fallback behavior when a learned model is absent.

## Automatic logging mode

The system should support a long-running collector that a developer can start and leave running.

The safe pipeline is:

```text
battle execution
    ↓
raw immutable event log
    ↓
normalization / validation
    ↓
decision-point extraction
    ↓
quality filters + deduplication
    ↓
versioned dataset snapshot
    ↓
training candidate
    ↓
frozen benchmark
    ↓
promotion decision
```

The collector may automatically gather data. It must **not** silently retrain and replace the production policy.

Default collection should favor local simulator self-play and controlled opponent populations. Live/online collection is a separately gated transport and must follow current platform rules.

## Coding rules

- TypeScript strict mode.
- Prefer pure functions in domain/evaluation code.
- Prefer explicit types over `any`.
- Keep simulator-specific types at the simulator boundary.
- Hash/version all experiment inputs that affect results.
- Add a regression test for every fixed protocol/state bug.
- Do not add a dependency when a standard library/simple local implementation is sufficient.
- Do not introduce ML dependencies into the runtime unless the benchmark demonstrates a need.

## Required checks before finishing work

At minimum:

```bash
npm run typecheck
npm test
npm run lint
```

If the touched area has package-local checks, run those too.

For simulator work, also run a deterministic smoke battle and verify identical state hashes across repeated runs.

For dataset changes, validate schema + lineage + split isolation.

## How to update memory

When a meaningful architectural or implementation fact changes:

- update `memory/CURRENT_STATE.md` for current implementation status,
- update `memory/OPEN_WORK.md` for remaining work,
- update `memory/DECISIONS.md` when an architectural decision is made,
- append an experiment entry to `memory/EXPERIMENT_LOG.md` for measured experiments.

Do not use memory files to hide failing tests or unresolved assumptions.

## Starting a new coding session

A coding agent should be able to start from the folder alone:

1. read `AGENTS.md`;
2. read `memory/CURRENT_STATE.md`;
3. read `memory/OPEN_WORK.md`;
4. inspect git status and recent commits;
5. run the baseline checks;
6. pick one explicit work item;
7. update code + tests + relevant memory;
8. record measured results.

## Change discipline

Do not make broad speculative refactors while a subsystem is untested. Prefer vertical slices:

```text
contract → implementation → invariant test → telemetry → memory update
```

When uncertain about battle semantics, inspect the pinned Showdown source/protocol before guessing.
