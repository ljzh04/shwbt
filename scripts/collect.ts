import { randomUUID } from 'node:crypto';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';
import { readCheckpoint, writeCheckpoint } from '../packages/storage/src/checkpoint.js';

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

async function main(): Promise<void> {
  const rawPath = option('--raw', 'data/raw/collector.ndjson');
  const checkpointPath = option('--checkpoint', 'data/raw/collector.checkpoint.json');
  const runId = option('--run-id', randomUUID());
  const checkpoint = await readCheckpoint(checkpointPath);
  if (checkpoint && checkpoint.run_id !== runId) {
    throw new Error(`checkpoint belongs to run ${checkpoint.run_id}; pass --run-id ${checkpoint.run_id} to resume`);
  }
  const sequence = checkpoint?.sequence ?? 0;
  const writer = new RawEventWriter(rawPath, sequence);
  await writer.append({
    schema_version: '1.0.0', event_id: randomUUID(), run_id: runId, battle_id: `collector:${runId}`,
    sequence, timestamp: new Date().toISOString(), source: 'selfplay',
    simulator_commit: option('--simulator-commit', '2ddfa0476f8207e12e204b1c69f7c7683b17633c'),
    format_id: option('--format', 'gen9customgame'), agent_version: option('--agent-version', 'collector-dev'),
    payload_type: 'heartbeat', payload: { mode: 'selfplay', live_transport: false },
  });
  await writeCheckpoint(checkpointPath, { run_id: runId, sequence: sequence + 1, updated_at: new Date().toISOString() });
  console.log(`collector heartbeat written: ${runId} sequence ${sequence}`);
}

void main();