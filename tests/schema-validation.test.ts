import assert from 'node:assert/strict';
import { validateEventEnvelope, validatePendingDecisionSchema } from '../packages/storage/src/schema-validation.js';
import type { PendingDecisionPoint } from '../packages/storage/src/decision-extractor.js';
import type { RawEvent } from '../packages/storage/src/raw-event-writer.js';

const event: RawEvent = {
  schema_version: '1.0.0', event_id: 'event-1', run_id: 'run-1', battle_id: 'battle-1', sequence: 0,
  timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol', payload: {},
};
assert.deepEqual(validateEventEnvelope(event), []);
assert.ok(validateEventEnvelope({ ...event, source: 'invalid' as never }).length > 0);
const decision = { schema_version: '1.0.0', decision_id: 'decision-1', run_id: 'run-1', battle_id: 'battle-1', turn: 1, actor: 'p1', format_id: 'gen9customgame', simulator_commit: 'a'.repeat(40), agent_version: 'test', state_hash: 'hash', state: {} as never, legal_actions: [{ kind: 'move', id: 'recover' }], request_event_id: 'event-1', request_sequence: 0 } as PendingDecisionPoint;
assert.deepEqual(validatePendingDecisionSchema(decision), []);
assert.ok(validatePendingDecisionSchema({ ...decision, legal_actions: [] }).length > 0);
console.log('schema validation tests ok');