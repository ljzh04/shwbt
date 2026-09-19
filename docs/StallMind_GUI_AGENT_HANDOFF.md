# StallMind — Showdown Real-Time Analysis GUI / Browser Extension
## Coding-Agent Handoff

**Purpose:** Add a user-facing browser extension / analysis UI to the existing StallMind Pokémon Showdown research system.

**Important:** This handoff was written outside the current repository context. The repository you receive is authoritative. Do not assume the architecture, file names, interfaces, or implementation status described below still exactly match reality. Inspect the current codebase first and adapt to what is already implemented.

---

## 0. Mission

Build a real-time, human-in-the-loop analysis interface for Pokémon Showdown.

The product should observe the battle state available to the user, feed it through the existing StallMind analysis stack, and present:

- current battle state
- inferred opponent movesets / sets / items / abilities
- predicted opponent moves
- predicted opponent switches
- candidate moves/switches for the user
- exact or simulator-backed damage calculations
- hazards
- status
- HP / survivability pressure
- PP pressure
- switch-entry costs
- opponent/player context such as Elo when legitimately available
- uncertainty / confidence / provenance
- counterfactual explanations
- prediction-vs-actual timeline
- model/objective version information

The extension is an analysis UI, not an auto-player.

Do not automatically click, select, or submit battle actions.

---

# 1. First task: inspect before editing

Before writing implementation code:

1. Read the repository's `AGENTS.md`, `.agent-context.md`, `memory/`, architecture docs, and existing README.
2. Identify the current battle-state representation.
3. Identify the current simulator integration.
4. Identify the current prediction / search / evaluator interfaces.
5. Identify any already-existing web UI, API, CLI, or telemetry layer.
6. Identify the package manager, language, framework, build tooling, linting, tests, and runtime constraints.
7. Identify whether an extension/frontend already exists.
8. Identify existing schemas/contracts before adding duplicates.
9. Run existing tests/build/type checks if available.
10. Write a short implementation note in the repository memory describing what you discovered before making architectural changes.

The current repository is the source of truth.

If an interface already exists that can serve the purpose below, reuse it instead of introducing a parallel abstraction.

---

# 2. Product architecture

Preferred conceptual flow:

    Pokémon Showdown
          |
          v
    Battle/protocol bridge
          |
          v
    Canonical BattleState
          |
          +------------------+
          |                  |
          v                  v
    Analysis Snapshot      Search / Model
          |                  |
          +--------+---------+
                   |
                   v
           PredictionSnapshot
                   |
                   v
          Browser extension UI

The browser extension should be a thin client.

Do not duplicate Pokémon mechanics, battle-state logic, prediction logic, or damage logic inside the UI unless the repository architecture explicitly requires it.

The UI should consume the existing domain contracts.

---

# 3. Core UI goals

The first useful version should show a compact side panel next to the Showdown battle.

## Main sections

### A. Current battle state

Show:

- turn
- active Pokémon
- current HP
- known status
- known/revealed moves
- known item
- known ability
- hazards on each side
- relevant weather / terrain
- relevant field conditions
- remaining Pokémon
- PP where known/inferred
- battle timer if legally/technically observable

Clearly distinguish:

- observed
- inferred
- hypothesized
- unavailable

Never present inferred information as fact.

---

### B. Opponent model

For each relevant opponent Pokémon:

```text
Moves
Recover        41%
Shadow Ball    26%
Make It Rain   18%
Other          15%

Item
Leftovers      58%
Choice Scarf   21%
Other          21%

Likely set
Defensive      71%
Other          29%
```

Include confidence and evidence.

The agent should prefer calibrated probabilities over hard labels.

---

### C. Opponent action prediction

Example:

```text
Predicted opponent action

Stay in        39%
Switch         34%
Attack         19%
Setup            8%
```

For switch predictions:

```text
Great Tusk     28%
Dragapult      12%
Rotom-W         9%
Other           7%
```

