import { evaluateState, riskAdjustedValue, rankCandidates } from '../../engine/src/evaluator.js';
import type {
  Action,
  CandidateScore,
  EvaluationConfig,
  ReasonContribution,
} from '../../engine/src/types.js';
import type { ActionDecision, SearchInput, SearchPolicy } from './interfaces.js';

const recoveryMoves = new Set(['recover', 'roost', 'softboiled', 'slackoff', 'moonlight', 'wish']);
const statusMoves = new Set(['toxic', 'thunderwave', 'willowisp', 'leechseed', 'spore']);
const hazardMoves = new Set(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']);

const defaultConfig: EvaluationConfig = {
  weights: {
    winProgress: 0.35, opponentPPDepletion: 0.2, forcedSwitchValue: 0.1, statusPressure: 0.1,
    hazardPressure: 0.08, informationGain: 0.05, structuralIntegrity: 0.1, decisionBurden: 0.02,
  },
  risk: { catastrophicRisk: 0.5, irreversibleResourceLoss: 0.25 },
};

export { defaultConfig };

function actionPriority(action: Action): number {
  if (action.kind === 'switch') return 30;
  if (action.kind !== 'move') return 10;
  const id = action.id.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (recoveryMoves.has(id)) return 100;
  if (statusMoves.has(id)) return 80;
  if (hazardMoves.has(id)) return 70;
  return 50;
}

function reasonFeature(action: Action): ReasonContribution['feature'] {
  if (action.kind === 'switch') return 'structuralIntegrity';
  const id = action.id.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (recoveryMoves.has(id)) return 'structuralIntegrity';
  if (statusMoves.has(id)) return 'statusPressure';
  if (hazardMoves.has(id)) return 'hazardPressure';
  return 'winProgress';
}

export class DeterministicBaseline implements SearchPolicy {
  constructor(private readonly config: EvaluationConfig = defaultConfig) {}

  async choose(input: SearchInput): Promise<ActionDecision> {
    if (input.legalActions.length === 0) throw new Error('cannot choose from empty legal action set');
    const features = evaluateState(input.state);
    const candidates: CandidateScore[] = input.legalActions.map((action, index) => {
      const priority = actionPriority(action);
      const expectedValue = priority / 100;
      return {
        action,
        expectedValue,
        riskAdjustedValue: riskAdjustedValue(features, this.config) + expectedValue - index / 10000,
        featureDelta: features,
      };
    });
    const ranked = rankCandidates(candidates);
    const selected = ranked[0];
    if (!selected) throw new Error('baseline produced no candidate');
    const reasons: ReasonContribution[] = [{
      feature: reasonFeature(selected.action),
      contribution: selected.expectedValue,
    }];
    return { action: selected.action, score: selected.riskAdjustedValue, candidates: ranked, reasons };
  }
}