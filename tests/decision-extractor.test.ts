import assert from 'node:assert/strict';
import { extractPendingDecision } from '../packages/storage/src/decision-extractor.js';
import type { BattleState } from '../packages/engine/src/types.js';
import type { RawEvent } from '../packages/storage/src/raw-event-writer.js';

const state: BattleState = {
  turn: 2,
  active: { p1: null, p2: null },
  sides: {
    p1: { player: 'p1', team: [], activeSlot: null, hazards: {}, volatile: {} },
    p2: { player: 'p2', team: [], activeSlot: null, hazards: {}, volatile: {} },
  },
  field: { weather: null, terrain: null, pseudoWeather: {} },
  choices: [],
  beliefs: { sets: {}, actions: {} },
};
const request = JSON.stringify({
  active: [{ moves: [{ id: 'recover', disabled: false }] }],
  side: { pokemon: [{ ident: 'p1: Toxapex', active: true, condition: '100/100' }] },
});
const event: RawEvent = {
  schema_version: '1.0.0', event_id: 'event-4', run_id: 'run-1', battle_id: 'battle-1', sequence: 4,
  timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40),
  format_id: 'gen9customgame', agent_version: 'dev', payload_type: 'protocol',
  payload: { player: 'p1', message: `|request|${request}` },
};
const point = extractPendingDecision(event, state);
assert.equal(point?.actor, 'p1');
assert.equal(point?.turn, 2);
assert.deepEqual(point?.legal_actions, [{ kind: 'move', id: 'recover' }]);
assert.equal(extractPendingDecision({ ...event, payload_type: 'outcome' }, state), null);
console.log('decision extractor tests ok');