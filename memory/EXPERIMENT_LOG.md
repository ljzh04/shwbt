# Experiment Log

Append one entry per meaningful measured experiment.

## Entry template

```yaml
id: EXP-YYYYMMDD-XXX
status: running|complete|rejected
question: ""
simulator_commit: ""
format_id: ""
objective_config: ""
agent_version: ""
dataset_version: ""
seed: 0
budget:
  battles: 0
  search_nodes: 0
results:
  win_rate: null
  avg_turns: null
  pp_depletion: null
  forced_switches: null
  catastrophic_loss_rate: null
calibration:
  brier: null
notes: ""
decision: "promote|reject|continue|inconclusive"
```

## Experiments

### EXP-20260919-001

```yaml
id: EXP-20260919-001
status: complete
question: "Does a deterministic preservation heuristic (critical/low-HP switching to a healthy bench; finish-rule attacking) measurably improve win rate or reduce catastrophic losses versus baseline-v1 on frozen OU campaigns?"
simulator_commit: "2ddfa0476f8207e12e204b1c69f7c7683b17633c"
format_id: "gen9customgame"
objective_config: "default stall objective vector"
agent_version: "preserving-stall-v1"
dataset_version: null
seed: "1337, 4242, 909, 2024"
budget:
  battles: 8
  search_nodes: 0
results:
  win_rate: 0.0 (frozen-ou-v1) / 0.5 (frozen-ou-v2) — identical to control in both arms
  avg_turns: 24 on both frozen-ou-v1 scenarios; longer horizons on frozen-ou-v2
  pp_depletion: null
  forced_switches: null
  catastrophic_loss_rate: 0.0 / 0.25 — identical to control
calibration:
  brier: null
notes: >
  Candidate `preserving-stall-v1` runs `chooseCandidateFrom` overrides on top of baseline-v1.
  On frozen-ou-v1 (maxTurns 25) both arms end at max_turns@24 with one faint each side on every
  scenario — the cap is too short to discriminate. frozen-ou-v2 (stall-vs-balance 120-turn
  scenarios plus Meowscarada-BO-vs-stall 80-turn scenarios in both directions) resolves:
  stall loses catastrophically to BO in the guard scenario (own 0 fainted, foe 4), wins the
  long balance scenario (own 0, foe 6), and the BO-driven scenario ends as a BO win. Candidate
  and control produce byte-identical scenario outcomes in both campaigns: the preservation
  heuristic changed no decision outcome on these seeds. No measured regression, no measured gain.
decision: "reject" # do not promote preserving-stall-v1: zero measured delta
```

Follow-up intent: a discriminating campaign needs scenarios where a low-HP switch decision actually changes the outcome (e.g., forced-switch pressure / knockout differential), or policy-side opponents with varied switch seeds so deterministic-vs-deterministic lockstep does not mask behavior changes.

### EXP-20260919-002

```yaml
id: EXP-20260919-002
status: complete
question: "With agent-visible HP restored, does preserving-stall-v1 measurably change win rate / catastrophic losses vs baseline-v1 on frozen-ou-v2?"
simulator_commit: "2ddfa0476f8207e12e204b1c69f7c7683b17633c"
format_id: "gen9customgame"
objective_config: "default stall objective vector"
agent_version: "preserving-stall-v1"
dataset_version: null
seed: "1337, 4242, 909, 2024"
budget:
  battles: 8
  search_nodes: 0
results:
  win_rate: 0.25 (candidate) vs 0.5 (control)
  avg_turns: null
  pp_depletion: null
  forced_switches: null
  catastrophic_loss_rate: 0.0 (candidate) vs 0.25 (control)
calibration:
  brier: null
notes: >
  EXP-20260919-001's zero delta was a measurement artifact: the protocol reducer discarded the
  `|request|` `condition` fields (the only HP source in this Showdown build), so every active
  Pokemon tracked hp=0/maxHp=0, `hpFraction` guarded to 1, and no candidate override could fire.
  Fix: `applyRequestRoster`/`applyRequestRosterFromJson` on the reducer + regression test
  (tests/simulator.test.ts). After the fix, the trace shows structuralIntegrity switches and
  winProgress finishes firing; frozen-ou-v2 now discriminates: the candidate's preservation
  switches remove the BO-vs-stall catastrophic sweep (0.25 -> 0.0) but cost a BO-side win and the
  stall mirror win (winRate 0.5 -> 0.25). Gate prints KEEP: winRate delta is negative and below
  the 0.25 promotion threshold. Monotonic stall-team preservation is therefore not obviously
  better on the objective; investigate rule interaction (healthy-bench requirement, finish rule,
  hazard tempo) before a v3.
decision: "reject" # measurable but win-rate-negative; keep observing, refine rules
```