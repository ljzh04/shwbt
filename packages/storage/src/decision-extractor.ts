import type { Action, BattleState, PlayerId } from '../../engine/src/types.js';
import { hashBattleState } from '../../simulator/src/state-hash.js';
import { legalActionsFromRequest } from '../../simulator/src/legal-actions.js';
import type { RawEvent } from './raw-event-writer.js';

export interface PendingDecisionPoint {
  readonly schema_version: string;
  readonly decision_id: string;
  readonly run_id: string;
  readonly battle_id: string;
  readonly turn: number;
  readonly actor: PlayerId;
  readonly format_id: string;
  readonly simulator_commit: string;
  readonly agent_version: string;
  readonly state_hash: string;
  readonly state: BattleState;
  readonly legal_actions: readonly Action[];
  readonly request_event_id: string;
  readonly request_sequence: number;
}

interface RequestPayload {
  readonly player?: PlayerId;
  readonly message?: string;
}

export function extractPendingDecision(
  event: RawEvent,
  state: BattleState,
): PendingDecisionPoint | null {
  if (event.payload_type !== 'protocol') return null;
  const payload = event.payload as RequestPayload;
  if (payload.player !== 'p1' && payload.player !== 'p2') return null;
  if (typeof payload.message !== 'string' || !payload.message.startsWith('|request|')) return null;

  const legalActions = legalActionsFromRequest(payload.message);
  if (legalActions.length === 0) return null;
  return {
    schema_version: '1.0.0',
    decision_id: `${event.battle_id}:${event.sequence}:${payload.player}`,
    run_id: event.run_id,
    battle_id: event.battle_id,
    turn: Math.max(1, state.turn),
    actor: payload.player,
    format_id: event.format_id,
    simulator_commit: event.simulator_commit,
    agent_version: event.agent_version,
    state_hash: hashBattleState(state),
    state,
    legal_actions: legalActions,
    request_event_id: event.event_id,
    request_sequence: event.sequence,
  };
}