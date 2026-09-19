import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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

export class PersistentDeduplicatingEventSink {
  private readonly seen = new Set<string>();
  private pending = Promise.resolve();
  private initialized: Promise<void>;

  constructor(
    private readonly indexPath: string,
    private readonly append: (event: RawEvent) => Promise<void>,
  ) {
    this.initialized = this.load();
  }

  async appendIfNew(event: RawEvent): Promise<boolean> {
    await this.initialized;
    const operation = this.pending.then(async () => {
      const hash = rawEventHash(event);
      if (this.seen.has(hash)) return false;
      await this.append(event);
      await mkdir(dirname(this.indexPath), { recursive: true });
      await appendFile(this.indexPath, `${hash}\n`, 'utf8');
      this.seen.add(hash);
      return true;
    });
    this.pending = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async load(): Promise<void> {
    try {
      const content = await readFile(this.indexPath, 'utf8');
      for (const hash of content.split('\n')) if (hash) this.seen.add(hash);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}