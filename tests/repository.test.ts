import assert from 'node:assert/strict';
import { MetadataRepository, type QueryClient } from '../packages/storage/src/repository.js';

class FakeClient implements QueryClient {
  readonly calls: { text: string; values: readonly unknown[] }[] = [];
  async query(text: string, values: readonly unknown[] = []): Promise<{ rows: readonly never[] }> {
    this.calls.push({ text, values });
    return { rows: [] };
  }
}

async function main(): Promise<void> {
  const client = new FakeClient();
  const repository = new MetadataRepository(client);
  await repository.insertBattle({ id: 'battle-1', formatId: 'gen9ou', simulatorCommit: 'a'.repeat(40), seed: 1, winner: 'p1' });
  await repository.insertDatasetManifest({
    dataset_id: 'dataset-1', dataset_version: 'v1', created_at: '2026-09-19T00:00:00.000Z', schema_version: '1.0.0', source_runs: [], feature_version: 'f1', simulator_commits: [], objective_versions: [], split_policy: { name: 'battle-level', holdout_frozen: true, group_key: 'battle_id' }, counts: { battles: 0, decision_points: 0 }, content_hash: 'hash',
  });
  assert.equal(client.calls.length, 2);
  assert.match(client.calls[0]!.text, /insert into battles/);
  assert.equal(client.calls[0]!.values[0], 'battle-1');
  console.log('repository tests ok');
}

void main();