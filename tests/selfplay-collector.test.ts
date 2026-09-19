import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ShowdownBattle } from '../packages/simulator/src/battle-stream.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-selfplay-'));
  const path = join(root, 'events.ndjson');
  const writer = new RawEventWriter(path);
  let sequence = 0;
  const battle = new ShowdownBattle('all', (type, payload) => {
    return writer.append({ schema_version: '1.0.0', event_id: `event-${sequence}`, run_id: 'run-1', battle_id: 'battle-1', sequence: sequence++, timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol', payload: { type, message: payload } });
  });
  const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);
  await battle.start({ formatId: 'gen9customgame', p1Name: 'p1', p2Name: 'p2', p1Team: team, p2Team: team, seed: 1337 });
  for (let turn = 0; turn < 100 && !battle.isFinished(); turn += 1) {
    const [p1, p2] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
    if (!p1.length || !p2.length) break;
    await Promise.all([battle.choose('p1', p1[0]!), battle.choose('p2', p2[0]!)]);
  }
  await battle.flush();
  assert.ok((await readFile(path, 'utf8')).trim().length > 0);
  console.log('selfplay collector tests ok');
}

void main();