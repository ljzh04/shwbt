# Evaluation

## 1. The agent needs multiple scoreboards

### Battle outcome

- win rate
- loss rate
- draw / timeout category if applicable

### Stall effectiveness

- median turns
- opponent PP depletion
- opponent recovery PP depletion
- forced switches
- average switch-in cost
- status turns
- hazards maintained
- number of preserved emergency answers

### Safety

- catastrophic loss rate
- average irreversible resource loss
- one-turn collapse frequency

### Prediction

- action log loss
- Brier score
- top-k accuracy
- calibration error
- hidden-set accuracy

### Efficiency

- decisions/sec
- simulator branches/sec
- memory per battle
- median decision latency
- p95 decision latency

## 2. Never evaluate on training battles

Split by battle/replay, not by turn.

Recommended sets:

```text
TRAIN
VALIDATION
TEMPORAL_HOLDOUT
UNSEEN_TEAM_HOLDOUT
ADVERSARIAL_HOLDOUT
```

## 3. Baselines

At minimum compare against:

1. random legal action
2. simple stall heuristic
3. one-ply evaluator
4. belief-aware one-ply
5. search agent
6. learned prediction + search

The project must be able to show the incremental contribution of each component.

## 4. Statistical reporting

Every comparison should report:

- number of battles
- randomization seed policy
- opponent pool
- confidence interval or bootstrap interval
- paired comparison where the same starting states can be used

Avoid making claims from small tournament-style samples.

## 5. Ablations

For a prediction model, remove one component at a time:

```text
no player model
no team prior
no hidden-set model
no information gain
no PP value
no annoyance term
```

If removing a feature changes nothing, do not assume it is useful.

## 6. Primary research benchmark

A useful primary benchmark is:

> Given a fixed target format, a fixed opponent distribution, and a fixed compute budget, does adding a component increase long-horizon position quality without materially increasing catastrophic losses?

This is more informative than asking whether the bot has the highest single-run win rate.
