import type { Action, BattleState, EvaluationVector, PlayerId } from '../../engine/src/types.js';
import { buildAnalysisSnapshot } from '../../agent/src/analysis-snapshot.js';
import { DeterministicBaseline } from '../../agent/src/baseline.js';
import type { ActionDecision, OpponentModel, SearchPolicy } from '../../agent/src/interfaces.js';
import { HeuristicOpponentModel } from '../../agent/src/opponent-model.js';
import { BattleProtocolReducer } from '../../simulator/src/protocol-reducer.js';
import { extractPendingDecision, type PendingDecisionPoint } from './decision-extractor.js';
import { validatePendingDecision } from './quality.js';
import { RawEventWriter, type RawEvent } from './raw-event-writer.js';
import { validateEventEnvelope, validatePendingDecisionSchema } from './schema-validation.js';

export class DecisionSink {
  private readonly reducers = new Map<string, BattleProtocolReducer>();
  private nextSequence = 0;
  private readonly pending = new Map<string, PendingDecisionPoint>();

  constructor(
    private readonly writer: RawEventWriter,
    private readonly opponentModel: OpponentModel = new HeuristicOpponentModel(),
    private readonly policy: SearchPolicy = new DeterministicBaseline(),
  ) {}

  async accept(event: RawEvent): Promise<PendingDecisionPoint | null> {
    if (validateEventEnvelope(event).length > 0) return null;
    if (event.payload_type !== 'protocol') return null;
    const reducer = this.reducers.get(event.battle_id) ?? new BattleProtocolReducer();
    this.reducers.set(event.battle_id, reducer);
    const message = event.payload.message;
    if (typeof message !== 'string') return null;
    const player = typeof event.payload.type === 'string' && event.payload.type === 'sideupdate'
      ? message.split('\n')[0]
      : undefined;
    if (player !== 'p1' && player !== 'p2') return null;
    const opponent: PlayerId = player === 'p1' ? 'p2' : 'p1';
    // ponytail: track only newly revealed opponent moves; everything else stays model-free.
    const knownMoves = new Map<string, Set<string>>(
      reducer.snapshot().sides[opponent].team.map((pokemon) => [pokemon.slot, new Set(pokemon.revealedMoves)]),
    );
    const payload = typeof event.payload.type === 'string' && event.payload.type === 'sideupdate'
      ? message.split('\n').slice(1).join('\n')
      : message;
    for (const line of payload.split('\n')) reducer.consume(line);
    for (const pokemon of reducer.snapshot().sides[opponent].team) {
      for (const move of pokemon.revealedMoves) {
        if (!knownMoves.get(pokemon.slot)?.has(move)) {
          this.opponentModel.update({
            turn: reducer.snapshot().turn,
            eventType: 'opponent_action',
            payload: { slot: pokemon.slot, action: { kind: 'move', id: move } },
          });
        }
      }
    }
    const request = payload.split('\n').find((line) => line.startsWith('|request|'));
    if (!request) return null;
    const decision = extractPendingDecision({ ...event, payload: { player, message: request } }, reducer.snapshot());
    if (!decision || validatePendingDecision(decision).length > 0 || validatePendingDecisionSchema(decision).length > 0) return null;
    this.pending.set(decision.decision_id, decision);
    await this.writer.append({
      ...event,
      event_id: `${event.event_id}:decision`,
      sequence: this.nextSequence++,
      payload_type: 'decision',
      payload: decision as unknown as Record<string, unknown>,
    });
    // ponytail: baseline scoring is deterministic and cheap; learned policies plug in via constructor.
    let scored: ActionDecision | undefined;
    try {
      scored = await this.policy.choose({ state: decision.state, legalActions: decision.legal_actions });
    } catch {
      scored = undefined;
    }
    const snapshot = buildAnalysisSnapshot({
      battleId: decision.battle_id,
      state: decision.state,
      perspective: decision.actor,
      ...(scored ? { decision: scored } : {}),
      opponentModel: this.opponentModel,
      simulatorCommit: decision.simulator_commit,
      agentVersion: decision.agent_version,
    });
    await this.writer.append({
      ...event,
      event_id: `${event.event_id}:analysis`,
      sequence: this.nextSequence++,
      payload_type: 'analysis',
      payload: snapshot as unknown as Record<string, unknown>,
    });
    return decision;
  }

  async finalize(
    decisionId: string,
    chosenAction: Action,
    transition: Record<string, unknown>,
    objectiveDelta: EvaluationVector,
  ): Promise<boolean> {
    const pending = this.pending.get(decisionId);
    if (!pending || !pending.legal_actions.some((action) =>
      action.kind === chosenAction.kind && action.id === chosenAction.id && action.target === chosenAction.target)) return false;
    await this.writer.append({
      schema_version: pending.schema_version,
      event_id: `${pending.decision_id}:final`,
      run_id: pending.run_id,
      battle_id: pending.battle_id,
      sequence: this.nextSequence++,
      timestamp: new Date().toISOString(),
      source: 'selfplay',
      simulator_commit: pending.simulator_commit,
      format_id: pending.format_id,
      agent_version: pending.agent_version,
      payload_type: 'decision',
      payload: { ...pending, chosen_action: chosenAction, transition, objective_delta: objectiveDelta },
    });
    this.pending.delete(decisionId);
    return true;
  }

  snapshot(battleId: string): BattleState | null {
    return this.reducers.get(battleId)?.snapshot() ?? null;
  }
}