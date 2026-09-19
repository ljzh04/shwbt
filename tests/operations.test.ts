import assert from 'node:assert/strict';
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CollectorHealthTracker } from '../scripts/ops/collector-health.js';
import { pruneFiles } from '../scripts/ops/retention.js';

async function main(): Promise<void> {
	const health = new CollectorHealthTracker();
	health.heartbeat(); health.battleCompleted(); health.battleFailed('bad battle');
	assert.deepEqual(health.snapshot(), { ...health.snapshot(), heartbeats: 1, battlesCompleted: 1, battlesFailed: 1, lastError: 'bad battle' });
	const root = await mkdtemp(join(tmpdir(), 'stall-ai-retention-'));
	const file = join(root, 'old.ndjson');
	await writeFile(file, 'raw');
	await utimes(file, 0, 0);
	const dryRun = await pruneFiles(root, 1, true);
	assert.deepEqual(dryRun, [file]);
	assert.deepEqual(await pruneFiles(root, 1), [file]);
	console.log('operations tests ok');
}

void main();