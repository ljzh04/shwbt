import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DecisionSink } from '../packages/storage/src/decision-sink.js';
import { RawEventWriter, type RawEvent } from '../packages/storage/src/raw-event-writer.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-decision-sink-'));
  const writer = new RawEventWriter(join(root, 'decisions.ndjson'));
  const sink = new DecisionSink(writer);
  const request = JSON.stringify({ active: [{ moves: [{ id: 'recover', disabled: false }] }], side: { pokemon: [{ ident: 'p1: Toxapex', active: true, condition: '100/100' }] } });
  const event: RawEvent = {
    schema_version: '1.0.0', event_id: 'event-0', run_id: 'run-1', battle_id: 'battle-1', sequence: 0,
    timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol',
    payload: { type: 'sideupdate', message: `p1\n|turn|1\n|request|${request}` },
  };
  const decision = await sink.accept(event);
  assert.equal(decision?.actor, 'p1');
  const lines = (await readFile(join(root, 'decisions.ndjson'), 'utf8')).split('\n').filter(Boolean);
  assert.equal(lines.length, 2);
  const analysis = JSON.parse(lines[1]!) as { payload_type: string; payload: { battleId: string; turn: number; stateHash: string; perspective: string } };
  assert.equal(analysis.payload_type, 'analysis');
  assert.equal(analysis.payload.battleId, 'battle-1');
  assert.equal(analysis.payload.turn, decision?.turn);
  assert.equal(analysis.payload.stateHash, decision?.state_hash);
  assert.equal(analysis.payload.perspective, 'p1');
  console.log('decision sink tests ok');
}

void main();