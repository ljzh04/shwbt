export type PlayerId = 'p1' | 'p2';

export type ActionKind = 'move' | 'switch' | 'terastallize' | 'team';

export interface Action {
  readonly kind: ActionKind;
  readonly id: string;
  readonly target?: number;
}

export interface PokemonState {
  readonly slot: string;
  readonly species: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly status: string | null;
  readonly fainted: boolean;
  readonly revealedMoves: readonly string[];
  readonly movePp: Readonly<Record<string, number>>;
  readonly item: string | null;
  readonly ability: string | null;
  readonly boosts: Readonly<Record<string, number>>;
  readonly teraRevealed: boolean;
}

export interface SideState {
  readonly player: PlayerId;
  readonly team: readonly PokemonState[];
  readonly activeSlot: string | null;
  readonly hazards: Readonly<Record<string, number>>;
  readonly volatile: Readonly<Record<string, unknown>>;
}

export interface FieldState {
  readonly weather: string | null;
  readonly terrain: string | null;
  readonly pseudoWeather: Readonly<Record<string, unknown>>;
}

export interface Hypothesis<T> {
  readonly value: T;
  readonly probability: number;
  readonly evidence: readonly string[];
}

export interface OpponentBeliefState {
  readonly sets: Readonly<Record<string, readonly Hypothesis<string>[]>>;
  readonly actions: Readonly<Record<string, readonly Hypothesis<string>[]>>;
}

export interface BattleState {
  readonly turn: number;
  readonly active: Readonly<Record<PlayerId, PokemonState | null>>;
  readonly sides: Readonly<Record<PlayerId, SideState>>;
  readonly field: FieldState;
  readonly choices: readonly Action[];
  readonly beliefs: OpponentBeliefState;
}

export interface EvaluationVector {
  readonly winProgress: number;
  readonly opponentPPDepletion: number;
  readonly forcedSwitchValue: number;
  readonly statusPressure: number;
  readonly hazardPressure: number;
  readonly informationGain: number;
  readonly structuralIntegrity: number;
  readonly decisionBurden: number;
  readonly catastrophicRisk: number;
  readonly irreversibleResourceLoss: number;
}

export interface ObjectiveWeights {
  readonly winProgress: number;
  readonly opponentPPDepletion: number;
  readonly forcedSwitchValue: number;
  readonly statusPressure: number;
  readonly hazardPressure: number;
  readonly informationGain: number;
  readonly structuralIntegrity: number;
  readonly decisionBurden: number;
}

export interface RiskWeights {
  readonly catastrophicRisk: number;
  readonly irreversibleResourceLoss: number;
}

export interface EvaluationConfig {
  readonly weights: ObjectiveWeights;
  readonly risk: RiskWeights;
}

export interface CandidateScore {
  readonly action: Action;
  readonly expectedValue: number;
  readonly riskAdjustedValue: number;
  readonly featureDelta: EvaluationVector;
}

export interface ReasonContribution {
  readonly feature: keyof EvaluationVector;
  readonly contribution: number;
}
