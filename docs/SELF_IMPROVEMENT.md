# Self-Improvement Loop

## Principle

Self-improvement must be an explicit experiment loop, not "let the bot retrain on everything it did."

```text
experience
    ↓
quality control
    ↓
feature dataset
    ↓
train candidate model / adjust heuristic
    ↓
freeze candidate
    ↓
evaluate against frozen benchmark
    ↓
compare confidence intervals
    ↓
promote or reject
```

## 1. Experience generation

Generate experience from:

- historical replays
- self-play
- current policy vs baseline
- policy vs random legal agent
- policy vs scripted archetypes
- policy vs adversarially evolved teams

## 2. Prevent feedback collapse

Do not train exclusively on the current agent's own decisions.

Maintain a mixture:

```text
30% historical human data
30% diverse self-play
20% adversarial play
10% scripted benchmark opponents
10% difficult / high-loss replay mining
```

These percentages are starting points, not permanent constants.

## 3. Hard-example mining

Prioritize states where:

- candidate agents disagree
- old policy loses but another policy survives
- prediction confidence was high and wrong
- action regret is high
- the team collapses within N turns
- opponent spends unusually little PP despite long games
- a hidden set is misclassified

## 4. Counterfactual learning

For a saved decision point, simulate alternative actions when possible.

```text
actual action → actual outcome
alternative A → simulated outcome
alternative B → simulated outcome
```

This supplies action comparisons even when only one action occurred in the real battle.

Important: simulated counterfactuals must be labeled as simulated, not observed.

## 5. Regret signal

```text
regret(actual)
  = max_a Q(state, a) - Q(state, actual)
```

Use it to find decision points worth analyzing.

## 6. Model promotion

Candidate model becomes production only when:

- benchmark win-rate does not regress beyond threshold
- annoyance objective improves on target slices
- calibration improves or stays within tolerance
- catastrophic-loss rate does not increase beyond threshold
- performance cost remains within budget

The system should support "no promotion". A newer model is not automatically better.

## 7. Versioning

Version:

```text
agent
model
objective
simulator
team population
dataset
feature extractor
```

Every recorded battle references all six.

## 8. Drift detection

Monitor:

- opponent set frequencies
- move frequencies
- team archetypes
- damage patterns
- prediction calibration
- action distribution

A new metagame snapshot should trigger evaluation, not silent retraining.
