import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { benchmarkDue } from './schedule.js';
import { evaluateCandidateArtifact, option } from './evaluate-candidate.js';

export interface EvaluationState {
  readonly lastRunAt: number | null;
}

export async function readEvaluationState(path: string): Promise<EvaluationState> {
  try {
    return JSON.parse((await readFile(path, 'utf8')).trim() || '{}') as EvaluationState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { lastRunAt: null };
    throw error;
  }
}

export async function writeEvaluationState(path: string, state: EvaluationState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export interface ScheduledEvaluationResult {
  readonly ran: boolean;
  readonly decision?: string;
  readonly campaignVersion?: string;
}

export async function runScheduledEvaluation(input: {
  statePath: string;
  campaignPath: string;
  candidateId: string;
  outPath?: string;
  intervalMs: number;
  now?: number;
}): Promise<ScheduledEvaluationResult> {
  const now = input.now ?? Date.now();
  const state = await readEvaluationState(input.statePath);
  if (!benchmarkDue(now, state.lastRunAt, input.intervalMs)) {
    return { ran: false };
  }
  const { decision, artifact } = await evaluateCandidateArtifact({
    campaignPath: input.campaignPath,
    candidateId: input.candidateId,
    outPath: input.outPath,
  });
  await writeEvaluationState(input.statePath, { lastRunAt: now });
  return { ran: true, decision, campaignVersion: artifact.campaignVersion };
}

async function main(): Promise<void> {
  const statePath = option('--state', 'data/derived/evaluation-state.json');
  const campaignPath = option('--campaign', 'data/campaigns/frozen-ou-v1.json');
  const candidateId = option('--candidate', 'baseline-v1');
  const outPath = option('--out', '');
  const intervalMs = Number(option('--interval-ms', '3600000'));
  const result = await runScheduledEvaluation({ statePath, campaignPath, candidateId, outPath, intervalMs });
  if (!result.ran) {
    console.log('SKIP scheduled evaluation: not due yet');
    return;
  }
  console.log(`RAN scheduled evaluation: ${result.decision} (${result.campaignVersion})`);
}

if (require.main === module) {
  void main();
}