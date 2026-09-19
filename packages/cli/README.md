# cli

Proposed commands:

```bash
stallai validate-config
stallai sim smoke-test
stallai replay ingest ./data/raw/example.log
stallai battle self-play --games 1000
stallai evaluate --agent baseline-v1 --benchmark frozen-v1
stallai team evolve --objective annoyance --generations 100
stallai dataset export --split train
stallai report experiment EXP_ID
```

The CLI should make every experiment reproducible from a config file.