The exact categories should come from the current action model.

Do not invent probabilities merely for display.

---

### D. User action analysis

For each legal candidate action exposed by the current state:

```text
SWITCH → Blissey      +8.1
RECOVER               +6.4
TOXIC                 +4.7
PROTECT               +2.1
```

These should be model/evaluator results.

Do not call these "best move" unless the underlying system actually defines an ordering that justifies that wording.

Prefer:

- candidate utility
- expected utility
- search value
- confidence

when appropriate.

---

### E. Damage

Damage calculations must use the repository's authoritative mechanics/simulator layer.

Do not create a separate hand-written damage formula in the extension if the backend already has one.

Display:

- attacker
- defender
- move
- damage range
- KO / 2HKO information
- relevant hazards
- relevant status modifiers
- relevant field effects
- assumptions / uncertainty

Example:

```text
Earthquake
42–50%

Current HP: 63%

2HKO: likely
After Stealth Rock: higher pressure
```

If exact EV/item/moves are unknown, show assumptions explicitly.

---

### F. Resource pressure

Create a dedicated compact panel for:

#### HP pressure
- current HP
- recovery potential
- projected longevity where available

#### PP pressure
- known remaining PP
- inferred PP when appropriate
- depletion risk
- key-resource exhaustion

#### Hazard pressure
- entry damage
- hazard layers
- removal pressure

#### Status pressure
- poison/burn progression
- recovery interaction
- toxic escalation

#### Switch pressure
- likely safe switches
- entry costs
- forced-switch pressure

These are important because the StallMind objective is long-horizon resource denial, not only immediate HP advantage.

---

# 4. PredictionSnapshot contract

Prefer a single user-facing analysis contract that contains everything the frontend needs.

If the repository already has an equivalent type, extend/reuse it.

Conceptually:

```ts
interface PredictionSnapshot {
  battleId: string;
  turn: number;
  stateHash: string;

  active: {
    ours: PokemonSnapshot;
    opponent: PokemonSnapshot;
  };

  opponentBelief: {
    moves: ProbabilityEntry[];
    items: ProbabilityEntry[];
    abilities: ProbabilityEntry[];
    sets: ProbabilityEntry[];
    switches: ProbabilityEntry[];
    actions?: ProbabilityEntry[];
  };

  actions: {
    action: string;
    expectedUtility: number;
    confidence?: number;
    explanations?: Explanation[];
  }[];

  damage: DamageProjection[];

  resources: {
    hpPressure?: PressureMetric;
    ppPressure?: PressureMetric;
    hazardPressure?: PressureMetric;
    statusPressure?: PressureMetric;
    switchPressure?: PressureMetric;
  };

  objective?: {
    terms: Record<string, number>;
    total: number;
    objectiveVersion: string;
  };

  playerContext?: {
    elo?: number;
    gxe?: number;
    glicko?: number;
    source?: string;
  };

  provenance: {
    simulatorVersion: string;
    agentVersion: string;
    modelVersion?: string;
    objectiveVersion?: string;
  };
}
```

This is illustrative only. Reconcile it with the current repository.

---

# 5. Provenance and truthfulness

Every user-visible prediction should be traceable.

At minimum, the frontend should know:

- battle/session ID
- turn
- state hash
- simulator version
- agent version
- model version
- objective version
- source of player/rating information if used

Do not let the frontend silently merge:

- observed facts
- model inference
- counterfactual simulation

They should remain distinguishable.

Recommended visual labels:

- `KNOWN`
- `INFERRED`
- `HYPOTHESIS`
- `SIMULATED`

---

# 6. Real-time update strategy

Use a two-stage analysis if supported by the current architecture.

## Fast pass

Target roughly tens of milliseconds where practical:

- state reduction
- known information
- cached belief state
- deterministic damage
- cheap heuristics
- cached prediction

## Deep pass

Run asynchronously:

