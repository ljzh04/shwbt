# Scripts

Scripts are grouped by purpose.

## Operational commands planned

```bash
stallai sim smoke-test
stallai battle self-play --games 1000 --config configs/system.yml
stallai collect selfplay --config configs/system.yml
stallai dataset validate <manifest>
stallai dataset export --split train
stallai evaluate --agent baseline-v1 --benchmark frozen-v1
stallai train candidate --dataset <dataset-id>
stallai promote --candidate <candidate-id>
```

The exact CLI surface can evolve, but the semantics should remain:

- collection may be unattended;
- dataset creation is versioned;
- evaluation uses frozen benchmarks;
- promotion is explicit/gated.
