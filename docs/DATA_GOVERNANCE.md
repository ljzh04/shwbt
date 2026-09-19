# Data Governance

## Principle

Collected gameplay data is an experiment artifact. Never overwrite raw evidence merely to make a parser work.

## Provenance

Every dataset version must identify:

- source type
- simulator commit
- parser version
- state schema version
- feature version
- objective version
- agent/build version
- collection run IDs
- source battle IDs
- split policy
- content hash

## Privacy / identity minimization

Public gameplay data may contain usernames and room metadata. Do not make identity analysis part of the system unless it is required for a demonstrated research purpose.

Prefer:

```text
stable anonymized actor ID
```

over storing raw usernames in training features.

## Leakage prevention

The following are prohibited in agent-visible state:

- opponent-only exact HP when not publicly known
- unrevealed opponent item
- unrevealed opponent moves
- unrevealed opponent ability
- server-side hidden RNG outcomes
- omniscient simulator state

The raw simulator process may know these values. The production policy must not.

## Split policy

Freeze holdout battles by battle hash before training starts. Repeated versions of the same battle must remain in the same split.

Do not randomly split individual decision points from one battle across train/test. That would leak near-identical trajectories across splits.

## Dataset retention

Raw data may be retained longer than derived features because new parsers can regenerate features. Derived datasets should be reproducible from manifests and source hashes.