- belief update
- search
- counterfactuals
- deeper opponent modeling
- long-horizon evaluator

UI should update incrementally:

```text
Fast estimate
...
Deep search
...
```

Do not block the entire panel waiting for the deepest search.

If the existing backend already provides streaming or incremental results, reuse it.

---

# 7. "Why?" and counterfactuals

This should be a first-class feature.

For each candidate:

```text
Why this candidate?
```

Possible evidence:

- predicted opponent action distribution
- hazard state
- PP depletion
- status interaction
- recovery availability
- role preservation
- switch-entry cost
- long-horizon utility
- search agreement/disagreement

Also support:

```text
What happens if I choose Recover?
What happens if I choose Toxic?
What happens if I switch to Blissey?
```

The result should be a simulator/search-backed counterfactual, not an LLM-only explanation.

Example:

```text
Recover

Immediate HP:
+17

Expected 5-turn effect:
PP pressure: -0.8
Switch control: -0.14

Main downside:
Opponent-switch probability creates loss of current pressure.

Compared with Switch → Blissey:
Long-horizon evaluation is lower by 3.8.
```

Only show numbers that actually exist in the backend.

---

# 8. Prediction timeline / replay view

Reuse the same frontend for replay analysis.

Show:

```text
Turn | Model prediction | Actual | Correct?
-----+------------------+--------+---------
31   | Switch → Tusk    | Tusk   | yes
32   | Knock Off        | Knock  | yes
33   | Recover          | Toxic  | no
```

For probabilistic models, add calibrated metrics where available:

- log loss
- Brier score
- top-k accuracy
- calibration
- utility/regret measures

Do not rely on raw "prediction accuracy" alone.

---

# 9. Browser integration

Preferred architecture:

```text
Showdown page
    |
    v
Page/main-world bridge
    |
    v
content script
    |
    v
extension background/service worker
    |
    v
local analysis engine / API
    |
    v
PredictionSnapshot
    |
    v
React/UI
```

Important:

- observe only information legitimately available to the user
- preserve public/secret information boundaries
- never expose opponent-only hidden simulator state
- do not capture credentials, auth tokens, cookies, private chat, or unrelated page data
- do not automatically submit moves

Use the repository's current Showdown integration if one already exists.

If no integration exists, first implement a minimal protocol/state bridge before styling the complete UI.

---

# 10. Legal / product boundary

The extension is an analysis tool.

It must NOT:

- auto-click a move
- auto-select a switch
- auto-submit a battle choice
- exploit connection/timeout behavior
- read hidden opponent-only information
- steal session credentials
- interfere with unrelated Showdown traffic

The user remains responsible for selecting and submitting actions.

If current Showdown policies or technical constraints differ from assumptions here, follow the current documented rules and update the repository memory.

---

# 11. UI layout

Preferred initial layout:

```text
+--------------------------------------------------------------+
| STALLMIND                         Turn 37                    |
+-----------------------+--------------------------------------+
|                       | CURRENT ANALYSIS                     |
|   SHOWDOWN BATTLE     | Opponent: Gholdengo                 |
|                       | HP: 63%                             |
|                       |                                      |
|                       | MOVE PREDICTIONS                    |
|                       | Recover       41%                  |
|                       | Switch        34%                  |
|                       | Attack        19%                  |
|                       | Setup          6%                  |
|                       |                                      |
|                       | SWITCH PREDICTIONS                 |
|                       | Great Tusk   28%                  |
|                       | Dragapult    12%                  |
|                       |                                      |
|                       | YOUR ACTION CANDIDATES             |
|                       | Switch→Blissey     +8.1           |
|                       | Recover             +6.4           |
|                       | Toxic               +4.7           |
|                       |                                      |
+-----------------------+--------------------------------------+
| PP       | Hazards     | Status      | Damage           |
+--------------------------------------------------------------+
| [WHY] [COUNTERFACTUAL] [MOVESET] [PP] [TIMELINE]            |
+--------------------------------------------------------------+
```

