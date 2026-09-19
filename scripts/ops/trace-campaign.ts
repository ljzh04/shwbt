import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ShowdownBattle } from '../../packages/simulator/src/battle-stream.js';
import type { SearchPolicy } from '../../packages/agent/src/interfaces.js';
import type { FrozenCampaign } from '../../packages/training/src/campaign.js';
import { defaultPolicyRegistry } from '../../packages/training/src/campaign-gate.js';
import { chooseCandidateFrom, defaultPreservationRules } from '../../packages/agent/src/preserving-policy.js';
import type { Action, BattleState, PlayerId } from '../../packages/engine/src/types.js';

interface TraceEntry {
  turn: number;
  side: PlayerId;
  activeHp: { p1: string; p2: string };
  legal: number;
  choices: readonly Action[];
  chosen: string;
  override: string;
}

function rawHp(state: BattleState, side: PlayerId): string {
  const party = state.active[side];
  return party ? `${party.hp}/${party.maxHp}` : '-';
}

function describeOverride(state: BattleState, legal: readonly Action[]): string {
  const override = chooseCandidateFrom({ state, legalActions: legal }, defaultPreservationRules);
  return override ? `${override.reason.feature}:${override.action.kind}:${override.action.id}` : '-';
}

function isLegal(legal: readonly Action[], chosen: Action): boolean {
  return legal.some((action) => action.kind === chosen.kind && action.id === chosen.id);
}

async function choose(control: SearchPolicy, legal: readonly Action[], state: BattleState): Promise<Action | null> {
  try {
    const decision = await control.choose({ state, legalActions: legal });
    if (isLegal(legal, decision.action)) return decision.action;
  } catch { /* fallback */ }
  return legal[0] ?? null;
}

async function traceScenario(
  scenario: { id: string; seed: number; p1Team: string; p2Team: string; policySide: PlayerId; maxTurns: number },
  policy: SearchPolicy,
): Promise<TraceEntry[]> {
  const entries: TraceEntry[] = [];
  const battle = new ShowdownBattle('all', () => undefined, () => undefined);
  await battle.start({
    formatId: 'gen9customgame', p1Name: 'p1', p2Name: 'p2',
    p1Team: readFileSync(resolve(scenario.p1Team), 'utf8'), p2Team: readFileSync(resolve(scenario.p2Team), 'utf8'),
    seed: scenario.seed,
  });
  for (let step = 0; step <= scenario.maxTurns && !battle.isFinished(); step += 1) {
    if (battle.snapshot().turn >= scenario.maxTurns) break;
    const [p1, p2] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
    if (p1.length === 0 && p2.length === 0) { await battle.flush(); continue; }
    await battle.flush();
    const state = battle.snapshot();
    const [a1, a2] = await Promise.all([
      p1.length > 0 ? choose(scenario.policySide === 'p1' ? policy : baselinePolicy(), p1, state) : Promise.resolve(null),
      p2.length > 0 ? choose(scenario.policySide === 'p2' ? policy : baselinePolicy(), p2, state) : Promise.resolve(null),
    ]);
    for (const [side, legal, chosen] of [[p1, p1, a1], [p2, p2, a2]] as const) {
      if (legal === undefined) continue;
      if (chosen) {
entries.push({
          turn: state.turn,
          side: side as unknown as PlayerId,
          activeHp: { p1: rawHp(state, 'p1'), p2: rawHp(state, 'p2') },
          legal: legal.length,
          choices: [],
          chosen: `${chosen.kind}:${chosen.id}`,
          override: describeOverride(state, legal),
        });
      }
    }
    await Promise.all([a1 ? battle.choose('p1', a1) : Promise.resolve(), a2 ? battle.choose('p2', a2) : Promise.resolve()]);
  }
  await battle.flush();
  return entries;
}

function baselinePolicy(): SearchPolicy {
  return defaultPolicyRegistry()['baseline-v1']!();
}

async function main(): Promise<void> {
  const [campaignPath, scenarioId] = process.argv.slice(2);
  if (!campaignPath || !scenarioId) throw new Error('usage: trace-campaign <campaign.json> <scenarioId>');
  const campaign = JSON.parse(readFileSync(campaignPath, 'utf8')) as FrozenCampaign;
  const scenario = campaign.scenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) throw new Error(`no scenario ${scenarioId}`);
  const base = defaultPolicyRegistry()['baseline-v1']!();
  const candidate = defaultPolicyRegistry()['preserving-stall-v1']!();
  const baseTrace = await traceScenario(scenario, base);
  const candidateTrace = await traceScenario(scenario, candidate);
  for (const trace of baseTrace) {
    if (trace.override !== '-') console.log(`base  T${trace.turn} ${trace.side} hp(p1=${trace.activeHp.p1} p2=${trace.activeHp.p2}) chosen=${trace.chosen} override=${trace.override}`);
  }
  for (const trace of candidateTrace) {
    if (trace.override !== '-') console.log(`cand  T${trace.turn} ${trace.side} hp(p1=${trace.activeHp.p1} p2=${trace.activeHp.p2}) chosen=${trace.chosen} override=${trace.override}`);
  }
  let diffs = 0;
  const max = Math.max(baseTrace.length, candidateTrace.length);
  for (let i = 0; i < max; i += 1) {
    const a = baseTrace[i];
    const b = candidateTrace[i];
    if (!a || !b) { console.log(`trace-length mismatch ${baseTrace.length} vs ${candidateTrace.length}`); break; }
    if (a.side !== b.side || a.chosen !== b.chosen) {
      diffs += 1;
      if (diffs <= 5) console.log(`DIFF #${diffs} T${a.turn} ${a.side} hp(p1=${a.activeHp.p1} p2=${a.activeHp.p2}) base=${a.chosen} cand=${b.chosen} baseOverride=${a.override} candOverride=${b.override}`);
    }
  }
  const count = (trace: TraceEntry[], reason?: string) => {
    const entries = reason ? trace.filter((entry) => entry.override.startsWith(reason)) : trace.filter((entry) => entry.override !== '-');
    return entries.length;
  };
  console.log(`scenario ${scenarioId}: ${baseTrace.length} windows, ${diffs} divergent, baseTrace overrides=${count(baseTrace)} (structural=${count(baseTrace, 'structuralIntegrity')} win=${count(baseTrace, 'winProgress')}), candidateTrace overrides=${count(candidateTrace)} (structural=${count(candidateTrace, 'structuralIntegrity')} win=${count(candidateTrace, 'winProgress')})`);
}

void main();