# teamlab

Team generation and evolutionary optimization.

## Pipeline

```text
import seeds
  ↓
normalize sets
  ↓
validate against format
  ↓
assign descriptive role tags
  ↓
build compatible populations
  ↓
benchmark
  ↓
select diverse candidates
  ↓
mutate / role-crossover
  ↓
adversarial evaluation
  ↓
archive Pareto-efficient candidates
```

## Important constraint

Do not allow the optimizer to optimize directly against the same opponent sample used for final evaluation. Keep benchmark pools frozen.
