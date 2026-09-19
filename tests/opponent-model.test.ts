import assert from 'node:assert/strict';
import { HeuristicOpponentModel } from '../packages/agent/src/opponent-model.js';
import type { BattleState } from '../packages/engine/src/types.js';

const state: BattleState = {
  turn: 1, active: { p1: null, p2: null },
  sides: {
    p1: { player: 'p1', activeSlot: null, hazards: {}, volatile: {}, team: [] },
    p2: { player: 'p2', activeSlot: 'p2a', hazards: {}, volatile: {}, team: [{ slot: 'p2a', species: 'Wall', hp: 100, maxHp: 100, status: null, fainted: false, revealedMoves: [], movePp: {}, item: null, ability: null, boosts: {}, teraRevealed: false }] },
  }, field: { weather: null, terrain: null, pseudoWeather: {} }, choices: [], beliefs: { sets: {}, actions: {} },
};
const move = (id: string) => ({ kind: 'move' as const, id });
const model = new HeuristicOpponentModel(
  [{ slot: 'p2a', action: move('recover'), probability: 1 }, { slot: 'p2a', action: move('toxic'), probability: 1 }],
  [{ slot: 'p2a', setId: 'wall-a', probability: 1 }, { slot: 'p2a', setId: 'wall-b', probability: 1 }],
);
model.update({ turn: 1, eventType: 'opponent_action', payload: { slot: 'p2a', action: move('toxic'), legalActions: [move('recover'), move('toxic')] } });
const actions = model.predictActions(state).actions;
assert.equal(actions[0]?.action.id, 'toxic');
assert.equal(actions.reduce((sum, entry) => sum + entry.probability, 0), 1);
model.update({ turn: 1, eventType: 'revealed_set', payload: { slot: 'p2a', setId: 'wall-b' } });
assert.deepEqual(model.predictSets(state).hypotheses, [{ pokemonSlot: 'p2a', setId: 'wall-b', probability: 1 }]);
console.log('opponent model tests ok');