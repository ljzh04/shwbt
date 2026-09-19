# Automatic Logging and Self-Improvement Data Pipeline

## Answer to the core question

Yes. The system should support a mode where the developer starts a collector and leaves it running for hours or days to accumulate simulator experience.

The crucial distinction is:

> **Automatic data collection is safe to automate. Automatic belief in that data is not.**

The collector must not directly train a production model from whatever it happened to generate.

## Long-running pipeline

```text
┌──────────────────────┐
│ battle generator     │
│ self-play/adversary  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ immutable raw log    │ ← restart-safe, append-only
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ parser + validator   │ ← protocol/state validation
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ decision extractor   │ ← one record per decision point
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ QC + dedupe          │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ dataset snapshot     │ ← versioned manifest + hashes
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ candidate training   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ frozen benchmark     │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ promotion gate       │ ← human/explicit automation policy
└──────────────────────┘
```

## What to log per battle

At minimum:

- battle ID
- run ID / worker ID
- simulator commit
- format/ruleset/mod
- seed, where applicable
- agent build hash
- objective config hash
- team IDs/hashes
- opponent generator ID
- start/end timestamps
- final result
- turn count
- full raw simulator output or an immutable content-addressed reference

Avoid storing unnecessary identity information. For public/online observations, prefer hashed/anonymized actor IDs or omit usernames when not needed for the research objective.

## What to log per decision point

- battle ID
- turn / phase
- normalized agent-visible state hash
- serialized state reference
- legal actions
- candidate actions considered
- belief snapshot hash
- opponent action distribution
- action chosen
- evaluator score/vector for each candidate
- search budget and nodes visited
- model versions
- objective version
- observed next-state outcome
- action-selection latency
- whether outcome was observed or simulated

## Data tiers

### Tier 0 — raw

Exact simulator/protocol output. Immutable. Never edited in place.

### Tier 1 — normalized

Parsed and state-reconstructed records. Regenerable from Tier 0.

### Tier 2 — experience

Decision-point examples after validity checks, dedupe, missing-field checks, and information-boundary checks.

### Tier 3 — training snapshot

A frozen, versioned dataset manifest used by a specific training run.

### Tier 4 — evaluation / holdout

Never used for training. Frozen until the evaluation campaign ends.

## Quality gates

Reject/quarantine records when:

- state reconstruction fails
- legal actions disagree with simulator output
- agent-visible state contains hidden opponent information
- hashes/lineage are incomplete
- duplicate decision points appear under the same provenance
- battle ended abnormally without a valid reason classification
- reward/features are NaN/inf/out of allowed range
- counterfactual and observed outcomes are mixed

## Self-play does not equal ground truth

A self-play battle tells you what happened under the current policies. It does not prove that the chosen action was optimal.

Therefore collect:

- action actually chosen
- simulator outcome
- alternative-action counterfactuals when available
- teacher/baseline action when a stronger reference exists
- regret estimate where a search oracle is available

This makes the dataset useful for policy improvement rather than imitation of its own mistakes.

## Preventing feedback collapse

Do not let the dataset become 100% "what the latest bot already believes".

A practical starting mixture is:

- historical human decisions: 30%
- diverse self-play: 30%
- adversarial policy/team play: 20%
- scripted benchmark opponents: 10%
- hard-example/high-regret states: 10%

These are starting quotas, not immutable truths. Track actual composition in each dataset manifest.

## Long-running collector requirements

The collector should:

- checkpoint progress
- recover after process restart
- atomically finish files before indexing them
- write checksums
- expose health/heartbeat information
- enforce disk retention limits
- rotate raw files
- avoid holding all battle state in RAM
- record a run manifest
- support graceful shutdown
- quarantine malformed battles instead of terminating the worker

## Suggested modes

```text
collector selfplay
collector replay-ingest
collector adversarial
collector benchmark
collector live --explicitly-enabled
```

`live` must not be the default.

## Training automation

A safe unattended setup is:

```text
always-on collector
      ↓
nightly dataset compaction
      ↓
nightly candidate training
      ↓
automated frozen benchmark
      ↓
report candidate metrics
      ↓
NO automatic promotion by default
```

For an experimental branch, promotion can later be automated if the exact gate is encoded and rollback is guaranteed.
