import type { PendingDecisionPoint } from './decision-extractor.js';
import type { RawEvent } from './raw-event-writer.js';

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

const eventSources = new Set(['selfplay', 'historical_replay', 'adversarial', 'benchmark', 'live']);
const payloadTypes = new Set(['protocol', 'decision', 'analysis', 'outcome', 'heartbeat', 'quality']);

export function validateEventEnvelope(event: RawEvent): readonly SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const field of ['schema_version', 'event_id', 'run_id', 'battle_id', 'timestamp', 'source', 'simulator_commit', 'format_id', 'agent_version', 'payload_type']) {
    const value = event[field as keyof RawEvent];
    if (typeof value !== 'string' || value.length === 0) issues.push({ path: field, message: 'required non-empty string' });
  }
  if (!Number.isInteger(event.sequence) || event.sequence < 0) issues.push({ path: 'sequence', message: 'non-negative integer required' });
  if (!eventSources.has(event.source)) issues.push({ path: 'source', message: 'unsupported source' });
  if (!payloadTypes.has(event.payload_type)) issues.push({ path: 'payload_type', message: 'unsupported payload type' });
  if (!event.payload || Array.isArray(event.payload) || typeof event.payload !== 'object') issues.push({ path: 'payload', message: 'object required' });
  if (Number.isNaN(Date.parse(event.timestamp))) issues.push({ path: 'timestamp', message: 'ISO timestamp required' });
  return issues;
}

export function validatePendingDecisionSchema(decision: PendingDecisionPoint): readonly SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const field of ['schema_version', 'decision_id', 'run_id', 'battle_id', 'format_id', 'simulator_commit', 'agent_version', 'state_hash']) {
    const value = decision[field as keyof PendingDecisionPoint];
    if (typeof value !== 'string' || value.length === 0) issues.push({ path: field, message: 'required non-empty string' });
  }
  if (!Number.isInteger(decision.turn) || decision.turn < 1) issues.push({ path: 'turn', message: 'positive integer required' });
  if (decision.actor !== 'p1' && decision.actor !== 'p2') issues.push({ path: 'actor', message: 'unsupported actor' });
  if (decision.legal_actions.length === 0) issues.push({ path: 'legal_actions', message: 'at least one action required' });
  return issues;
}