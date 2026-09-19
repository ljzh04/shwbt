import { readFile } from 'node:fs/promises';
import type { PredictionSnapshot } from '../../agent/src/analysis-snapshot.js';
import type { RawEvent } from './raw-event-writer.js';

// ponytail: full-file read per call; NDJSON decision files stay small and local.
export async function readAnalysisSnapshots(path: string): Promise<PredictionSnapshot[]> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const snapshots: PredictionSnapshot[] = [];
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue;
    try {
      const event = JSON.parse(line) as RawEvent;
      if (event.payload_type === 'analysis') snapshots.push(event.payload as unknown as PredictionSnapshot);
    } catch {
      continue;
    }
  }
  return snapshots;
}
