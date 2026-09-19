import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readEvaluationState, runScheduledEvaluation, writeEvaluationState } from '../scripts/ops/scheduled-evaluation.js';

const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-schedule-'));
  const teamPath = join(root, 'team.json');
  const manifestPath = join(root, 'campaign.json');
  const statePath = join(root, 'state.json');
  const outPath = join(root, 'evaluation.json');
  await writeFile(teamPath, team, 'utf8');
  await writeFile(manifestPath, JSON.stringify({
    version: 'test-sched-1',
    simulatorCommit: 'c'.repeat(40),
    referencePolicyId: 'baseline-v1',
    scenarios: [{ id: 'a', seed: 1, p1Team: teamPath, p2Team: teamPath, policySide: 'p1', maxTurns: 30 }],
  }), 'utf8');

  assert.deepEqual(await readEvaluationState(statePath), { lastRunAt: null });
  await writeEvaluationState(statePath, { lastRunAt: 1000 });
  assert.deepEqual(await readEvaluationState(statePath), { lastRunAt: 1000 });

  await writeEvaluationState(statePath, { lastRunAt: 50 });
  const skipped = await runScheduledEvaluation({ statePath, campaignPath: manifestPath, candidateId: 'baseline-v1', outPath, intervalMs: 1000, now: 500 });
  assert.deepEqual(skipped, { ran: false });
  await assert.rejects(() => access(outPath));

  const ran = await runScheduledEvaluation({ statePath, campaignPath: manifestPath, candidateId: 'baseline-v1', outPath, intervalMs: 1000, now: 1500 });
  assert.equal(ran.ran, true);
  assert.ok(ran.campaignVersion, 'test-sched-1');
  const artifact = JSON.parse(await readFile(outPath, 'utf8'));
  assert.equal(artifact.campaignVersion, 'test-sched-1');
  assert.deepEqual(await readEvaluationState(statePath), { lastRunAt: 1500 });

  const skippedAgain = await runScheduledEvaluation({ statePath, campaignPath: manifestPath, candidateId: 'baseline-v1', outPath, intervalMs: 1000, now: 2000 });
  assert.deepEqual(skippedAgain, { ran: false });
  console.log('operations schedule tests ok');
}

void main();