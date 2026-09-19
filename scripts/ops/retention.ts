import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export async function pruneFiles(root: string, olderThanMs: number, dryRun = false): Promise<readonly string[]> {
  const now = Date.now();
  const removed: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(root, entry.name);
    if (now - (await stat(path)).mtimeMs <= olderThanMs) continue;
    removed.push(path);
    if (!dryRun) await unlink(path);
  }
  return removed;
}