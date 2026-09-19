import { readFile } from 'node:fs/promises';
import { DecisionSink } from './decision-sink.js';
import type { RawEvent } from './raw-event-writer.js';

export interface ReplayIngestResult {
  readonly events: number;
  readonly decisions: number;
  readonly invalid: number;
}

export async function ingestReplay(path: string, sink: DecisionSink): Promise<ReplayIngestResult> {
  const lines = (await readFile(path, 'utf8')).split('\n').filter((line) => line.trim().length > 0);
  let decisions = 0;
  let invalid = 0;
  for (const line of lines) {
    let event: RawEvent;
    try {
      event = JSON.parse(line) as RawEvent;
    } catch {
      invalid += 1;
      continue;
    }
    if (await sink.accept(event)) decisions += 1;
  }
  return { events: lines.length, decisions, invalid };
}