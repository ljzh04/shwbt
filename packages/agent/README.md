# agent

Decision-making layer.

## Proposed pipeline

```ts
observe(protocol)
  -> reduce(state)
  -> updateBeliefs(state, observation)
  -> generateCandidates(state)
  -> search(state, candidates, beliefs)
  -> scoreBranches()
  -> selectAction()
  -> emitDecisionTelemetry()
```

## Strategy interfaces

```ts
export interface OpponentModel {
  predictActions(state: BattleState): ActionDistribution;
  predictSets(state: BattleState): SetBeliefDistribution;
  update(observation: Observation): void;
}

export interface SearchPolicy {
  choose(input: SearchInput): Promise<ActionDecision>;
}

export interface ActionDecision {
  action: Action;
  score: number;
  candidates: CandidateScore[];
  reasons: ReasonContribution[];
}
```

Start with:

`HeuristicOpponentModel + OnePlySearchPolicy + VectorEvaluator`

Then add:

`BeliefOpponentModel + BeamSearchPolicy`

Then optionally:

`LearnedOpponentModel + MCTS/expectimax hybrid`
