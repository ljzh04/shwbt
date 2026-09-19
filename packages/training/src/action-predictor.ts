import type { Action } from '../../engine/src/types.js';

export interface ActionExample {
  readonly legalActions: readonly Action[];
  readonly chosenAction: Action;
}

export interface PredictedAction {
  readonly action: Action;
  readonly probability: number;
}

function key(action: Action): string {
  return `${action.kind}:${action.id}:${action.target ?? ''}`;
}

export class FrequencyActionPredictor {
  private readonly counts = new Map<string, number>();

  fit(examples: readonly ActionExample[]): void {
    for (const example of examples) {
      const actionKey = key(example.chosenAction);
      this.counts.set(actionKey, (this.counts.get(actionKey) ?? 0) + 1);
    }
  }

  predict(legalActions: readonly Action[]): readonly PredictedAction[] {
    if (legalActions.length === 0) return [];
    const total = legalActions.reduce((sum, action) => sum + (this.counts.get(key(action)) ?? 0) + 1, 0);
    return legalActions
      .map((action) => ({ action, probability: ((this.counts.get(key(action)) ?? 0) + 1) / total }))
      .sort((left, right) => right.probability - left.probability);
  }
}