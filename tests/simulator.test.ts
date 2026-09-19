import assert from 'node:assert/strict';
import { legalActionsFromRequest } from '../packages/simulator/src/legal-actions.js';
import { BattleProtocolReducer } from '../packages/simulator/src/protocol-reducer.js';
import { hashBattleState } from '../packages/simulator/src/state-hash.js';
import type { BattleState } from '../packages/engine/src/types.js';

const emptyState = (turn: number): BattleState => ({
  turn,
  active: { p1: null, p2: null },
  sides: {
    p1: { player: 'p1', team: [], activeSlot: null, hazards: {}, volatile: {} },
    p2: { player: 'p2', team: [], activeSlot: null, hazards: {}, volatile: {} },
  },
  field: { weather: null, terrain: null, pseudoWeather: {} },
  choices: [],
  beliefs: { sets: {}, actions: {} },
});

const first = { ...emptyState(1), field: { terrain: null, weather: 'RainDance', pseudoWeather: {} } };
const second = { ...emptyState(1), field: { pseudoWeather: {}, weather: 'RainDance', terrain: null } };
assert.equal(hashBattleState(first), hashBattleState(second));
assert.notEqual(hashBattleState(first), hashBattleState(emptyState(2)));

const separator = String.fromCharCode(124);
const reducer = new BattleProtocolReducer();
reducer.consume(`${separator}turn${separator}3`);
reducer.consume(`${separator}switch${separator}p1a: Toxapex${separator}100/100`);
reducer.consume(`${separator}move${separator}p1a: Toxapex${separator}Recover`);
reducer.consume(`${separator}-damage${separator}p1a: Toxapex${separator}50/100`);
assert.equal(reducer.snapshot().turn, 3);
assert.equal(reducer.snapshot().active.p1?.hp, 50);
assert.deepEqual(reducer.snapshot().active.p1?.revealedMoves, ['Recover']);

const request = JSON.stringify({
  active: [{ moves: [{ id: 'recover', disabled: false }, { id: 'toxic', disabled: true }] }],
  side: { pokemon: [
    { ident: 'p1: Toxapex', active: true, condition: '100/100' },
    { ident: 'p1: Chansey', active: false, condition: '100/100' },
  ] },
});
const actions = legalActionsFromRequest(`${separator}request${separator}${request}`);
assert.deepEqual(actions, [
  { kind: 'move', id: 'recover' },
  { kind: 'switch', id: 'p1: Chansey', target: 2 },
]);

console.log('simulator tests ok');