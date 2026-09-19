# Test Plan

## Simulator correctness

- protocol reducer consumes every supported message used by target format
- state hashes are stable
- hidden information never leaks into agent-visible state
- legal action set exactly matches simulator
- simulator and reducer agree on fainted/active state

## Evaluator correctness

Hand-constructed positions for:

- guaranteed KO vs safe switch
- recovery opportunity
- PP exhaustion
- status immunity
- hazard removal
- setup denial
- last-answer preservation
- forced switch
- catastrophic line

## Opponent model

- Bayesian updates normalize
- impossible hypotheses receive zero after hard evidence
- small evidence does not collapse distribution prematurely
- probabilities are calibrated

## Search

- no illegal branches
- no mutation of parent state
- repeated seeds are deterministic
- search cache keys include all state-relevant information

## Team lab

- six-member invariant
- format legality validation
- no duplicate clause violations
- mutation actually changes only intended fields
- crossover preserves provenance
- archive retains diversity

## Regression

Any discovered game-mechanics bug becomes a frozen test case.
