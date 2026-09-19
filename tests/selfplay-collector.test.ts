import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ShowdownBattle } from '../packages/simulator/src/battle-stream.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-selfplay-'));
  const path = join(root, 'events.ndjson');
  const decisionsPath = join(root, 'decisions.ndjson');
  const writer = new RawEventWriter(path);
  const decisionWriter = new RawEventWriter(decisionsPath);
  const { DecisionSink } = await import('../packages/storage/src/decision-sink.js');
  const decisionSink = new DecisionSink(decisionWriter);
  const pending = new Map<string, string>();
  let sequence = 0;
  let result: unknown = null;
  const finalized: string[] = [];
  const battle = new ShowdownBattle('all', (type, payload) => {
    const event = { schema_version: '1.0.0', event_id: `event-${sequence}`, run_id: 'run-1', battle_id: 'battle-1', sequence: sequence++, timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay' as const, simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol' as const, payload: { type, message: payload } };
    return writer.append(event).then(() => decisionSink.accept(event)).then((decision) => {
      if (decision) pending.set(decision.actor, decision.decision_id);
    });
  }, (value) => {
    result = value;
    return writer.append({ schema_version: '1.0.0', event_id: `outcome-${sequence}`, run_id: 'run-1', battle_id: 'battle-1', sequence: sequence++, timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'outcome', payload: { winner: value.winner, reason: value.reason } });
  });
  const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);
  await battle.start({ formatId: 'gen9customgame', p1Name: 'p1', p2Name: 'p2', p1Team: team, p2Team: team, seed: 1337 });
  for (let turn = 0; turn < 100 && !battle.isFinished(); turn += 1) {
    const [p1, p2] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
    if (!p1.length || !p2.length) break;
    await battle.flush();
    const actions = { p1: p1[0]!, p2: p2[0]! };
    for (const player of ['p1', 'p2'] as const) {
      const decisionId = pending.get(player);
      if (decisionId) {
        await decisionSink.finalize(decisionId, actions[player], { selected_at_turn: battle.snapshot().turn }, {
          winProgress: 0, opponentPPDepletion: 0, forcedSwitchValue: 0, statusPressure: 0, hazardPressure: 0,
          informationGain: 0, structuralIntegrity: 0, decisionBurden: 0, catastrophicRisk: 0, irreversibleResourceLoss: 0,
        });
        pending.delete(player);
      }
    }
    await Promise.all([battle.choose('p1', actions.p1), battle.choose('p2', actions.p2)]);
  }
  await battle.flush();
  const rawEvents = (await readFile(path, 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { payload_type: string; payload: { reason?: string } });
  assert.ok(rawEvents.length > 0);
  assert.ok(rawEvents.some((event) => event.payload_type === 'outcome' && event.payload.reason !== 'abnormal_end'));
  const decisionEvents = (await readFile(decisionsPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { payload: { chosen_action?: unknown } });
  assert.ok(decisionEvents.length > 0);
  assert.ok(decisionEvents.some((event) => event.payload.chosen_action));
  assert.equal(typeof result, 'object');
  console.log('selfplay collector tests ok');
}

void main();