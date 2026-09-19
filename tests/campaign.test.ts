import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DeterministicBaseline } from '../packages/agent/src/baseline.js';
import { classifyCampaignOutcome, runCampaign, type FrozenCampaign } from '../packages/training/src/campaign.js';

assert.equal(classifyCampaignOutcome({ winner: 'p1', policySide: 'p1', ownFainted: 5, foeFainted: 3, turns: 9 }), false);
assert.equal(classifyCampaignOutcome({ winner: 'p2', policySide: 'p1', ownFainted: 6, foeFainted: 2, turns: 9 }), true);
assert.equal(classifyCampaignOutcome({ winner: 'p2', policySide: 'p1', ownFainted: 1, foeFainted: 0, turns: 9 }), true);
assert.equal(classifyCampaignOutcome({ winner: 'p2', policySide: 'p1', ownFainted: 2, foeFainted: 3, turns: 2 }), true);
assert.equal(classifyCampaignOutcome({ winner: 'p2', policySide: 'p1', ownFainted: 2, foeFainted: 3, turns: 9 }), false);
assert.equal(classifyCampaignOutcome({ winner: null, policySide: 'p1', ownFainted: 6, foeFainted: 0, turns: 30 }), false);

const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);
const campaign: FrozenCampaign = {
  version: 'test-1',
  simulatorCommit: 'c'.repeat(40),
  referencePolicyId: 'baseline-v1',
  scenarios: [
    { id: 'a', seed: 1, p1Team: team, p2Team: team, policySide: 'p1', maxTurns: 50 },
    { id: 'b', seed: 1, p1Team: team, p2Team: team, policySide: 'p2', maxTurns: 50 },
    { id: 'abort', seed: 2, p1Team: team, p2Team: team, policySide: 'p1', maxTurns: 0 },
  ],
};

async function main(): Promise<void> {
  const first = await runCampaign('baseline-v1', new DeterministicBaseline(), campaign, new DeterministicBaseline());
  const second = await runCampaign('baseline-v1', new DeterministicBaseline(), campaign, new DeterministicBaseline());
  assert.deepEqual(first.outcomes, second.outcomes);
  assert.equal(first.campaignVersion, 'test-1');
  assert.equal(first.outcomes.length, 3);
  const decisive = first.outcomes.filter((outcome) => outcome.winner === 'p1' || outcome.winner === 'p2');
  assert.ok(decisive.length >= 2);
  assert.ok(decisive.every((outcome) => outcome.turns > 0));
  assert.ok(decisive.every((outcome) => outcome.ownFainted + outcome.foeFainted >= 1));
  assert.equal(first.won + first.lost, decisive.length);
  assert.equal(first.ties, first.outcomes.length - decisive.length);
  const abort = first.outcomes.find((outcome) => outcome.scenarioId === 'abort');
  assert.ok(abort);
  assert.equal(abort.winner, null);
  assert.equal(abort.reason, 'max_turns');
  assert.equal(abort.catastrophic, false);

  const stall = readFileSync(resolve('data/teams/ou-stall-whitequeen.json'), 'utf8');
  const balance = readFileSync(resolve('data/teams/ou-balance-pivot.json'), 'utf8');
  const ouCampaign: FrozenCampaign = {
    version: 'test-ou-1',
    simulatorCommit: 'c'.repeat(40),
    referencePolicyId: 'baseline-v1',
    scenarios: [{ id: 'ou-6v6', seed: 1, p1Team: stall, p2Team: balance, policySide: 'p1', maxTurns: 8 }],
  };
  const ouFirst = await runCampaign('baseline-v1', new DeterministicBaseline(), ouCampaign, new DeterministicBaseline());
  const ouSecond = await runCampaign('baseline-v1', new DeterministicBaseline(), ouCampaign, new DeterministicBaseline());
  assert.deepEqual(ouFirst.outcomes, ouSecond.outcomes);
  const outcome = ouFirst.outcomes[0];
  assert.ok(outcome);
  assert.ok(outcome.turns > 0);
  assert.ok(outcome.reason === 'max_turns' || outcome.reason === 'finished');
  console.log('campaign tests ok');
}

void main();