import type {
  Action,
  BattleState,
  CandidateScore,
  ReasonContribution,
} from '../../engine/src/types.js';

export interface ActionDistribution {
  readonly actions: readonly {
    action: Action;
    probability: number;
  }[];
}

export interface SetBeliefDistribution {
  readonly hypotheses: readonly {
    pokemonSlot: string;
    setId: string;
    probability: number;
  }[];
}

export interface Observation {
  readonly turn: number;
  readonly eventType: string;
  readonly payload: unknown;
}

export interface OpponentModel {
  predictActions(state: BattleState): ActionDistribution;
  predictSets(state: BattleState): SetBeliefDistribution;
  update(observation: Observation): void;
}

export interface SearchInput {
  readonly state: BattleState;
  readonly legalActions: readonly Action[];
}

export interface ActionDecision {
  readonly action: Action;
  readonly score: number;
  readonly candidates: readonly CandidateScore[];
  readonly reasons: readonly ReasonContribution[];
}

export interface SearchPolicy {
  choose(input: SearchInput): Promise<ActionDecision>;
}
