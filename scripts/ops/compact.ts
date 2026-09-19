import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function compactNdjson(input: string, output: string): Promise<number> {
  const lines = (await readFile(input, 'utf8')).split('\n').filter((line) => line.trim().length > 0);
  const records = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : ''), 'utf8');
  await rename(temporary, output);
  return records.length;
}