import assert from 'node:assert/strict';
import { chooseCandidateFrom, defaultPreservationRules, PreservingPolicy } from '../packages/agent/src/preserving-policy.js';
import type { BattleState, PokemonState } from '../packages/engine/src/types.js';

const pokemon = (slot: string, hp: number, maxHp: number): PokemonState => ({
  slot, species: `Mon-${slot}`, hp, maxHp, status: null, fainted: false, revealedMoves: [],
  movePp: {}, item: null, ability: null, boosts: {}, teraRevealed: false,
});

const state = (active: Partial<Record<'p1' | 'p2', { hp: number; maxHp: number }>>): BattleState => {
  const p1Roster = [pokemon('p1: Toxapex', 100, 400), pokemon('p1: Chansey', 400, 400)];
  const p2Roster = [pokemon('p2: Garchomp', 100, 100), pokemon('p2: Weavile', 100, 100)];
  return {
    turn: 1,
    active: {
      p1: active.p1 ? { ...p1Roster[0]!, ...active.p1 } : p1Roster[0]!,
      p2: active.p2 ? { ...p2Roster[0]!, ...active.p2 } : p2Roster[0]!,
    },
    sides: {
      p1: { player: 'p1', team: p1Roster, activeSlot: null, hazards: {}, volatile: {} },
      p2: { player: 'p2', team: p2Roster, activeSlot: null, hazards: {}, volatile: {} },
    },
    field: { weather: null, terrain: null, pseudoWeather: {} },
    choices: [],
    beliefs: { sets: {}, actions: {} },
  };
};

const legal = (moves: readonly string[], switchTargets: readonly number[] = []) => [
  ...moves.map((id) => ({ kind: 'move' as const, id })),
  ...switchTargets.map((target) => ({ kind: 'switch' as const, id: `p1: item${target}`, target })),
];

async function main(): Promise<void> {
  const stateNoContext = state({ p1: { hp: 300, maxHp: 400 } });
  const switchesQuick = legal(['tackle'], [2]);
  const preserved = chooseCandidateFrom({ state: stateNoContext, legalActions: switchesQuick }, defaultPreservationRules);
  assert.ok(preserved === null, 'healthy active and healthy foe should not override baseline');

  const critical = chooseCandidateFrom({
    state: state({ p1: { hp: 60, maxHp: 400 }, p2: { hp: 100, maxHp: 100 } }),
    legalActions: legal(['tackle', 'recover'], [2]),
  }, defaultPreservationRules);
  assert.ok(critical);
  assert.equal(critical.action.kind, 'switch');
  assert.equal(critical.action.target, 2);
  assert.equal(critical.reason.feature, 'structuralIntegrity');

  const lowNoRecovery = chooseCandidateFrom({
    state: state({ p1: { hp: 120, maxHp: 400 }, p2: { hp: 100, maxHp: 100 } }),
    legalActions: legal(['tackle'], [2]),
  }, defaultPreservationRules);
  assert.ok(lowNoRecovery);
  assert.equal(lowNoRecovery.action.kind, 'switch');

  const lowWithRecovery = chooseCandidateFrom({
    state: state({ p1: { hp: 120, maxHp: 400 }, p2: { hp: 100, maxHp: 100 } }),
    legalActions: legal(['tackle', 'recover'], [2]),
  }, defaultPreservationRules);
  assert.equal(lowWithRecovery, null, 'recover available at low (non-critical) HP should keep baseline');

  const finish = chooseCandidateFrom({
    state: state({ p1: { hp: 300, maxHp: 400 }, p2: { hp: 10, maxHp: 100 } }),
    legalActions: legal(['recover', 'tackle'], [2]),
  }, defaultPreservationRules);
  assert.ok(finish);
  assert.equal(finish.action.id, 'tackle');
  assert.equal(finish.reason.feature, 'winProgress');

  const decision = await new PreservingPolicy().choose({ state: stateNoContext, legalActions: legal(['tackle', 'recover'], [2]) });
  assert.equal(decision.action.id, 'recover', 'no override means baseline decision');
  assert.equal(decision.candidates[0]?.action.id, 'recover');

  const v2Rules = { ...defaultPreservationRules, tempoFaintLead: 2 };
  const aheadState = (() => {
    const base = state({ p1: { hp: 60, maxHp: 400 }, p2: { hp: 100, maxHp: 100 } });
    const p2Team = base.sides.p2.team.map((entry) => ({ ...entry, fainted: true }));
    return { ...base, sides: { ...base.sides, p2: { ...base.sides.p2, team: p2Team } } };
  })();
  const gated = chooseCandidateFrom({ state: aheadState, legalActions: legal(['tackle'], [2]) }, v2Rules);
  assert.equal(gated, null, 'ahead on faints (p1 0 vs p2 2) should suppress structural preservation');
  const criticalAhead = chooseCandidateFrom({
    state: { ...aheadState, sides: { ...aheadState.sides, p2: { ...aheadState.sides.p2, team: aheadState.sides.p2.team.map((entry, index) => index === 1 ? entry : { ...entry, fainted: false }) } } },
    legalActions: legal(['tackle'], [2]),
  }, v2Rules);
  assert.ok(criticalAhead, 'p1 ahead by 1 (0 vs 1, not >= 2) should still preserve');

  const trailing = chooseCandidateFrom({
    state: state({ p1: { hp: 60, maxHp: 400 }, p2: { hp: 100, maxHp: 100 } }),
    legalActions: legal(['tackle'], [2]),
  }, v2Rules);
  assert.ok(trailing, 'even/trailing low-HP still preserves');
  assert.equal(trailing.action.kind, 'switch');

  const v1KeepsGuard = chooseCandidateFrom({
    state: { ...aheadState },
    legalActions: legal(['tackle'], [2]),
  }, defaultPreservationRules);
  assert.ok(v1KeepsGuard, 'v1 defaults keep tempoFaintLead off, override still fires when ahead');

  const lowOwnFoeKillable = state({ p1: { hp: 120, maxHp: 400 }, p2: { hp: 10, maxHp: 100 } });
  const lowOwnFinishV1 = chooseCandidateFrom({
    state: lowOwnFoeKillable,
    legalActions: legal(['recover', 'tackle'], [2]),
  }, defaultPreservationRules);
  assert.equal(lowOwnFinishV1, null, 'v1 declines to finish at low own HP with recovery available');
  const v3Rules = { ...defaultPreservationRules, finishOwnHpThreshold: 0.2 };
  const lowOwnFinishV3 = chooseCandidateFrom({
    state: lowOwnFoeKillable,
    legalActions: legal(['recover', 'tackle'], [2]),
  }, v3Rules);
  assert.ok(lowOwnFinishV3, 'v3 commits to the finish when the foe is in kill range and own HP is above critical');
  assert.equal(lowOwnFinishV3.reason.feature, 'winProgress');
  assert.equal(lowOwnFinishV3.action.id, 'tackle');

  console.log('preserving policy tests ok');
}

void main();