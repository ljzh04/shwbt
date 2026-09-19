import type { Action, CandidateScore, EvaluationConfig, PlayerId } from '../../engine/src/types.js';
import { evaluateState, riskAdjustedValue, rankCandidates } from '../../engine/src/evaluator.js';
import type { SimulatorBattle } from '../../simulator/src/adapter.js';
import type { ActionDistribution, Observation, OpponentModel } from './interfaces.js';

export interface SearchBudget { readonly maxBranches: number; readonly maxDepth: number; }
export interface SearchStats { readonly branches: number; readonly depth: number; readonly elapsedMs: number; }
export interface BeamResult { readonly candidates: readonly CandidateScore[]; readonly stats: SearchStats; }

export async function beamSearch(input: {
  readonly battle: SimulatorBattle;
  readonly player: PlayerId;
  readonly legalActions: readonly Action[];
  readonly opponent: PlayerId;
  readonly model: OpponentModel;
  readonly config: EvaluationConfig;
  readonly budget: SearchBudget;
}): Promise<BeamResult> {
  const started = Date.now();
  let branches = 0;
  const candidates: CandidateScore[] = [];
  for (const action of input.legalActions) {
    if (branches >= input.budget.maxBranches) break;
    const branch = await input.battle.clone();
    await branch.choose(input.player, action);
    branches += 1;
    const featureDelta = evaluateState(branch.snapshot());
    candidates.push({ action, expectedValue: riskAdjustedValue(featureDelta, input.config), riskAdjustedValue: riskAdjustedValue(featureDelta, input.config), featureDelta });
  }
  return { candidates: rankCandidates(candidates), stats: { branches, depth: Math.min(1, input.budget.maxDepth), elapsedMs: Date.now() - started } };
}

export function cvar(values: readonly number[], tailFraction = 0.25): number {
  if (values.length === 0) return 0;
  const tailSize = Math.max(1, Math.ceil(values.length * tailFraction));
  return [...values].sort((left, right) => left - right).slice(0, tailSize).reduce((sum, value) => sum + value, 0) / tailSize;
}

export function riskAdjustedExpectedValue(expectedValue: number, branchValues: readonly number[], cvarWeight: number): number {
  return expectedValue - cvarWeight * Math.max(0, -cvar(branchValues));
}

export interface BehaviorFeatures { readonly switchRate: number; readonly stayRate: number; readonly actionEntropy: number; }

export function behaviorFeatures(observations: readonly Observation[]): BehaviorFeatures {
  const actions = observations.filter((observation) => observation.eventType === 'opponent_action');
  const switches = actions.filter((observation) => (observation.payload as { action?: Action }).action?.kind === 'switch').length;
  const counts = new Map<string, number>();
  for (const observation of actions) {
    const action = (observation.payload as { action?: Action }).action;
    if (action) counts.set(`${action.kind}:${action.id}`, (counts.get(`${action.kind}:${action.id}`) ?? 0) + 1);
  }
  const total = actions.length;
  const entropy = total === 0 ? 0 : [...counts.values()].reduce((sum, count) => {
    const probability = count / total;
    return sum - probability * Math.log2(probability);
  }, 0);
  return { switchRate: total === 0 ? 0 : switches / total, stayRate: total === 0 ? 0 : 1 - switches / total, actionEntropy: entropy };
}

export function brierScore(predictions: readonly { probability: number; outcome: boolean }[]): number {
  if (predictions.length === 0) return 0;
  return predictions.reduce((sum, prediction) => sum + (prediction.probability - (prediction.outcome ? 1 : 0)) ** 2, 0) / predictions.length;
}

export function uniformActionModel(actions: readonly Action[]): ActionDistribution {
  const probability = actions.length === 0 ? 0 : 1 / actions.length;
  return { actions: actions.map((action) => ({ action, probability })) };
}