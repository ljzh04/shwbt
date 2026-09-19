import assert from 'node:assert/strict';
import { DeduplicatingEventSink, PersistentDeduplicatingEventSink, rawEventHash } from '../packages/storage/src/deduplication.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RawEvent } from '../packages/storage/src/raw-event-writer.js';

const event: RawEvent = {
  schema_version: '1.0.0', event_id: 'event-0', run_id: 'run-1', battle_id: 'battle-1', sequence: 0,
  timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40),
  format_id: 'gen9customgame', agent_version: 'dev', payload_type: 'protocol', payload: { message: '|turn|1' },
};

async function main(): Promise<void> {
  const appended: RawEvent[] = [];
  const sink = new DeduplicatingEventSink(async (value) => { appended.push(value); });
  assert.equal(await sink.appendIfNew(event), true);
  assert.equal(await sink.appendIfNew({ ...event }), false);
  assert.equal(appended.length, 1);
  assert.equal(rawEventHash(event), rawEventHash({ ...event }));
  const directory = await mkdtemp(join(tmpdir(), 'stall-ai-dedupe-'));
  const indexPath = join(directory, 'hashes.ndjson');
  const first = new PersistentDeduplicatingEventSink(indexPath, async () => undefined);
  assert.equal(await first.appendIfNew(event), true);
  const second = new PersistentDeduplicatingEventSink(indexPath, async () => { throw new Error('should not append duplicate'); });
  assert.equal(await second.appendIfNew(event), false);
  console.log('deduplication tests ok');
}

void main();