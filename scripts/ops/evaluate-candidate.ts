import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { evaluateCampaignGate, defaultPolicyRegistry, type PolicyFactory } from '../../packages/training/src/campaign-gate.js';
import type { CampaignResult, FrozenCampaign } from '../../packages/training/src/campaign.js';
import type { PromotionGateInput, PromotionThresholds } from '../../packages/training/src/promotion.js';
import { DeterministicBaseline } from '../../packages/agent/src/baseline.js';

export function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

interface ScenarioManifest {
  readonly id: string;
  readonly seed: number;
  readonly p1Team: string;
  readonly p2Team: string;
  readonly policySide: 'p1' | 'p2';
  readonly maxTurns: number;
}

interface CampaignManifest {
  readonly version: string;
  readonly simulatorCommit: string;
  readonly referencePolicyId: string;
  readonly scenarios: readonly ScenarioManifest[];
}

export async function resolveCampaign(path: string): Promise<FrozenCampaign> {
  const manifest = JSON.parse(await readFile(resolve(path), 'utf8')) as CampaignManifest;
  return {
    version: manifest.version,
    simulatorCommit: manifest.simulatorCommit,
    referencePolicyId: manifest.referencePolicyId,
    scenarios: await Promise.all(manifest.scenarios.map(async (scenario) => ({
      id: scenario.id,
      seed: scenario.seed,
      policySide: scenario.policySide,
      maxTurns: scenario.maxTurns,
      p1Team: await readFile(resolve(scenario.p1Team), 'utf8'),
      p2Team: await readFile(resolve(scenario.p2Team), 'utf8'),
    }))),
  };
}

export type EvaluationArtifact = {
  generatedAt: string;
  simulatorCommit: string;
  campaignVersion: string;
  candidateId: string;
  controlId: string;
  candidate: CampaignResult;
  control: CampaignResult;
  promotion: {
    passed: boolean;
    thresholds: PromotionThresholds;
    input: PromotionGateInput;
  };
};

export async function evaluateCandidateArtifact(input: {
  campaignPath: string;
  candidateId: string;
  outPath?: string | undefined;
}): Promise<{ artifact: EvaluationArtifact; decision: string }> {
  const campaign = await resolveCampaign(input.campaignPath);
  const registered: Readonly<Record<string, PolicyFactory>> = {
    ...defaultPolicyRegistry(),
    'test-candidate': () => new DeterministicBaseline(),
  };
  const evaluation = await evaluateCampaignGate({ campaign, candidateId: input.candidateId, controlId: campaign.referencePolicyId, policies: registered });
  const artifact: EvaluationArtifact = {
    generatedAt: new Date().toISOString(),
    simulatorCommit: campaign.simulatorCommit,
    campaignVersion: campaign.version,
    candidateId: evaluation.candidateId,
    controlId: evaluation.controlId,
    candidate: evaluation.candidate,
    control: evaluation.control,
    promotion: { passed: evaluation.passed, thresholds: evaluation.thresholds, input: evaluation.input },
  };
  if (input.outPath) {
    const target = resolve(input.outPath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  }
  return { artifact, decision: evaluation.passed ? 'PROMOTE' : 'KEEP' };
}

async function main(): Promise<void> {
  const campaignPath = option('--campaign', 'data/campaigns/frozen-ou-v1.json');
  const outPath = option('--out', '');
  const candidateId = option('--candidate', 'baseline-v1');
  const { decision, artifact } = await evaluateCandidateArtifact({ campaignPath, candidateId, outPath });
  console.log(`${decision} ${artifact.candidateId}: winRate ${artifact.promotion.input.candidateMetric.toFixed(3)} vs control ${artifact.promotion.input.controlMetric.toFixed(3)} (threshold ${artifact.promotion.thresholds.minimumMetricDelta}); catastrophic ${artifact.promotion.input.candidateCatastrophicLossRate.toFixed(3)} vs ${artifact.promotion.input.controlCatastrophicLossRate.toFixed(3)}`);
}

if (require.main === module) {
  void main();
}