Keep the panel compact enough that the actual battle remains usable.

Avoid covering critical Showdown controls.

---

# 12. Implementation priorities

Do not build every advanced feature at once.

## Milestone 1 — Live state

Build:

- battle detection
- protocol/state bridge
- canonical state synchronization
- compact panel
- HP/status/hazards/revealed information

No ML dependency required.

### Acceptance

A live battle can update the panel correctly turn-by-turn without manual refresh.

---

## Milestone 2 — Deterministic analysis

Add:

- damage calculation
- hazard-entry effects
- status effects
- PP display where available
- legal action display
- resource pressure

### Acceptance

Values match the authoritative simulator/domain implementation on test cases.

---

## Milestone 3 — Baseline prediction

Add:

- moveset inference
- item inference
- action prediction
- switch prediction
- confidence
- provenance

### Acceptance

Frontend displays real backend predictions without inventing/duplicating model logic.

---

## Milestone 4 — Search + explanations

Add:

- candidate utility
- search-backed recommendations
- "Why?"
- counterfactual
- prediction disagreement

### Acceptance

A user can inspect why a candidate is being favored and compare at least two actions.

---

## Milestone 5 — Timeline / replay

Add:

- prediction-vs-actual history
- per-turn snapshots
- replay mode
- basic metrics

### Acceptance

A completed battle can be inspected turn by turn with the same UI components.

---

## Milestone 6 — Research telemetry

Add optional opt-in telemetry:

```text
prediction
user action
opponent action
outcome
counterfactual
model version
objective version
```

Do not silently turn GUI usage into uncontrolled training.

Store raw events separately from curated training datasets.

---

# 13. Testing requirements

At minimum add tests for:

## State synchronization

- turn transitions
- switches
- fainting
- hazards
- status
- HP changes
- PP updates
- battle end
- rematch/new battle reset

## Information boundaries

- no hidden opponent data reaches UI
- no secret simulator fields accidentally serialized
- no credentials/auth/session data logged

## Analysis integrity

- state hash matches backend
- snapshot corresponds to the displayed turn
- stale predictions are discarded
- simulator/model versions are preserved

## UI

- no layout break at normal Showdown viewport sizes
- panel doesn't block critical controls
- long Pokémon/move names
- missing information
- low-confidence predictions
- disconnected backend
- slow backend
- battle ended
- unsupported format

---

# 14. Failure handling

The UI must degrade gracefully.

Examples:

### Backend unavailable

Show:

```text
Analysis engine unavailable
Battle state is still connected.
```

### Prediction timeout

Show the last valid prediction with:

```text
Stale — turn 37
```

Never silently display an old prediction as current.

### Unsupported format

Show:

```text
Analysis unavailable for this format.
```

### Incomplete state

Show missing fields explicitly instead of guessing.

---

# 15. Performance

Avoid running a full deep analysis on every DOM mutation.

Debounce or trigger analysis only on meaningful state changes:

- turn transition
- choice request
- active Pokémon change
- HP/status/hazard/PP change
- battle start/end

Cache by:

```text
battleId + turn + stateHash + objectiveVersion + agentVersion
```

Do not cache across incompatible simulator/model versions.

---

# 16. Future integration with self-improvement

The UI should eventually feed the same experience system used by the research engine.

Desired pipeline:

```text
live battle
    |
    v
immutable raw event log
    |
    v
validated decision points
    |
    v
curated dataset
    |
    v
training experiment
    |
    v
frozen benchmark
    |
    v
candidate model
    |
    v
promotion gate
```

Do not implement automatic self-promotion just because the GUI is recording data.

The GUI should record enough provenance to answer:

- which model made the prediction?
- which objective?
- which simulator version?
- what information was actually known?
- what did the human choose?
- what happened next?

---

# 17. Recommended repository placement

Adapt to the current repository.

Preferred shape if no frontend structure exists:

