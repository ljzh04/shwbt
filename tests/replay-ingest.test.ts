import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DecisionSink } from '../packages/storage/src/decision-sink.js';
import { ingestReplay } from '../packages/storage/src/replay-ingest.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-replay-'));
  const source = join(root, 'raw.ndjson');
  const output = join(root, 'decisions.ndjson');
  const request = JSON.stringify({ active: [{ moves: [{ id: 'recover', disabled: false }] }], side: { pokemon: [{ ident: 'p1: Wall', active: true, condition: '100/100' }] } });
  const event = { schema_version: '1.0.0', event_id: 'event-0', run_id: 'run-1', battle_id: 'battle-1', sequence: 0, timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay' as const, simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol' as const, payload: { type: 'sideupdate', message: `p1\n|turn|1\n|request|${request}` } };
  await writeFile(source, `${JSON.stringify(event)}\nnot-json\n`);
  const result = await ingestReplay(source, new DecisionSink(new RawEventWriter(output)));
  assert.deepEqual(result, { events: 2, decisions: 1, invalid: 1 });
  console.log('replay ingest tests ok');
}

void main();