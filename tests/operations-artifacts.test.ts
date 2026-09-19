import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compactNdjson } from '../scripts/ops/compact.js';
import { benchmarkDue } from '../scripts/ops/schedule.js';
import { readActive, setActive } from '../scripts/ops/rollback.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-ops-'));
  const input = join(root, 'raw.ndjson');
  const output = join(root, 'derived', 'part.ndjson');
  await writeFile(input, '{"sequence":0}\n\n{"sequence":1}\n');
  assert.equal(await compactNdjson(input, output), 2);
  assert.equal((await readFile(output, 'utf8')).split('\n').filter(Boolean).length, 2);
  assert.equal(benchmarkDue(100, null, 60), true);
  assert.equal(benchmarkDue(100, 50, 60), false);
  const active = join(root, 'active.txt');
  assert.equal(await readActive(active), null);
  await setActive(active, 'candidate-1');
  assert.equal(await readActive(active), 'candidate-1');
  console.log('operations artifact tests ok');
}

void main();