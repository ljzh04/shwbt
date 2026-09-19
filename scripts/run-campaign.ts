import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DeterministicBaseline } from '../packages/agent/src/baseline.js';
import type { SearchPolicy } from '../packages/agent/src/interfaces.js';
import { runCampaign, type CampaignScenario, type FrozenCampaign } from '../packages/training/src/campaign.js';

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const policies: Record<string, SearchPolicy> = { 'baseline-v1': new DeterministicBaseline() };

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

async function main(): Promise<void> {
  const manifestPath = resolve(option('--campaign', 'data/campaigns/frozen-ou-v1.json'));
  const campaignPath = resolve(option('--out', ''));
  const policyId = option('--policy', 'baseline-v1');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CampaignManifest;
  const scenarios: CampaignScenario[] = await Promise.all(manifest.scenarios.map(async (scenario) => ({
    id: scenario.id,
    seed: scenario.seed,
    policySide: scenario.policySide,
    maxTurns: scenario.maxTurns,
    p1Team: await readFile(resolve(scenario.p1Team), 'utf8'),
    p2Team: await readFile(resolve(scenario.p2Team), 'utf8'),
  })));
  const campaign: FrozenCampaign = {
    version: manifest.version,
    simulatorCommit: manifest.simulatorCommit,
    referencePolicyId: manifest.referencePolicyId,
    scenarios,
  };
  const candidate = policies[policyId] ?? new DeterministicBaseline();
  const reference = policies[manifest.referencePolicyId] ?? new DeterministicBaseline();
  const result = await runCampaign(policyId, candidate, campaign, reference);
  const artifact = {
    generatedAt: new Date().toISOString(),
    simulatorCommit: campaign.simulatorCommit,
    campaignVersion: campaign.version,
    result,
  };
  if (campaignPath) {
    await mkdir(dirname(campaignPath), { recursive: true });
    await writeFile(campaignPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({
    policyId,
    campaignVersion: result.campaignVersion,
    won: result.won,
    lost: result.lost,
    ties: result.ties,
    catastrophicLosses: result.catastrophicLosses,
    winRate: result.winRate,
    outcomes: result.outcomes.map((outcome) => `${outcome.scenarioId}=${outcome.winner ?? outcome.reason}@${outcome.turns}`),
  }, null, 2));
}

void main();