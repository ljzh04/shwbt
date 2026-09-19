import assert from 'node:assert/strict';
import { DeterministicBaseline } from '../packages/agent/src/baseline.js';
import { buildAnalysisSnapshot } from '../packages/agent/src/analysis-snapshot.js';
import { hashBattleState } from '../packages/simulator/src/state-hash.js';
import type { BattleState } from '../packages/engine/src/types.ts';

const state: BattleState = {
  turn: 37,
  active: {
    p1: { slot: 'p1a', species: 'Blissey', hp: 400, maxHp: 600, status: null, fainted: false, revealedMoves: ['Recover'], movePp: {}, item: null, ability: null, boosts: {}, teraRevealed: false },
    p2: { slot: 'p2a', species: 'Gholdengo', hp: 180, maxHp: 300, status: null, fainted: false, revealedMoves: ['Shadow Ball'], movePp: {}, item: null, ability: null, boosts: {}, teraRevealed: false },
  },
  sides: {
    p1: { player: 'p1', team: [], activeSlot: 'p1a', hazards: {}, volatile: {} },
    p2: { player: 'p2', team: [], activeSlot: 'p2a', hazards: { stealthrock: 1 }, volatile: {} },
  },
  field: { weather: null, terrain: null, pseudoWeather: {} },
  choices: [],
  beliefs: { sets: {}, actions: {} },
};

async function main(): Promise<void> {
const decision = await new DeterministicBaseline().choose({
  state,
  legalActions: [{ kind: 'move', id: 'recover' }, { kind: 'switch', id: 'p1: Chansey', target: 2 }],
});

const snapshot = buildAnalysisSnapshot({
  battleId: 'test-battle',
  state,
  decision,
  simulatorCommit: '2ddfa0476f8207e12e204b1c69f7c7683b17633c',
  agentVersion: '0.1.0',
});

assert.equal(snapshot.turn, 37);
assert.equal(snapshot.stateHash, hashBattleState(state));
assert.equal(snapshot.active.ours.species, 'Blissey');
assert.equal(snapshot.active.opponent.species, 'Gholdengo');
assert.equal(snapshot.active.ours.kind, 'KNOWN');
assert.deepEqual(snapshot.active.opponent.hazards, { stealthrock: 1 });
assert.equal(snapshot.candidates.length, 2);
assert.deepEqual(snapshot.opponentBelief, { actions: [], sets: [] });
assert.equal(snapshot.provenance.simulatorCommit, '2ddfa0476f8207e12e204b1c69f7c7683b17633c');

console.log('analysis-snapshot ok', snapshot.stateHash);
}

void main();
