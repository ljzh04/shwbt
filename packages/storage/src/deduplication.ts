import { createHash } from 'node:crypto';
import type { RawEvent } from './raw-event-writer.js';

export function rawEventHash(event: RawEvent): string {
  return createHash('sha256').update(JSON.stringify(event)).digest('hex');
}

export class DeduplicatingEventSink {
  private readonly seen = new Set<string>();

  constructor(private readonly append: (event: RawEvent) => Promise<void>) {}

  async appendIfNew(event: RawEvent): Promise<boolean> {
    const hash = rawEventHash(event);
    if (this.seen.has(hash)) return false;
    await this.append(event);
    this.seen.add(hash);
    return true;
  }
}