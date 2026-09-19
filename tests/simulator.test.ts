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
reducer.consume(`${separator}-heal${separator}p1a: Toxapex${separator}80/100`);
assert.equal(reducer.snapshot().active.p1?.hp, 80);
reducer.consume(`${separator}-status${separator}p1a: Toxapex${separator}psn`);
assert.equal(reducer.snapshot().active.p1?.status, 'psn');
reducer.consume(`${separator}-curestatus${separator}p1a: Toxapex${separator}psn`);
assert.equal(reducer.snapshot().active.p1?.status, null);
reducer.consume(`${separator}-boost${separator}p1a: Toxapex${separator}def${separator}2`);
reducer.consume(`${separator}-boost${separator}p1a: Toxapex${separator}def${separator}1`);
reducer.consume(`${separator}-unboost${separator}p1a: Toxapex${separator}spa${separator}1`);
assert.deepEqual(reducer.snapshot().active.p1?.boosts, { def: 3, spa: -1 });
reducer.consume(`${separator}-sidestart${separator}p2: Gholdengo${separator}Stealth Rock`);
reducer.consume(`${separator}-sidestart${separator}p2: Gholdengo${separator}Spikes`);
reducer.consume(`${separator}-sidestart${separator}p2: Gholdengo${separator}Reflect`);
assert.deepEqual(reducer.snapshot().sides.p2.hazards, { stealthrock: 1, spikes: 1 });
reducer.consume(`${separator}-sideend${separator}p2${separator}Spikes`);
assert.deepEqual(reducer.snapshot().sides.p2.hazards, { stealthrock: 1 });
assert.equal(reducer.snapshot().result, undefined);
reducer.consume(`${separator}win${separator}Stranger`);
assert.deepEqual(reducer.snapshot().result, { winner: null, reason: 'win:Stranger' });
const named = new BattleProtocolReducer({ Alice: 'p1', Bob: 'p2' });
named.consume(`${separator}win${separator}Bob`);
assert.deepEqual(named.snapshot().result, { winner: 'p2', reason: 'win:Bob' });
named.consume(`${separator}tie`);
assert.deepEqual(named.snapshot().result, { winner: null, reason: 'tie' });

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

const forceSwitchRequest = JSON.stringify({
  forceSwitch: [{ active: true, slot: 0, pokemon: 'p2a: Dragapult' }],
  side: { pokemon: [
    { ident: 'p2: Dragapult', active: true, condition: '0 fnt' },
    { ident: 'p2: Dodrio', active: false, condition: '204/204' },
  ] },
});
const forceActions = legalActionsFromRequest(`${separator}request${separator}${forceSwitchRequest}`);
assert.deepEqual(forceActions, [{ kind: 'switch', id: 'p2: Dodrio', target: 2 }]);
assert.deepEqual(legalActionsFromRequest(`${separator}request${separator}${JSON.stringify({ wait: true })}`), []);

console.log('simulator tests ok');