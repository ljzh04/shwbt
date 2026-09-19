import { randomUUID } from 'node:crypto';
import type { PlayerId } from '../../engine/src/types.js';
import { buildAnalysisSnapshot } from '../../agent/src/analysis-snapshot.js';
import { HeuristicOpponentModel } from '../../agent/src/opponent-model.js';
import { BattleProtocolReducer } from '../../simulator/src/protocol-reducer.js';
import type { RawEventWriter } from './raw-event-writer.js';

export interface LiveFrameFeed {
  readonly battleId: string;
  readonly frames: readonly string[];
  readonly perspective?: PlayerId;
  readonly username?: string;
}

function normalizeUserid(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ponytail: the page's own player line names the active user; one regex, no state files.
function detectPerspective(frames: readonly string[], username: string | undefined): PlayerId | null {
  if (!username) return null;
  const userid = normalizeUserid(username);
  for (const frame of frames) {
    for (const line of frame.split('\n')) {
      const match = /^\|player\|(p[12])\|[^|]*\|userid\|([^|]+)/.exec(line.trim());
      if (match && normalizeUserid(match[2] ?? '') === userid) return match[1] as PlayerId;
    }
  }
  return null;
}

// ponytail: live battles reuse the same decisions NDJSON + snapshot reader the panel already polls.
export class LiveBattleStore {
  private readonly reducers = new Map<string, BattleProtocolReducer>();
  private readonly lastTurn = new Map<string, number>();
  private readonly perspectives = new Map<string, PlayerId>();
  private readonly opponentModel = new HeuristicOpponentModel();
  private nextSequence = 0;

  constructor(
    private readonly writer: RawEventWriter,
    private readonly simulatorCommit: string,
    private readonly agentVersion = 'live-extension',
    private readonly formatId = 'gen9ou',
  ) {}

  async accept(feed: LiveFrameFeed): Promise<number> {
    if (feed.frames.length === 0) return 0;
    const reducer = this.reducers.get(feed.battleId) ?? new BattleProtocolReducer();
    this.reducers.set(feed.battleId, reducer);
    let accepted = 0;
    for (const frame of feed.frames) {
      for (const line of frame.split('\n')) {
        if (line.trim().length === 0 || line.startsWith('>')) continue;
        reducer.consume(line);
      }
      const turn = reducer.snapshot().turn;
      if (turn !== this.lastTurn.get(feed.battleId)) {
        this.lastTurn.set(feed.battleId, turn);
        const detected = detectPerspective(feed.frames, feed.username);
        if (detected) this.perspectives.set(feed.battleId, detected);
        const perspective = this.perspectives.get(feed.battleId) ?? feed.perspective ?? 'p1';
        const snapshot = buildAnalysisSnapshot({
          battleId: feed.battleId,
          state: reducer.snapshot(),
          perspective,
          opponentModel: this.opponentModel,
          simulatorCommit: this.simulatorCommit,
          agentVersion: this.agentVersion,
        });
        const event = {
          schema_version: '1.0.0',
          event_id: randomUUID(),
          run_id: 'live',
          battle_id: feed.battleId,
          sequence: this.nextSequence++,
          timestamp: new Date().toISOString(),
          source: 'live' as const,
          simulator_commit: this.simulatorCommit,
          format_id: this.formatId,
          agent_version: this.agentVersion,
          payload_type: 'analysis' as const,
          payload: snapshot as unknown as Record<string, unknown>,
        };
        await this.writer.append(event);
        accepted += 1;
      }
    }
    return accepted;
  }
}