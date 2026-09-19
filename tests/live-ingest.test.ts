import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAnalysisServer } from '../packages/agent/src/analysis-server.js';
import { readAnalysisSnapshots } from '../packages/storage/src/analysis-store.js';
import { LiveBattleStore } from '../packages/storage/src/live-ingest.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

const commit = 'b'.repeat(40);
const frames = [
  '|player|p1|Alice|userid|alice\n|player|p2|Bob|userid|bob\n|start',
  '|switch|p1a: Toxapex|100/100\n|switch|p2a: Gliscor|100/100\n|turn|1',
  '|move|p2a: Gliscor|Toxic\n|-boost|p1a: Toxapex|def|-1\n|turn|2',
  '|move|p1a: Toxapex|Recover\n|-heal|p1a: Toxapex|100/100\n|turn|3',
];

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-live-'));
  const decisions = join(root, 'decisions.ndjson');
  const store = new LiveBattleStore(new RawEventWriter(decisions), commit);
  assert.equal(await store.accept({ battleId: 'battle-live-1', frames: [] }), 0);
  const first = await store.accept({ battleId: 'battle-live-1', frames: frames.slice(0, 2) });
  assert.equal(first, 2);
  const next = await store.accept({ battleId: 'battle-live-1', frames: frames.slice(2) });
  assert.equal(next, 2);
  const persisted = await readAnalysisSnapshots(decisions);
  assert.equal(persisted.length, 4);
  assert.ok(persisted.every((snapshot) => snapshot.battleId === 'battle-live-1'));
  assert.deepEqual(persisted.map((snapshot) => snapshot.turn), [0, 1, 2, 3]);
  const last = persisted[persisted.length - 1];
  assert.equal(last.perspective, 'p1');
  assert.equal(last.active.opponent.species, 'Gliscor');
  assert.ok(last.active.opponent.revealedMoves.includes('Toxic'));
  assert.equal(last.active.ours.species, 'Toxapex');
  assert.equal(last.resources.hazardPressure.kind, 'KNOWN');

  const server = createAnalysisServer(() => readAnalysisSnapshots(decisions), { panelHtml: null }, store);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${base}/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ battleId: 'battle-live-2', frames: frames.slice(0, 2) }),
  });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: 2 });
  const mishap = await fetch(`${base}/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ frames }),
  });
  assert.equal(mishap.status, 400);

  const asBob = new LiveBattleStore(new RawEventWriter(join(root, 'p2.ndjson')), commit);
  await asBob.accept({ battleId: 'battle-live-3', frames: frames.slice(0, 2), username: 'bob' });
  const bobPersisted = await readAnalysisSnapshots(join(root, 'p2.ndjson'));
  assert.equal(bobPersisted[bobPersisted.length - 1].perspective, 'p2');

  const snapshot = await fetch(`${base}/snapshot?battleId=battle-live-2`);
  assert.equal(snapshot.status, 200);
  const snapshotBody = await snapshot.json() as { battleId: string; turn: number };
  assert.equal(snapshotBody.battleId, 'battle-live-2');
  assert.equal(snapshotBody.turn, 1);
  server.close();
  console.log('live ingest tests ok');
}

void main();