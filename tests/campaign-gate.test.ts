import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DeterministicBaseline } from '../packages/agent/src/baseline.js';
import { evaluateCampaignGate, defaultPolicyRegistry, type PolicyFactory } from '../packages/training/src/campaign-gate.js';
import type { FrozenCampaign } from '../packages/training/src/campaign.js';

const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);
const pikachuCampaign: FrozenCampaign = {
  version: 'gate-pikachu-1',
  simulatorCommit: 'c'.repeat(40),
  referencePolicyId: 'baseline-v1',
  scenarios: [
    { id: 'a', seed: 1, p1Team: team, p2Team: team, policySide: 'p1', maxTurns: 50 },
    { id: 'b', seed: 2, p1Team: team, p2Team: team, policySide: 'p2', maxTurns: 50 },
  ],
};

const stall = readFileSync(resolve('data/teams/ou-stall-whitequeen.json'), 'utf8');
const balance = readFileSync(resolve('data/teams/ou-balance-pivot.json'), 'utf8');
const ouCampaign: FrozenCampaign = {
  version: 'gate-ou-1',
  simulatorCommit: 'c'.repeat(40),
  referencePolicyId: 'baseline-v1',
  scenarios: [
    { id: 'ou-6v6', seed: 1, p1Team: stall, p2Team: balance, policySide: 'p1', maxTurns: 8 },
  ],
};

async function main(): Promise<void> {
  const policies: Readonly<Record<string, PolicyFactory>> = {
    ...defaultPolicyRegistry(),
    'test-candidate': () => new DeterministicBaseline(),
  };
  const defaultGate = await evaluateCampaignGate({ campaign: pikachuCampaign, candidateId: 'test-candidate', controlId: 'baseline-v1', policies });
  assert.equal(defaultGate.passed, false);
  assert.equal(defaultGate.candidateId, 'test-candidate');
  assert.equal(defaultGate.controlId, 'baseline-v1');
  assert.deepEqual(defaultGate.candidate.outcomes, defaultGate.control.outcomes);
  assert.equal(defaultGate.input.candidateMetric, defaultGate.input.controlMetric);
  assert.ok(defaultGate.input.candidateBattles >= 2);

  const permissiveGate = await evaluateCampaignGate({
    campaign: pikachuCampaign,
    candidateId: 'test-candidate',
    controlId: 'baseline-v1',
    policies,
    thresholds: { minimumBattles: 1, minimumMetricDelta: 0, maximumCatastrophicRegression: 0 },
  });
  assert.equal(permissiveGate.passed, true);

  const ouGate = await evaluateCampaignGate({ campaign: ouCampaign, candidateId: 'test-candidate', controlId: 'baseline-v1', policies });
  assert.equal(ouGate.passed, false);
  assert.deepEqual(ouGate.candidate.outcomes, ouGate.control.outcomes);
  assert.ok(ouGate.candidate.outcomes[0]?.turns > 0);

  await assert.rejects(() => evaluateCampaignGate({ campaign: pikachuCampaign, candidateId: 'missing', controlId: 'baseline-v1', policies }), /no policy registered/);
  console.log('campaign gate tests ok');
}

void main();