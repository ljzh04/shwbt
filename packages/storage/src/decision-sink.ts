import type { BattleState } from '../../engine/src/types.js';
import { BattleProtocolReducer } from '../../simulator/src/protocol-reducer.js';
import { extractPendingDecision, type PendingDecisionPoint } from './decision-extractor.js';
import { validatePendingDecision } from './quality.js';
import { RawEventWriter, type RawEvent } from './raw-event-writer.js';
import { validateEventEnvelope, validatePendingDecisionSchema } from './schema-validation.js';

export class DecisionSink {
  private readonly reducers = new Map<string, BattleProtocolReducer>();
  private nextSequence = 0;

  constructor(private readonly writer: RawEventWriter) {}

  async accept(event: RawEvent): Promise<PendingDecisionPoint | null> {
    if (validateEventEnvelope(event).length > 0) return null;
    if (event.payload_type !== 'protocol') return null;
    const reducer = this.reducers.get(event.battle_id) ?? new BattleProtocolReducer();
    this.reducers.set(event.battle_id, reducer);
    const message = event.payload.message;
    if (typeof message !== 'string') return null;
    const payload = typeof event.payload.type === 'string' && event.payload.type === 'sideupdate'
      ? message.split('\n').slice(1).join('\n')
      : message;
    for (const line of payload.split('\n')) reducer.consume(line);
    const player = typeof event.payload.type === 'string' && event.payload.type === 'sideupdate'
      ? message.split('\n')[0]
      : undefined;
    if (player !== 'p1' && player !== 'p2') return null;
    const request = payload.split('\n').find((line) => line.startsWith('|request|'));
    if (!request) return null;
    const decision = extractPendingDecision({ ...event, payload: { player, message: request } }, reducer.snapshot());
    if (!decision || validatePendingDecision(decision).length > 0 || validatePendingDecisionSchema(decision).length > 0) return null;
    await this.writer.append({
      ...event,
      event_id: `${event.event_id}:decision`,
      sequence: this.nextSequence++,
      payload_type: 'decision',
      payload: decision as unknown as Record<string, unknown>,
    });
    return decision;
  }

  snapshot(battleId: string): BattleState | null {
    return this.reducers.get(battleId)?.snapshot() ?? null;
  }
}