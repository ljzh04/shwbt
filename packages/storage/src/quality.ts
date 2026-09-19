import type { BattleState } from '../../engine/src/types.js';
import { hashBattleState } from '../../simulator/src/state-hash.js';
import type { PendingDecisionPoint } from './decision-extractor.js';

export interface QualityIssue {
  readonly code: 'empty_legal_actions' | 'invalid_turn' | 'state_hash_mismatch' | 'missing_provenance';
  readonly message: string;
}

export function validatePendingDecision(
  decision: PendingDecisionPoint,
  state: BattleState = decision.state,
): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (decision.legal_actions.length === 0) {
    issues.push({ code: 'empty_legal_actions', message: 'decision has no legal actions' });
  }
  if (!Number.isInteger(decision.turn) || decision.turn < 1) {
    issues.push({ code: 'invalid_turn', message: 'decision turn must be a positive integer' });
  }
  if (!decision.run_id || !decision.battle_id || !decision.simulator_commit || !decision.agent_version) {
    issues.push({ code: 'missing_provenance', message: 'decision provenance is incomplete' });
  }
  if (decision.state_hash !== hashBattleState(state)) {
    issues.push({ code: 'state_hash_mismatch', message: 'state hash does not match state payload' });
  }
  return issues;
}