import assert from 'node:assert/strict';
import { contentHash, validateManifest, validateSplitIsolation, type DatasetManifest, type DatasetSplits } from '../packages/storage/src/dataset-manifest.js';

const splits: DatasetSplits = { train: ['battle-a'], validation: ['battle-b'], test: ['battle-c'] };
const manifest: DatasetManifest = {
  dataset_id: 'dataset-1', dataset_version: 'v1', created_at: '2026-09-19T00:00:00.000Z', schema_version: '1.0.0',
  source_runs: ['run-1'], feature_version: 'features-1', simulator_commits: ['a'.repeat(40)], objective_versions: ['objective-1'],
  split_policy: { name: 'battle-level', holdout_frozen: true, group_key: 'battle_id' },
  counts: { battles: 3, decision_points: 4 }, content_hash: contentHash(splits),
};
assert.deepEqual(validateSplitIsolation(splits), []);
assert.deepEqual(validateManifest(manifest, splits), []);
assert.equal(validateSplitIsolation({ ...splits, test: ['battle-a'] }).length, 1);
assert.ok(validateManifest({ ...manifest, content_hash: 'wrong' }, splits).includes('content hash does not match splits'));
console.log('dataset manifest tests ok');