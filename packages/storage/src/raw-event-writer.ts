import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type EventSource = 'selfplay' | 'historical_replay' | 'adversarial' | 'benchmark' | 'live';
export type PayloadType = 'protocol' | 'decision' | 'outcome' | 'heartbeat' | 'quality';

export interface RawEvent {
  readonly schema_version: string;
  readonly event_id: string;
  readonly run_id: string;
  readonly battle_id: string;
  readonly sequence: number;
  readonly timestamp: string;
  readonly source: EventSource;
  readonly simulator_commit: string;
  readonly format_id: string;
  readonly agent_version: string;
  readonly team_hash?: string | null;
  readonly payload_type: PayloadType;
  readonly payload: Record<string, unknown>;
}

const sources = new Set<EventSource>(['selfplay', 'historical_replay', 'adversarial', 'benchmark', 'live']);
const payloadTypes = new Set<PayloadType>(['protocol', 'decision', 'outcome', 'heartbeat', 'quality']);

export class RawEventWriter {
  private nextSequence = 0;
  private pending = Promise.resolve();

  constructor(private readonly path: string, initialSequence = 0) {
    this.nextSequence = initialSequence;
  }

  append(event: RawEvent): Promise<void> {
    const operation = this.pending.then(async () => {
      this.validate(event);
      if (event.sequence !== this.nextSequence) {
        throw new Error(`event sequence ${event.sequence} expected ${this.nextSequence}`);
      }
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf8');
      this.nextSequence += 1;
    });
    this.pending = operation.catch(() => undefined);
    return operation;
  }

  private validate(event: RawEvent): void {
    for (const [field, value] of Object.entries(event)) {
      if (field !== 'team_hash' && (typeof value === 'string' && value.length === 0)) {
        throw new Error(`${field} must not be empty`);
      }
    }
    if (!Number.isInteger(event.sequence) || event.sequence < 0) throw new Error('sequence must be a non-negative integer');
    if (!sources.has(event.source)) throw new Error(`invalid event source: ${event.source}`);
    if (!payloadTypes.has(event.payload_type)) throw new Error(`invalid payload type: ${event.payload_type}`);
    if (!event.payload || Array.isArray(event.payload)) throw new Error('payload must be an object');
    if (Number.isNaN(Date.parse(event.timestamp))) throw new Error('timestamp must be ISO-8601');
  }
}