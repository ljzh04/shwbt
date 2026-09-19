# Agent Memory Protocol

This file defines how coding agents maintain continuity.

## Three kinds of memory

### Current state

`memory/CURRENT_STATE.md`

Facts about implemented code that have been verified.

### Decisions

`memory/DECISIONS.md`

Choices that constrain future architecture.

### Experiments

`memory/EXPERIMENT_LOG.md`

Measured results, including rejected approaches.

## Update triggers

Update memory when:

- a package becomes implemented
- a contract/schema changes
- a simulator behavior is verified
- an architecture decision is made
- an experiment produces measured evidence
- a task becomes blocked/unblocked

## Never record

- guesses as facts
- tests not actually run
- unverified simulator behavior
- a model as "better" without the benchmark result
- a TODO as "implemented"

## Session closeout format

A coding agent should leave:

```text
Implemented:
- ...

Verified:
- command → result

Known limitations:
- ...

Next:
- exact next work item
```
