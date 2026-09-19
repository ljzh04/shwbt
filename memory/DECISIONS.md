# Architectural Decisions

## D001 — Showdown is the rules oracle

**Status:** accepted

Do not implement a second battle mechanics engine. All action consequences come from the exact Showdown simulator.

**Reason:** correctness and reproducibility dominate convenience.

## D002 — Start with transparent search + evaluation

**Status:** accepted

The first useful agent is deterministic/search-based. Learned models are introduced only after a benchmark identifies a measurable deficiency.

**Reason:** avoids training opaque models on bad state/reward definitions.

## D003 — Auto-logging is a first-class subsystem

**Status:** accepted

The collector continuously records raw events and decision points for later dataset generation.

**Reason:** unattended self-play is one of the cheapest sources of experience, but raw telemetry must remain distinct from trusted training data.

## D004 — No automatic model promotion

**Status:** accepted

Training can be automated; production promotion requires frozen benchmark comparison.

**Reason:** prevents feedback collapse and accidental regressions.

## D005 — Separate raw, normalized, and training data

**Status:** accepted

```text
raw → normalized → quality-filtered → training snapshot
```

**Reason:** permits reprocessing when feature/schema logic changes.

## D006 — Separate team optimization from battle policy optimization

**Status:** accepted

Teams evolve on a slower evaluation loop than move selection.

**Reason:** prevents the search problem from becoming intractable and makes attribution possible.

## D007 — Annoyance is a vector, not a single heuristic

**Status:** accepted

Examples: PP depletion, forced switches, status pressure, hazards, information gain, structural integrity, win progress, decision burden.

**Reason:** "longer battle" alone rewards degenerate behavior.

## D008 — Counterfactuals are separately labeled

**Status:** accepted

Observed outcomes and simulator-generated alternative outcomes must never be mixed without provenance.

**Reason:** counterfactuals are useful but are not evidence that the opponent actually chose those actions.

## D009 — Search/learning frontier stays deferred behind benchmark gate

**Status:** deferred (records direction, not commitment)

Candidate iterations for later builds:

- **MCTS** over simulator-backed branches, guided by current belief distributions and stall objective vector.
- **Expectiminimax** with chance nodes from opponent action beliefs and CVaR tail-risk penalties.
- **Learned value/policy nets** (position value, action predictor) trained on versioned datasets, promoted only via frozen benchmark (D002/D004).
- **Prediction calibration loop** feeding prediction-vs-actual timeline back into opponent model priors.

**Prerequisites before any of it:** exact branch/restore cheaper than command replay, full protocol coverage, frozen benchmark campaign, dataset scale beyond self-play baselines.

**Reason:** search depth and learned models amplify state/reward errors; foundation must be concrete first.

## D010 — Firefox MV3 extension target, Gen 9 OU focus

**Status:** accepted

The browser target is Firefox MV3. The competitive focus is Generation 9 OU (`target_format: OU`, `generation: 9`).

**Reason:** single browser target keeps the bridge thin; format pin unblocks reproducible experiments.
