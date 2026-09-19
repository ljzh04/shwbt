import type { Action, BattleState } from '../../engine/src/types.js';

export interface SetExample { readonly features: readonly string[]; readonly setId: string; }
export interface SetPrediction { readonly setId: string; readonly probability: number; }

export class HiddenSetClassifier {
  private readonly counts = new Map<string, number>();

  fit(examples: readonly SetExample[]): void {
    for (const example of examples) this.counts.set(example.setId, (this.counts.get(example.setId) ?? 0) + 1);
  }

  predict(): readonly SetPrediction[] {
    const total = [...this.counts.values()].reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];
    return [...this.counts.entries()]
      .map(([setId, count]) => ({ setId, probability: count / total }))
      .sort((left, right) => right.probability - left.probability);
  }
}

export interface PositionValueExample { readonly stateHash: string; readonly value: number; }

export class PositionValueModel {
  private readonly values = new Map<string, number[]>();

  fit(examples: readonly PositionValueExample[]): void {
    for (const example of examples) this.values.set(example.stateHash, [...(this.values.get(example.stateHash) ?? []), example.value]);
  }

  predict(stateHash: string): number | null {
    const values = this.values.get(stateHash);
    return values && values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }
}

export function mineHardExamples(examples: readonly { state: BattleState; loss: number; regret: number }[], limit: number) {
  return [...examples].sort((left, right) => (right.loss + right.regret) - (left.loss + left.regret)).slice(0, Math.max(0, limit));
}

export interface CounterfactualExample { readonly state: BattleState; readonly action: Action; readonly outcomeSource: 'simulated'; }

export function generateCounterfactuals(state: BattleState, legalActions: readonly Action[]): readonly CounterfactualExample[] {
  return legalActions.map((action) => ({ state, action, outcomeSource: 'simulated' as const }));
}