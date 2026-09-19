import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { evaluateCampaignGate, defaultPolicyRegistry, type PolicyFactory } from '../../packages/training/src/campaign-gate.js';
import type { FrozenCampaign } from '../../packages/training/src/campaign.js';
import { DeterministicBaseline } from '../../packages/agent/src/baseline.js';

function option(name: string, fallback: string): string {
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

async function resolveCampaign(path: string): Promise<FrozenCampaign> {
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

async function main(): Promise<void> {
  const campaignPath = resolve(option('--campaign', 'data/campaigns/frozen-ou-v1.json'));
  const outPath = option('--out', '');
  const candidateId = option('--candidate', 'baseline-v1');
  const campaign = await resolveCampaign(campaignPath);
  const registered: Readonly<Record<string, PolicyFactory>> = {
    ...defaultPolicyRegistry(),
    'test-candidate': () => new DeterministicBaseline(),
  };
  const evaluation = await evaluateCampaignGate({ campaign, candidateId, controlId: campaign.referencePolicyId, policies: registered });
  const artifact = {
    generatedAt: new Date().toISOString(),
    simulatorCommit: campaign.simulatorCommit,
    campaignVersion: campaign.version,
    candidateId: evaluation.candidateId,
    controlId: evaluation.controlId,
    candidate: evaluation.candidate,
    control: evaluation.control,
    promotion: {
      passed: evaluation.passed,
      thresholds: evaluation.thresholds,
      input: evaluation.input,
    },
  };
  if (outPath) {
    const target = resolve(outPath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  }
  const decision = evaluation.passed ? 'PROMOTE' : 'KEEP';
  console.log(`${decision} ${evaluation.candidateId}: winRate ${artifact.promotion.input.candidateMetric.toFixed(3)} vs control ${artifact.promotion.input.controlMetric.toFixed(3)} (threshold ${evaluation.thresholds.minimumMetricDelta}); catastrophic ${artifact.promotion.input.candidateCatastrophicLossRate.toFixed(3)} vs ${artifact.promotion.input.controlCatastrophicLossRate.toFixed(3)}`);
}

void main();