# Failure Modes and Defenses

## 1. Simulator/version drift

**Symptom:** old experiments cannot be reproduced.

**Defense:** pin a commit and record it in every experiment/dataset manifest.

## 2. Information leakage

**Symptom:** the model performs extremely well offline but fails when actually restricted to public information.

**Defense:** maintain a strict agent-visible state; test known hidden-information fixtures.

## 3. Self-play imitation collapse

**Symptom:** the policy becomes extremely confident in its own mistakes.

**Defense:** maintain historical, scripted, adversarial, and high-regret data sources.

## 4. Long-battle degeneracy

**Symptom:** the agent maximizes turns while throwing away position quality or losing.

**Defense:** separate turn count from resource denial, structural integrity, win progress, and catastrophic risk.

## 5. Dataset duplication

**Symptom:** evaluation looks unrealistically good because near-identical battle trajectories appear in train/test.

**Defense:** split by battle/group hash, not individual rows.

## 6. Counterfactual contamination

**Symptom:** simulated alternative outcomes are treated as observed opponent behavior.

**Defense:** store `outcome_source = observed | simulated` and keep both in provenance.

## 7. Search cache corruption

**Symptom:** search returns impossible or inconsistent values.

**Defense:** include every state-relevant hidden/public component in the cache key and never mutate parent states.

## 8. Team optimizer overfitting

**Symptom:** one team dominates on the internal population but collapses on unseen opponents.

**Defense:** frozen holdouts, adversarial counterteams, diversity constraints, and multi-seed evaluation.

## 9. Prediction calibration failure

**Symptom:** the model claims 90% confidence and is frequently wrong.

**Defense:** reliability diagrams/Brier score/calibration error; down-weight overconfident hypotheses.

## 10. Collector crash/data corruption

**Symptom:** long-running job loses many battles or creates half-written files.

**Defense:** atomic batch writes, checkpoint IDs, file rotation, heartbeats, retries, quarantine.

## 11. Resource blow-up

**Symptom:** raw logs or search branches consume all disk/RAM.

**Defense:** bounded branch budgets, file rotation, retention, streaming writes, and explicit resource metrics.

## 12. Live-policy contamination

**Symptom:** online/live behavior silently enters the benchmark or training set before review.

**Defense:** source-tag all observations and require explicit ingestion into training snapshots.
