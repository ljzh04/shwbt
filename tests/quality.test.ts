import assert from 'node:assert/strict';
import { extractPendingDecision } from '../packages/storage/src/decision-extractor.js';
import { validatePendingDecision } from '../packages/storage/src/quality.js';
import type { BattleState } from '../packages/engine/src/types.js';
import type { RawEvent } from '../packages/storage/src/raw-event-writer.js';

const state: BattleState = {
  turn: 1, active: { p1: null, p2: null },
  sides: {
    p1: { player: 'p1', team: [], activeSlot: null, hazards: {}, volatile: {} },
    p2: { player: 'p2', team: [], activeSlot: null, hazards: {}, volatile: {} },
  },
  field: { weather: null, terrain: null, pseudoWeather: {} }, choices: [], beliefs: { sets: {}, actions: {} },
};
const event: RawEvent = {
  schema_version: '1.0.0', event_id: 'event-0', run_id: 'run-1', battle_id: 'battle-1', sequence: 0,
  timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40),
  format_id: 'gen9customgame', agent_version: 'dev', payload_type: 'protocol',
  payload: { player: 'p1', message: `|request|${JSON.stringify({ active: [{ moves: [{ id: 'recover' }] }] })}` },
};
const decision = extractPendingDecision(event, state);
assert.ok(decision);
assert.deepEqual(validatePendingDecision(decision), []);
assert.equal(validatePendingDecision({ ...decision, state_hash: 'wrong' })[0]?.code, 'state_hash_mismatch');
console.log('quality tests ok');