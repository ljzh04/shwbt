import type { SearchPolicy } from '../../agent/src/interfaces.js';
import { DeterministicBaseline } from '../../agent/src/baseline.js';
import { runCampaign, type CampaignResult, type FrozenCampaign } from './campaign.js';
import { passesHardPromotionGate, type PromotionGateInput, type PromotionThresholds } from './promotion.js';

export type PolicyFactory = () => SearchPolicy;

const DEFAULT_THRESHOLDS: PromotionThresholds = {
  minimumBattles: 4,
  minimumMetricDelta: 0.25,
  maximumCatastrophicRegression: 0,
};

export function defaultPolicyRegistry(): Readonly<Record<string, PolicyFactory>> {
  return { 'baseline-v1': () => new DeterministicBaseline() };
}

export function campaignMetric(result: CampaignResult): number {
  return result.winRate;
}

export interface CampaignGateEvaluation {
  readonly candidateId: string;
  readonly controlId: string;
  readonly campaignVersion: string;
  readonly candidate: CampaignResult;
  readonly control: CampaignResult;
  readonly input: PromotionGateInput;
  readonly thresholds: PromotionThresholds;
  readonly passed: boolean;
}

export async function evaluateCampaignGate(input: {
  campaign: FrozenCampaign;
  candidateId: string;
  controlId: string;
  policies: Readonly<Record<string, PolicyFactory>>;
  thresholds?: PromotionThresholds;
}): Promise<CampaignGateEvaluation> {
  const { campaign, candidateId, controlId, policies, thresholds = DEFAULT_THRESHOLDS } = input;
  const candidateFactory = policies[candidateId];
  const controlFactory = policies[controlId];
  if (!candidateFactory) throw new Error(`no policy registered for candidate '${candidateId}'`);
  if (!controlFactory) throw new Error(`no policy registered for control '${controlId}'`);
  const candidate = await runCampaign(candidateId, candidateFactory(), campaign, controlFactory());
  const control = await runCampaign(controlId, controlFactory(), campaign, controlFactory());
  const inputMetrics: PromotionGateInput = {
    controlMetric: campaignMetric(control),
    candidateMetric: campaignMetric(candidate),
    controlCatastrophicLossRate: control.outcomes.length === 0 ? 0 : control.catastrophicLosses / control.outcomes.length,
    candidateCatastrophicLossRate: candidate.outcomes.length === 0 ? 0 : candidate.catastrophicLosses / candidate.outcomes.length,
    candidateBattles: candidate.outcomes.length,
  };
  return {
    candidateId,
    controlId,
    campaignVersion: campaign.version,
    candidate,
    control,
    input: inputMetrics,
    thresholds,
    passed: passesHardPromotionGate(inputMetrics, thresholds),
  };
}