# Data Model

## Principle

Store the **decision point**, not just the replay. A replay tells us what happened. A learning system needs to know what was known, which actions were legal, what the agent believed, what it chose, what happened next, and how the position changed.

## Entity graph

```text
format
  ├── experiment
  │      ├── agent_version
  │      ├── objective_version
  │      └── evaluation_run
  ├── replay
  │      └── battle
  │            ├── participant
  │            └── decision_point*
  └── dataset_version

team
  ├── team_member*
  ├── team_tag*
  └── team_evaluation*

pokemon_belief
  ├── move_hypothesis*
  ├── set_hypothesis*
  └── item/ability hypotheses
```

## Decision point minimum fields

```json
{
  "decision_id": "uuid",
  "battle_id": "uuid",
  "turn": 37,
  "actor": "p1",
  "format_id": "genX-format",
  "simulator_commit": "git-sha",
  "state_hash": "sha256",
  "state": {},
  "legal_actions": [],
  "belief": {},
  "candidate_scores": [],
  "search": {},
  "chosen_action": {},
  "realized_opponent_action": {},
  "transition": {},
  "objective_delta": {},
  "timestamp": "..."
}
```

## Canonical state

The state model should include at least:

- turn number
- weather / terrain / room effects
- side conditions
- hazards and hazard removal state
- active Pokémon for each side
- known HP / status / boosts
- known moves and remaining PP
- revealed abilities/items
- fainted Pokémon
- team order / unrevealed slots
- volatile effects
- field effects
- available choices
- information provenance

Never represent hidden information as if it were known. Use explicit belief distributions.

## Belief model

```json
{
  "pokemon": {
    "slot": "p2a",
    "species": "Example",
    "set_hypotheses": [
      {
        "set_id": "dataset-set-123",
        "probability": 0.61,
        "evidence": ["leftovers", "revealed-recover"]
      },
      {
        "set_id": "dataset-set-789",
        "probability": 0.39,
        "evidence": ["speed-check"]
      }
    ],
    "move_beliefs": {
      "moveA": 0.98,
      "moveB": 0.52,
      "moveC": 0.17
    }
  }
}
```

## Objective telemetry

For every action store the feature deltas:

- opponent PP lost
- own PP lost
- opponent HP delta
- own HP delta
- opponent remaining healthy resources
- forced switch indicator
- switch cost inflicted
- hazards gained/removed
- status applied/removed
- win-condition progress
- information gained
- uncertainty reduced
- risk of immediate collapse
- expected future annoyance

## Storage split

### PostgreSQL
Use for transactional metadata, experiment lineage, compact battle summaries, and queryable decision points.

### Parquet
Use for large feature matrices and training datasets.

Recommended partition keys:

```text
format_id / dataset_version / agent_version / split
```

### Raw files
Keep immutable raw replays/protocol streams separately. Store their content hash in the database.

## Dataset splits

Never randomly split individual turns from the same battle across train/test.

Use battle-level or replay-level separation. For opponent generalization, also maintain:

- unseen battles
- unseen teams
- unseen team builders
- temporal holdout
- adversarially generated holdout

## Collection provenance additions

Every decision point and team must be traceable to the run/agent/objective/simulator context that produced it. Decision points also distinguish `outcome_source: observed` from `outcome_source: simulated`.

This is required because the long-running collector intentionally produces both normal battle experience and counterfactual search data.
