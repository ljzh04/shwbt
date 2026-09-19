import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RawEventWriter, type RawEvent } from '../packages/storage/src/raw-event-writer.js';

async function main(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'stall-ai-'));
  const path = join(directory, 'raw', 'events.ndjson');
  const writer = new RawEventWriter(path);
  const event = (sequence: number): RawEvent => ({
    schema_version: '1.0.0', event_id: `event-${sequence}`, run_id: 'run-1', battle_id: 'battle-1', sequence,
    timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40),
    format_id: 'gen9customgame', agent_version: 'dev', payload_type: 'protocol', payload: { message: '|turn|1' },
  });

  await Promise.all([writer.append(event(0)), writer.append(event(1))]);
  const lines = (await readFile(path, 'utf8')).trim().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1]!).sequence, 1);
  await assert.rejects(writer.append(event(3)), /expected 2/);
  console.log('raw event writer tests ok');
}

void main();