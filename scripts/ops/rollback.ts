import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function readActive(path: string): Promise<string | null> {
  try { return (await readFile(path, 'utf8')).trim() || null; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function setActive(path: string, candidate: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${candidate}\n`, 'utf8');
  await rename(temporary, path);
}