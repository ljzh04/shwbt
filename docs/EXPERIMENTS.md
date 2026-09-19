# Experiment Registry Template

Copy this template per experiment.

```yaml
experiment_id: EXP-YYYYMMDD-NNN
hypothesis: "..."

format:
  id: "..."
  simulator_commit: "..."

agents:
  control: "..."
  treatment: "..."

objective:
  config: "configs/objectives.yml"
  version: "..."

search:
  depth: 1
  beam_width: 1
  opponent_branch_width: 1

population:
  source_dataset: "..."
  opponent_pool: "..."
  team_pool: "..."

seeds:
  mode: fixed
  value: 1337

metrics:
  primary:
    - win_rate
    - annoyance
  secondary:
    - opponent_pp_depletion
    - forced_switch_value
    - catastrophic_loss_rate
    - decision_latency

splits:
  train: "..."
  validation: "..."
  test: "..."

promotion:
  minimum_battles: 1000
  max_catastrophic_regression: 0.01
```

## Experiment naming

Use descriptive, immutable names:

`E04-belief-beam8-annoyance-v2`

Never overwrite experiment results.
