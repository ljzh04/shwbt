import assert from 'node:assert/strict';
import { DeterministicBaseline } from '../packages/agent/src/baseline.js';
import type { BattleState } from '../packages/engine/src/types.js';

const state: BattleState = {
  turn: 1, active: { p1: null, p2: null },
  sides: {
    p1: { player: 'p1', team: [], activeSlot: null, hazards: {}, volatile: {} },
    p2: { player: 'p2', team: [], activeSlot: null, hazards: {}, volatile: {} },
  }, field: { weather: null, terrain: null, pseudoWeather: {} }, choices: [], beliefs: { sets: {}, actions: {} },
};
async function main(): Promise<void> {
  const decision = await new DeterministicBaseline().choose({
    state,
    legalActions: [{ kind: 'move', id: 'tackle' }, { kind: 'move', id: 'recover' }, { kind: 'switch', id: '2', target: 2 }],
  });
  assert.equal(decision.action.id, 'recover');
  assert.equal(decision.candidates.length, 3);
  assert.equal(decision.reasons[0]?.feature, 'structuralIntegrity');
  console.log('baseline tests ok');
}

void main();