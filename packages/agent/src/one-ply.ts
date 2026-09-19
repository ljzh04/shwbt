import { evaluateState, rankCandidates, riskAdjustedValue } from '../../engine/src/evaluator.js';
import type { Action, CandidateScore, EvaluationConfig } from '../../engine/src/types.js';
import type { PlayerId } from '../../engine/src/types.js';
import type { SimulatorBattle } from '../../simulator/src/adapter.js';
import type { OpponentModel } from './interfaces.js';

export interface OnePlyInput {
  readonly battle: SimulatorBattle;
  readonly player: PlayerId;
  readonly legalActions: readonly Action[];
  readonly opponentAction?: Action;
  readonly opponent?: PlayerId;
  readonly config: EvaluationConfig;
}

export async function evaluateOnePly(input: OnePlyInput): Promise<readonly CandidateScore[]> {
  const candidates: CandidateScore[] = [];
  for (const action of input.legalActions) {
    const branch = await input.battle.clone();
    await branch.choose(input.player, action);
    if (input.opponentAction && input.opponent) {
      await branch.choose(input.opponent, input.opponentAction);
    }
    const featureDelta = evaluateState(branch.snapshot());
    candidates.push({
      action,
      expectedValue: riskAdjustedValue(featureDelta, input.config),
      riskAdjustedValue: riskAdjustedValue(featureDelta, input.config),
      featureDelta,
    });
  }
  return rankCandidates(candidates);
}

export async function evaluateExpectedValue(
  input: Omit<OnePlyInput, 'opponentAction'> & { readonly opponent: PlayerId; readonly model: OpponentModel },
): Promise<readonly CandidateScore[]> {
  const opponentActions = input.model.predictActions(input.battle.snapshot()).actions;
  if (opponentActions.length === 0) return evaluateOnePly(input);
  const branches = await Promise.all(opponentActions.map(async ({ action, probability }) => ({
    probability,
    candidates: await evaluateOnePly({ ...input, opponentAction: action }),
  })));
  return rankCandidates(input.legalActions.map((action) => {
    const matching = branches.map(({ probability, candidates }) => ({
      probability,
      candidate: candidates.find((candidate) => candidate.action === action ||
        (candidate.action.kind === action.kind && candidate.action.id === action.id && candidate.action.target === action.target)),
    }));
    const expectedValue = matching.reduce((total, branch) => total + branch.probability * (branch.candidate?.expectedValue ?? 0), 0);
    const featureDelta = matching.find((branch) => branch.candidate)?.candidate?.featureDelta ?? evaluateState(input.battle.snapshot());
    return { action, expectedValue, riskAdjustedValue: expectedValue, featureDelta };
  }));
}