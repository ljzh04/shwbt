import assert from 'node:assert/strict';
import { evaluateExpectedValue } from '../packages/agent/src/one-ply.js';
import { HeuristicOpponentModel } from '../packages/agent/src/opponent-model.js';
import type { Action, BattleState, EvaluationConfig } from '../packages/engine/src/types.js';
import type { SimulatorBattle } from '../packages/simulator/src/adapter.js';

const state: BattleState = {
  turn: 1, active: { p1: null, p2: null },
  sides: { p1: { player: 'p1', activeSlot: null, hazards: {}, volatile: {}, team: [] }, p2: { player: 'p2', activeSlot: 'p2a', hazards: {}, volatile: {}, team: [] } },
  field: { weather: null, terrain: null, pseudoWeather: {} }, choices: [], beliefs: { sets: {}, actions: {} },
};
const config: EvaluationConfig = {
  weights: { winProgress: 1, opponentPPDepletion: 0, forcedSwitchValue: 0, statusPressure: 0, hazardPressure: 0, informationGain: 0, structuralIntegrity: 0, decisionBurden: 0 },
  risk: { catastrophicRisk: 0, irreversibleResourceLoss: 0 },
};
const ourActions: Action[] = [{ kind: 'move', id: 'recover' }, { kind: 'move', id: 'tackle' }];
const opponentActions: Action[] = [{ kind: 'move', id: 'toxic' }];
const battle: SimulatorBattle = { async start() {}, async choices() { return opponentActions; }, async choose() {}, snapshot() { return state; }, async clone() { return this; }, isFinished() { return false; }, result() { return null; } };
const model = new HeuristicOpponentModel([{ slot: 'p2a', action: opponentActions[0] }]);

async function main(): Promise<void> {
  const candidates = await evaluateExpectedValue({ battle, player: 'p1', legalActions: ourActions, opponent: 'p2', model, config });
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map((candidate) => candidate.action), ourActions);
  console.log('expected value tests ok');
}

void main();