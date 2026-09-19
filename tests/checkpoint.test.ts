import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCheckpoint, writeCheckpoint } from '../packages/storage/src/checkpoint.js';

async function main(): Promise<void> {
	const directory = await mkdtemp(join(tmpdir(), 'stall-ai-checkpoint-'));
	const path = join(directory, 'collector', 'checkpoint.json');
	assert.equal(await readCheckpoint(path), null);
	await writeCheckpoint(path, { run_id: 'run-1', sequence: 3, updated_at: '2026-09-19T00:00:00.000Z' });
	assert.deepEqual(await readCheckpoint(path), { run_id: 'run-1', sequence: 3, updated_at: '2026-09-19T00:00:00.000Z' });
	console.log('checkpoint tests ok');
}

void main();