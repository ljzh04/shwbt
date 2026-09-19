import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type AddressInfo } from 'node:net';
import { createAnalysisServer } from '../packages/agent/src/analysis-server.js';
import { DecisionSink } from '../packages/storage/src/decision-sink.js';
import { RawEventWriter, type RawEvent } from '../packages/storage/src/raw-event-writer.js';
import { readAnalysisSnapshots } from '../packages/storage/src/analysis-store.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-analysis-server-'));
  const path = join(root, 'decisions.ndjson');
  const sink = new DecisionSink(new RawEventWriter(path));
  const request = JSON.stringify({ active: [{ moves: [{ id: 'recover', disabled: false }] }], side: { pokemon: [{ ident: 'p1: Wall', active: true, condition: '100/100' }] } });
  const event: RawEvent = {
    schema_version: '1.0.0', event_id: 'event-0', run_id: 'run-1', battle_id: 'battle-1', sequence: 0,
    timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol',
    payload: { type: 'sideupdate', message: `p1\n|turn|3\n|request|${request}` },
  };
  assert.ok(await sink.accept(event));

  const stored = await readAnalysisSnapshots(join(root, 'missing.ndjson'));
  assert.deepEqual(stored, []);

  const server = createAnalysisServer(() => readAnalysisSnapshots(path));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    const health = await fetch(`http://localhost:${port}/health`);
    assert.equal(health.status, 200);
    const latest = await fetch(`http://localhost:${port}/snapshot?battleId=battle-1`);
    assert.equal(latest.status, 200);
    const body = await latest.json() as { turn: number; battleId: string; stateHash: string };
    assert.equal(body.turn, 3);
    assert.equal(body.battleId, 'battle-1');
    const missing = await fetch(`http://localhost:${port}/snapshot?battleId=nope`);
    assert.equal(missing.status, 404);
    const bad = await fetch(`http://localhost:${port}/snapshot`);
    assert.equal(bad.status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  console.log('analysis server tests ok');
}

void main();
