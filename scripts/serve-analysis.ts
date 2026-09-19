import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createAnalysisServer } from '../packages/agent/src/analysis-server.js';
import { readAnalysisSnapshots } from '../packages/storage/src/analysis-store.js';
import { LiveBattleStore } from '../packages/storage/src/live-ingest.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

const SIMULATOR_COMMIT = '2ddfa0476f8207e12e204b1c69f7c7683b17633c';

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

async function main(): Promise<void> {
  const decisions = option('--decisions', 'data/derived/selfplay-decisions.ndjson');
  const port = Number(option('--port', '3100'));
  const panelPath = resolve(option('--panel', join('apps', 'showdown-panel', 'panel.html')));
  const panelHtml = await readFile(panelPath, 'utf8');
  const liveStore = new LiveBattleStore(new RawEventWriter(decisions), SIMULATOR_COMMIT);
  const server = createAnalysisServer(() => readAnalysisSnapshots(decisions), { panelHtml }, liveStore);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`analysis server listening on ${port} reading ${decisions}`);
}

void main();
