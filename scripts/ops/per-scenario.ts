import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCampaign, type FrozenCampaign } from '../../packages/training/src/campaign.js';
import { defaultPolicyRegistry } from '../../packages/training/src/campaign-gate.js';

interface Manifest { version: string; simulatorCommit: string; referencePolicyId: string; scenarios: readonly { id: string; seed: number; p1Team: string; p2Team: string; policySide: 'p1' | 'p2'; maxTurns: number }[] }

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) throw new Error('usage: per-scenario <campaign.json>');
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest;
  const campaign: FrozenCampaign = {
    version: manifest.version,
    simulatorCommit: manifest.simulatorCommit,
    referencePolicyId: manifest.referencePolicyId,
    scenarios: manifest.scenarios.map((entry) => ({
      id: entry.id, seed: entry.seed, policySide: entry.policySide, maxTurns: entry.maxTurns,
      p1Team: readFileSync(resolve(entry.p1Team), 'utf8'), p2Team: readFileSync(resolve(entry.p2Team), 'utf8'),
    })),
  };
  const policies = defaultPolicyRegistry();
  for (const policyId of Object.keys(policies)) {
    const result = await runCampaign(policyId, policies[policyId]!(), campaign, policies['baseline-v1']!());
    for (const outcome of result.outcomes) {
      console.log(`${policyId} ${outcome.scenarioId} => winner=${outcome.winner ?? '-'} turns=${outcome.turns} own=${outcome.ownFainted} foe=${outcome.foeFainted} cat=${outcome.catastrophic ? 'YES' : 'no'}`);
    }
  }
}

void main();