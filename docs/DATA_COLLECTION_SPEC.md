# Data Collection Specification

## Event envelope

Every stored event should have a common envelope conceptually equivalent to:

```json
{
  "schema_version": "event.v1",
  "event_id": "content-addressed-id",
  "run_id": "run-...",
  "battle_id": "battle-...",
  "sequence": 123,
  "timestamp": "2026-09-19T00:00:00Z",
  "source": "selfplay",
  "simulator_commit": "...",
  "format_id": "...",
  "agent_version": "...",
  "team_hash": "...",
  "payload_type": "protocol|decision|outcome|heartbeat",
  "payload": {}
}
```

The exact TypeScript type belongs in `packages/storage`.

## Battle lifecycle

```text
run_started
battle_started
protocol_event*
decision_point*
battle_finished
battle_quality_result
run_checkpoint
```

## Decision lifecycle

```text
state_received
belief_updated
legal_actions_extracted
candidates_scored
search_finished
action_selected
action_submitted
outcome_observed
```

## Heartbeats

The collector should emit periodic heartbeat events containing:

- run ID
- worker ID
- battles completed
- battles failed
- decision points written
- bytes written
- last successful write time
- current simulator commit

## Idempotency

Use deterministic IDs or content hashes so retries do not duplicate records.

A battle write should be safely repeatable.
