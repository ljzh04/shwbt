# Implementation Notes

## 1. Use the simulator as an oracle

The upstream simulator is explicitly documented as a JavaScript library with `BattleStream`, and it also supports standard-I/O usage. This makes it suitable as the authoritative transition model for both live decisions and offline branching.

## 2. Pin the upstream code

The upstream `master` branch changes. Every experiment must store the exact commit SHA. A moving dependency can change mechanics and silently invalidate old results.

## 3. Avoid raw protocol leakage

Only `packages/simulator` should parse simulator protocol messages. The engine should receive typed domain events/state.

## 4. Search-state cloning

First implementation options, in descending preference:

1. exact simulator clone/snapshot
2. deterministic replay to a decision point with cached protocol prefix
3. isolated simulator subprocess per branch

Do not implement a simplified damage simulator as a substitute for the real engine.

## 5. Performance strategy

Measure before optimizing.

Likely hot path:

```text
branch → simulator transition → state extraction → evaluation
```

Cache:

- canonical state hash
- legal action set
- static team/set metadata
- normalized damage/KO information

Do not cache anything that can depend on hidden branch state without including the hidden-state component in the cache key.

## 6. Learned models are advisory

A model predicts. The simulator decides what is legal and what actually happens. The policy/search layer consumes predictions but remains capable of operating with deterministic fallbacks.

## 7. LLM usage

An LLM may be useful for:

- labeling / summarizing replay patterns
- proposing new team mutations
- generating human-readable experiment reports

Do not put an LLM in the authoritative battle-decision loop until its output is constrained, benchmarked, and latency-bounded.
