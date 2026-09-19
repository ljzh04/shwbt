# engine

Pure domain layer.

## Core interfaces

```ts
export type PlayerId = 'p1' | 'p2';

export interface BattleState {
  turn: number;
  active: Record<PlayerId, PokemonState | null>;
  sides: Record<PlayerId, SideState>;
  field: FieldState;
  choices: Action[];
  beliefs: OpponentBeliefState;
}

export interface Action {
  kind: 'move' | 'switch' | 'terastallize';
  id: string;
  target?: number;
}

export interface Evaluator {
  evaluate(state: BattleState): EvaluationVector;
}

export interface EvaluationVector {
  winProgress: number;
  opponentPPDepletion: number;
  forcedSwitchValue: number;
  statusPressure: number;
  hazardPressure: number;
  informationGain: number;
  structuralIntegrity: number;
  decisionBurden: number;
  catastrophicRisk: number;
  irreversibleResourceLoss: number;
}
```

Keep this package free of Showdown protocol strings where practical.