```text
apps/
  showdown-extension/
  analysis-server/

packages/
  battle-state/
  prediction-contracts/
  telemetry/
  pressure/
```

But reuse the repository's existing structure when one is already present.

Do not create duplicate packages for concepts already implemented.

---

# 18. Agent operating rules

### Rule 1
Inspect before implementing.

### Rule 2
Reuse existing domain models/contracts.

### Rule 3
Do not duplicate Pokémon mechanics in the browser.

### Rule 4
Do not infer hidden information from unavailable simulator data.

### Rule 5
Do not make the extension an auto-player.

### Rule 6
Keep backend prediction and frontend presentation separate.

### Rule 7
Every new prediction field needs provenance.

### Rule 8
Every user-visible probability must originate from a real model/calculation.

### Rule 9
Do not silently change objective weighting.

### Rule 10
Update repository memory when architecture or decisions change.

### Rule 11
Run relevant tests after each vertical slice.

### Rule 12
Do not refactor unrelated systems merely to make the frontend easier.

---

# 19. Definition of done for the first usable release

A user can:

1. Open Pokémon Showdown.
2. Start a supported battle.
3. Open the StallMind panel.
4. See the live synchronized battle state.
5. See legal candidate actions.
6. See opponent move/switch predictions if the model is available.
7. See simulator-backed damage.
8. See hazards/status/HP/PP pressure.
9. Inspect why a candidate is being evaluated highly.
10. See uncertainty and provenance.
11. See predictions update automatically as the battle progresses.
12. Finish the battle and inspect the prediction timeline.
13. Never have the extension automatically submit a move.

---

# 20. First coding-agent deliverable

Do not immediately implement the entire roadmap.

The first deliverable should be:

### `LIVE_STATE_VERTICAL_SLICE`

It should contain:

- repository discovery notes
- architecture decision note
- Showdown battle integration
- canonical state subscription/reducer
- minimal `PredictionSnapshot` or existing equivalent
- React/browser panel
- synchronized:
  - turn
  - active Pokémon
  - HP
  - status
  - hazards
  - revealed moves
- tests
- build instructions
- updated agent memory

At the end of the task, record:

```text
Implemented:
...

Files changed:
...

Existing systems reused:
...

New interfaces:
...

Tests:
...

Known limitations:
...

Next recommended task:
...
```

Do not claim a feature is implemented unless the repository actually contains the implementation and tests/build evidence.

---

# 21. Next-agent prompt

Use this as the initial instruction to a coding agent:

> Read `AGENTS.md`, `.agent-context.md`, `memory/`, and the repository README first.
>
> Then inspect the existing StallMind implementation and map:
> - simulator integration
> - canonical battle-state representation
> - prediction/search interfaces
> - telemetry
> - existing UI/API/frontend infrastructure
>
> Do not assume the handoff's illustrative names exist.
>
> Implement the `LIVE_STATE_VERTICAL_SLICE` described in `docs/` or this handoff by integrating with the existing architecture rather than duplicating it.
>
> First establish the smallest end-to-end path:
>
> `Showdown → battle/protocol bridge → canonical state → UI panel`
>
> Then add only the currently-supported state fields:
>
> `turn, active Pokémon, HP, status, hazards, revealed moves`
>
> Keep all unknown/inferred information explicitly classified.
>
> Do not implement auto-play.
>
> Run the repository's existing checks, add focused tests for the new slice, and update project memory with what was discovered and implemented.
>
> When done, report the changed files, tests run, known limitations, and the exact next task.

---

## Final implementation principle

The extension is not the AI.

It is the **observable, debuggable interface to the AI**.

The research engine remains responsible for:

- game state
- mechanics
- beliefs
- prediction
- search
- evaluation
- team optimization
- self-improvement

The extension remains responsible for:

- live observation
- user presentation
- explanation
- counterfactual inspection
- replay visualization
- optional user-controlled telemetry

That separation should survive future model changes.
