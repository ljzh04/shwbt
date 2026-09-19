# Decision Engine

## 1. Objective

We are not optimizing a single scalar named "win rate". The agent maximizes an explicit objective under uncertainty.

Base decomposition:

```text
J(s,a) = E[V(s')]
       + λ_annoy * A(s,a)
       + λ_info * I(s,a)
       - λ_risk * R(s,a)
       + λ_win * W(s,a)
```

Where:

- `V`: long-horizon position value
- `A`: annoyance/resource-denial value
- `I`: information value
- `R`: collapse / downside risk
- `W`: probability or progress toward winning

The scalarization is configuration, not hard-coded doctrine.

## 2. Position value

Recommended feature groups:

### Survival
- total team HP, but weighted by recoverability
- number of viable switch-ins
- status burden
- hazard vulnerability

### Resources
- remaining PP of critical moves
- recovery PP
- hazard-control PP
- opponent recovery PP
- finite-resource asymmetry

### Board control
- hazards
- removal availability
- status pressure
- speed control
- weather/terrain
- setup denial

### Structural integrity
- number of answers to each known threat
- number of unrevealed potential threats
- preserved emergency checks
- win conditions remaining

### Information
- number of revealed moves
- identified item
- identified ability
- set posterior entropy
- opponent switch preferences

## 3. Annoyance score

Do not use raw battle duration as the main signal.

A useful decomposition is:

```text
A =
  w_pp       * normalized_opponent_pp_depletion
+ w_switch   * forced_switch_value
+ w_status   * persistent_status_pressure
+ w_hazard   * repeat_switch_cost
+ w_denial   * recovery/setup denial
+ w_info     * uncertainty_created_or_exploited
+ w_decision * opponent decision burden
- w_sacrifice * unnecessary own-resource loss
```

`decision burden` must not mean delaying the opponent or exploiting platform mechanics. It means creating multiple strategically relevant responses in the game position.

## 4. Action generation

Generate all legal actions from Showdown. Then prune using strategic dominance.

Keep at least:

- all legal switches
- all recovery moves
- all status moves
- all hazard/control moves
- all moves that KO or prevent a KO
- all high-information actions
- the current policy's top `k` candidates

Never prune an action solely because its immediate damage is low.

## 5. Search levels

### Stage A — one-ply

```text
for action in legal_actions:
    simulate(action)
    score(result)
```

### Stage B — opponent-response beam search

For each candidate, branch over the top `m` opponent actions under the belief model.

```text
root
 ├─ our action A
 │   ├─ opp response 1
 │   ├─ opp response 2
 │   └─ opp response 3
 ├─ our action B
 │   ├─ ...
 └─ our action C
```

### Stage C — rollout / MCTS

Use when the value of delayed consequences justifies the compute cost.

Do not use raw rollout win rate as the only reward because stall value is long-horizon and resource-based.

## 6. Expected value under beliefs

For hidden opponent action `o`:

```text
Q(a) = Σ P(o | state, opponent_model) * V(T(state, a, o))
```

For hidden set `h`:

```text
P(h | evidence) ∝ P(evidence | h) P(h)
```

The implementation can start with a Bayesian/heuristic model and later replace likelihood terms with learned predictors.

## 7. Risk handling

Stall cannot accept arbitrarily high variance merely because its median annoyance is good.

Track:

- immediate KO probability
- number of switch-ins after failure
- irrecoverable PP commitments
- forced sack probability
- threat escape probability

Use a risk-adjusted objective:

```text
adjusted_value = expected_value - cvar_weight * tail_loss
```

CVaR is preferable to a simple average when experimenting with deliberately annoying play because some lines are catastrophic even if their average looks good.

## 8. Explanation output

Every decision should produce machine-readable reasons.

Example:

```json
{
  "action": "switch:p1b",
  "top_factors": [
    ["preserve_emergency_check", 0.41],
    ["predicted_special_move", 0.27],
    ["opponent_recovery_pp_low", 0.19],
    ["maintain_toxic_cycle", 0.13]
  ]
}
```

This is not an LLM explanation. It is derived from evaluator features.
