import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface CollectorCheckpoint {
  readonly run_id: string;
  readonly sequence: number;
  readonly updated_at: string;
}

export async function readCheckpoint(path: string): Promise<CollectorCheckpoint | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as CollectorCheckpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeCheckpoint(path: string, checkpoint: CollectorCheckpoint): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(checkpoint)}\n`, 'utf8');
  await rename(temporary, path);
}