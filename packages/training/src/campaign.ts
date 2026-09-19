import type { Action, BattleState, PlayerId } from '../../engine/src/types.js';
import type { SearchPolicy } from '../../agent/src/interfaces.js';
import { ShowdownBattle } from '../../simulator/src/battle-stream.js';

export interface CampaignScenario {
  readonly id: string;
  readonly seed: number;
  readonly p1Team: string;
  readonly p2Team: string;
  readonly policySide: PlayerId;
  readonly maxTurns: number;
}

export interface FrozenCampaign {
  readonly version: string;
  readonly simulatorCommit: string;
  readonly referencePolicyId: string;
  readonly scenarios: readonly CampaignScenario[];
}

export interface CampaignOutcome {
  readonly scenarioId: string;
  readonly winner: PlayerId | null;
  readonly turns: number;
  readonly reason: string;
  readonly ownFainted: number;
  readonly foeFainted: number;
  readonly catastrophic: boolean;
}

export interface CampaignResult {
  readonly policyId: string;
  readonly campaignVersion: string;
  readonly won: number;
  readonly lost: number;
  readonly ties: number;
  readonly catastrophicLosses: number;
  readonly winRate: number;
  readonly outcomes: readonly CampaignOutcome[];
}

// ponytail: catastrophic losses are decisive losses without progress or with an early wipe.
export function classifyCampaignOutcome(input: {
  winner: PlayerId | null;
  policySide: PlayerId;
  ownFainted: number;
  foeFainted: number;
  turns: number;
}): boolean {
  const { winner, policySide, ownFainted, foeFainted, turns } = input;
  if (winner === null || winner === policySide) return false;
  return ownFainted >= 6 || foeFainted === 0 || turns <= 3;
}

function countFaints(payload: string, onFaint: (side: PlayerId) => void): void {
  for (const line of payload.split('\n')) {
    const match = /^\|faint\|(p[12])/.exec(line.trim());
    if (match && (match[1] === 'p1' || match[1] === 'p2')) onFaint(match[1]);
  }
}

function isLegal(legal: readonly Action[], chosen: Action): boolean {
  return legal.some((action) => action.kind === chosen.kind && action.id === chosen.id);
}

async function choose(control: SearchPolicy, legal: readonly Action[], state: BattleState): Promise<Action | null> {
  try {
    const decision = await control.choose({ state, legalActions: legal });
    if (isLegal(legal, decision.action)) return decision.action;
  } catch {
    // fall through to first legal action
  }
  return legal[0] ?? null;
}

export async function runCampaign(
  policyId: string,
  policy: SearchPolicy,
  campaign: FrozenCampaign,
  reference: SearchPolicy,
): Promise<CampaignResult> {
  const outcomes: CampaignOutcome[] = [];
  for (const scenario of campaign.scenarios) {
    const fainted = { p1: 0, p2: 0 };
    const battle = new ShowdownBattle('all', (type, payload) => {
      if (type === 'update' || type === 'sideupdate') countFaints(payload, (side) => { fainted[side] += 1; });
    });
    await battle.start({ formatId: 'gen9customgame', p1Name: 'p1', p2Name: 'p2', p1Team: scenario.p1Team, p2Team: scenario.p2Team, seed: scenario.seed });
    for (let step = 0; step <= scenario.maxTurns && !battle.isFinished(); step += 1) {
      if (battle.snapshot().turn >= scenario.maxTurns) break;
      const [p1, p2] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
      if (p1.length === 0 && p2.length === 0) {
        await battle.flush();
        continue;
      }
      await battle.flush();
      const state = battle.snapshot();
      const [a1, a2] = await Promise.all([
        p1.length > 0 ? choose(scenario.policySide === 'p1' ? policy : reference, p1, state) : Promise.resolve(null),
        p2.length > 0 ? choose(scenario.policySide === 'p2' ? policy : reference, p2, state) : Promise.resolve(null),
      ]);
      await Promise.all([
        a1 ? battle.choose('p1', a1) : Promise.resolve(),
        a2 ? battle.choose('p2', a2) : Promise.resolve(),
      ]);
    }
    await battle.flush();
    const result = battle.result();
    const winner = result?.winner ?? null;
    const reason = battle.isFinished() ? (result?.reason ?? 'finished') : 'max_turns';
    const turns = battle.snapshot().turn;
    const ownFainted = scenario.policySide === 'p1' ? fainted.p1 : fainted.p2;
    const foeFainted = scenario.policySide === 'p1' ? fainted.p2 : fainted.p1;
    outcomes.push({
      scenarioId: scenario.id,
      winner,
      turns,
      reason,
      ownFainted,
      foeFainted,
      catastrophic: classifyCampaignOutcome({ winner, policySide: scenario.policySide, ownFainted, foeFainted, turns }),
    });
  }
  const policyWins = outcomes.filter((outcome) => {
    return (outcome.winner === 'p1' && campaign.scenarios.find((scenario) => scenario.id === outcome.scenarioId)?.policySide === 'p1')
      || (outcome.winner === 'p2' && campaign.scenarios.find((scenario) => scenario.id === outcome.scenarioId)?.policySide === 'p2');
  }).length;
  const decisive = outcomes.filter((outcome) => outcome.winner !== null).length;
  return {
    policyId,
    campaignVersion: campaign.version,
    won: policyWins,
    lost: decisive - policyWins,
    ties: outcomes.length - decisive,
    catastrophicLosses: outcomes.filter((outcome) => outcome.catastrophic).length,
    winRate: outcomes.length === 0 ? 0 : policyWins / outcomes.length,
    outcomes,
  };
}