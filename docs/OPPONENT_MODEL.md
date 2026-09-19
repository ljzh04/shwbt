# Opponent Model

## Goal

Predict three things separately:

1. hidden set configuration
2. immediate legal action
3. longer-term behavior tendencies

Do not collapse these into one black-box model.

## 1. Hidden-set model

Prior sources:

- curated historical sets
- usage frequencies for the target format/period
- team-level co-occurrence
- observed item/ability/move combinations

Update on evidence:

```text
P(set | evidence) ∝ P(evidence | set) P(set)
```

Evidence examples:

- item reveal
- ability reveal
- move reveal
- damage range
- speed comparison
- status immunity
- team composition
- switch choices

## 2. Action model

Predict probabilities over legal actions.

Features:

- current HP
- KO threats
- revealed moves
- opponent active Pokémon
- likely switch-ins
- hazard pressure
- status
- previous turn sequence
- remaining recovery PP
- known player behavior

Baseline:

- rule-generated action likelihoods
- smoothed historical frequencies
- epsilon floor to avoid assigning exact zero to plausible actions

Later:

- gradient-boosted classifier
- transformer over action history
- calibrated probability model

Calibration matters more than raw accuracy because probabilities feed search.

## 3. Player behavior model

Keep player-specific behavior separate from species/set priors.

Possible features:

```text
switch_after_damage
stay_in_when_low
aggressive_double_switch
protect_frequency
setup_frequency
risk_tolerance
repetition_rate
```

Use only when enough battle data exists. Otherwise fall back to population-level priors.

## 4. Information value

The best action is sometimes the action that reveals an unknown.

Define expected information gain:

```text
IG(a) = H(Belief_before) - E[H(Belief_after | a)]
```

For example, a safe Protect may reveal whether an opponent is using a choice item or a contact/status interaction. The agent should account for this if it materially changes later decisions.

## 5. Anti-overfitting rules

- never identify a set solely because it is common
- keep unknown/other hypotheses
- never train and test on the same replay
- report calibration curves
- track prediction entropy
- evaluate on temporally later data separately

## 6. Prediction telemetry

At every decision point save:

```text
predicted distribution
realized action
Brier score
log loss
top-1 correctness
calibration bin
belief entropy
```

This allows you to determine whether prediction quality actually improves play.
