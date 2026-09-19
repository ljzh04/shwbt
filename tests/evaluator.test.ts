import assert from 'node:assert/strict';
import { evaluateState } from '../packages/engine/src/evaluator.js';
import type { BattleState } from '../packages/engine/src/types.js';

const state: BattleState = {
  turn: 4, active: { p1: null, p2: null },
  sides: {
    p1: { player: 'p1', activeSlot: null, hazards: {}, volatile: {}, team: [
      { slot: 'p1a', species: 'Wall', hp: 100, maxHp: 100, status: null, fainted: false, revealedMoves: [], movePp: {}, item: null, ability: null, boosts: {}, teraRevealed: false },
    ] },
    p2: { player: 'p2', activeSlot: null, hazards: { stealthrock: 1 }, volatile: {}, team: [
      { slot: 'p2a', species: 'Threat', hp: 50, maxHp: 100, status: 'psn', fainted: false, revealedMoves: ['recover'], movePp: { recover: 0 }, item: 'leftovers', ability: null, boosts: {}, teraRevealed: false },
    ] },
  },
  field: { weather: null, terrain: null, pseudoWeather: {} }, choices: [{ kind: 'move', id: 'recover' }], beliefs: { sets: {}, actions: {} },
};
const features = evaluateState(state);
assert.equal(features.statusPressure, 1);
assert.equal(features.opponentPPDepletion, 1);
assert.equal(features.hazardPressure > 0, true);
assert.equal(features.informationGain > 0, true);
assert.equal(features.catastrophicRisk, 0);
const mirrored = evaluateState(state, 'p2');
assert.equal(mirrored.statusPressure, 0);
assert.equal(mirrored.hazardPressure, 0);
assert.equal(mirrored.opponentPPDepletion, 0);
assert.equal(mirrored.informationGain, 0);
console.log('evaluator tests ok');