# Team Lab

## 1. Representation

A team is a fixed six-slot vector with each slot containing a complete legal Showdown set.

```text
Team = [Set1, Set2, Set3, Set4, Set5, Set6]
```

A set includes:

```text
species
ability
item
nature
EVs / IVs
moves[4]
Tera type (where applicable)
```

All legality constraints must be delegated to the target format/ruleset validator.

## 2. Team archetype metadata

Tags should be descriptive, not treated as truth:

- stall
- semistall
- balance
- hazard_stack
- status
- regen_core
- wish_core
- phazing
- anti_setup
- anti_offense
- anti_boost
- anti_wallbreaker
- hazard_control

## 3. Seed sources

Start with:

1. curated modern stall teams
2. historical high-level stall teams
3. team samples where allowed and properly sourced
4. synthetic combinations built from compatible sets
5. mutated descendants from successful experiments

Record provenance for every seed. Do not merge sources without preserving the source timestamp and format.

## 4. Mutation operators

### Low-level
- move replacement
- item replacement
- ability replacement
- EV redistribution
- nature replacement
- Tera type replacement

### Mid-level
- replace one Pokémon
- replace a role with another candidate
- change a defensive core
- alter hazard/control package

### High-level
- swap two-role architecture
- seed an entirely different core
- inject an anti-meta slot

Use low mutation rates initially. Preserve elite diversity instead of cloning one team.

## 5. Crossover

Naive six-slot crossover is usually invalid strategically.

Use **role-aware crossover**:

```text
Parent A:
  hazard setter
  physical wall
  special wall
  cleric
  anti-setup
  wincon

Parent B:
  hazard stacker
  physical wall
  Regen pivot
  status spreader
  anti-offense
  wincon

Child:
  choose compatible roles/sets
```

The compatibility scorer must penalize duplicated weaknesses and missing mandatory roles.

## 6. Fitness

Do not rank teams by a single benchmark win rate.

Store a vector:

```text
win_rate
annoyance
PP differential
forced switches
survival time
catastrophic loss rate
matchup variance
opponent diversity
```

The evolutionary algorithm can use a multi-objective method internally, but reports should show the full vector and Pareto frontier rather than hiding it behind a single number.

## 7. Adversarial population

For every candidate stall team, generate a second population whose job is to exploit it.

Counter-team operators:

- identify biggest damage gap
- identify recovery denial
- identify hazard weakness
- identify status immunity
- identify setup opportunity
- identify unanswerable breaker
- identify PP bottleneck

Then evolve counters specifically against the candidate.

This creates a minimax-style loop:

```text
stall team S
     ↓
find counter C
     ↓
S vs C
     ↓
extract failure
     ↓
mutate S
     ↺
```

## 8. Team evaluation protocol

A team is not promoted because it beat one opponent.

Promote only after evaluation across:

- frozen historical pool
- random contemporary pool
- unseen teams
- adversarial counterpool
- repeated seeds

Keep the best **families** of solutions, not just one champion, to prevent collapse into a single brittle archetype.
