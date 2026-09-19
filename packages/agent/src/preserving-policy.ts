import { DeterministicBaseline, defaultConfig } from './baseline.js';
import type { ActionDecision, SearchInput, SearchPolicy } from './interfaces.js';
import type {
  Action,
  BattleState,
  CandidateScore,
  EvaluationConfig,
  EvaluationVector,
  PlayerId,
  ReasonContribution,
} from '../../engine/src/types.js';

const recoveryMoves = new Set(['recover', 'roost', 'softboiled', 'slackoff', 'moonlight', 'wish']);
const statusMoves = new Set(['toxic', 'thunderwave', 'willowisp', 'leechseed', 'spore']);
const hazardMoves = new Set(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']);
const protectiveMoves = new Set(['protect', 'substitute', 'defog', 'sleeptalk', 'curse', 'rest', 'banefulbunker', 'wish']);

export interface PreservationRules {
  readonly lowHpThreshold: number;
  readonly criticalHpThreshold: number;
  readonly healthySwitchThreshold: number;
  readonly killThreshold: number;
  readonly tempoFaintLead: number;
  readonly finishOwnHpThreshold: number;
}

export const defaultPreservationRules: PreservationRules = {
  lowHpThreshold: 0.35,
  criticalHpThreshold: 0.2,
  healthySwitchThreshold: 0.85,
  killThreshold: 0.15,
  tempoFaintLead: 0,
  finishOwnHpThreshold: 0.35,
};

export const v2PreservationRules: PreservationRules = { ...defaultPreservationRules, tempoFaintLead: 2 };
export const v3PreservationRules: PreservationRules = { ...defaultPreservationRules, finishOwnHpThreshold: 0.2 };

const emptyVector: EvaluationVector = {
  winProgress: 0, opponentPPDepletion: 0, forcedSwitchValue: 0, statusPressure: 0, hazardPressure: 0,
  informationGain: 0, structuralIntegrity: 0, decisionBurden: 0, catastrophicRisk: 0, irreversibleResourceLoss: 0,
};

function normalize(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ownSide(actions: readonly Action[]): PlayerId | null {
  for (const action of actions) {
    if (action.kind === 'switch') {
      const match = /^(p[12]):/.exec(action.id);
      if (match) return match[1] as PlayerId;
    }
  }
  return null;
}

function foeOf(player: PlayerId): PlayerId {
  return player === 'p1' ? 'p2' : 'p1';
}

function hpFraction(pokemon: { hp: number; maxHp: number } | null): number {
  return pokemon && pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 1;
}

function switchTargetHp(state: BattleState, side: PlayerId, action: Action): number {
  const roster = state.sides[side].team;
  const direct = roster.find((entry) => entry.slot === action.id);
  if (direct) return hpFraction(direct);
  const index = typeof action.target === 'number' ? action.target - 1 : Number(action.id) - 1;
  const pokemon = roster[index];
  return pokemon ? hpFraction(pokemon) : 0;
}

function isAheadOnFaints(state: BattleState, side: PlayerId, faintLead: number): boolean {
  if (faintLead <= 0) return false;
  const ownFaints = state.sides[side].team.filter((entry) => entry.fainted).length;
  const foeFaints = state.sides[foeOf(side)].team.filter((entry) => entry.fainted).length;
  return ownFaints <= foeFaints - faintLead;
}

export function chooseCandidateFrom(input: SearchInput, rules: PreservationRules): { action: Action; reason: ReasonContribution } | null {
  const side = ownSide(input.legalActions);
  if (!side) return null;
  const state = input.state;
  const me = state.active[side];
  const foe = state.active[foeOf(side)];
  const meHp = hpFraction(me);
  const foeHp = hpFraction(foe);
  const hasRecovery = input.legalActions.some((action) => action.kind === 'move' && recoveryMoves.has(normalize(action.id)));
  const switches = input.legalActions
    .filter((action) => action.kind === 'switch')
    .map((action) => ({ action, targetHp: switchTargetHp(state, side, action) }))
    .filter((entry) => entry.targetHp >= rules.healthySwitchThreshold);
  const damaging = input.legalActions.filter((action) =>
    action.kind === 'move'
    && !recoveryMoves.has(normalize(action.id))
    && !statusMoves.has(normalize(action.id))
    && !hazardMoves.has(normalize(action.id))
    && !protectiveMoves.has(normalize(action.id)),
  );

  if (meHp <= rules.criticalHpThreshold && switches.length > 0 && !isAheadOnFaints(state, side, rules.tempoFaintLead)) {
    return { action: switches[0]!.action, reason: { feature: 'structuralIntegrity', contribution: 1 } };
  }
  if (meHp <= rules.lowHpThreshold && !hasRecovery && switches.length > 0 && !isAheadOnFaints(state, side, rules.tempoFaintLead)) {
    return { action: switches[0]!.action, reason: { feature: 'structuralIntegrity', contribution: 1 } };
  }
  if (foe && foeHp <= rules.killThreshold && meHp > rules.finishOwnHpThreshold && damaging.length > 0) {
    return { action: damaging[0]!, reason: { feature: 'winProgress', contribution: 1 } };
  }
  return null;
}

export class PreservingPolicy implements SearchPolicy {
  private readonly base: DeterministicBaseline;

  constructor(
    private readonly rules: PreservationRules = defaultPreservationRules,
    config: EvaluationConfig = defaultConfig,
  ) {
    this.base = new DeterministicBaseline(config);
  }

  async choose(input: SearchInput): Promise<ActionDecision> {
    if (input.legalActions.length === 0) throw new Error('cannot choose from empty legal action set');
    const baseline = await this.base.choose(input);
    const override = chooseCandidateFrom(input, this.rules);
    if (!override) return baseline;
    const selected = baseline.candidates.find((candidate) =>
      candidate.action.kind === override.action.kind
      && candidate.action.id === override.action.id
      && candidate.action.target === override.action.target)
      ?? {
        action: override.action,
        expectedValue: override.reason.contribution,
        riskAdjustedValue: override.reason.contribution,
        featureDelta: baseline.candidates[0]?.featureDelta ?? emptyVector,
      };
    const ranked: CandidateScore[] = [selected, ...baseline.candidates.filter((candidate) => candidate !== selected)];
    return { action: selected.action, score: selected.riskAdjustedValue, candidates: ranked, reasons: [override.reason] };
  }
}