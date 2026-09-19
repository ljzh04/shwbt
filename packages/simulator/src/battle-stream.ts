import * as showdownModule from '../../../vendor/pokemon-showdown/dist/sim/index.js';
import type { Action, BattleState, PlayerId } from '../../engine/src/types.js';
import type { BattleConfig, BattleResult, SimulatorBattle } from './adapter.js';
import { legalActionsFromRequest } from './legal-actions.js';
import { BattleProtocolReducer } from './protocol-reducer.js';

interface ShowdownStream extends AsyncIterable<unknown> {
  write(chunk: string): void;
}

interface ShowdownApi {
  readonly BattleStream: new () => ShowdownStream;
}

const Showdown = ((showdownModule as unknown as { default?: ShowdownApi }).default ?? showdownModule) as unknown as ShowdownApi;

export class ShowdownBattle implements SimulatorBattle {
  private readonly stream = new Showdown.BattleStream();
  private readonly reducer = new BattleProtocolReducer();
  private readonly pendingChoices = new Map<PlayerId, readonly Action[]>();
  private readonly commandLog: string[] = [];
  private battleResult: BattleResult | null = null;
  private finished = false;
  private outputCount = 0;

  private protocolCallbacks: Promise<void> = Promise.resolve();

  constructor(
    private readonly perspective: PlayerId | 'all' = 'p1',
    private readonly onProtocol?: (type: string, payload: string) => void | Promise<void>,
  ) {
    void this.consumeOutput();
  }

  async start(config: BattleConfig): Promise<void> {
    const start = {
      formatid: config.formatId,
      ...(config.seed === undefined ? {} : { seed: [config.seed, config.seed, config.seed, config.seed] }),
    };
    this.write(`>start ${JSON.stringify(start)}`);
    this.write(`>player p1 ${JSON.stringify({ name: config.p1Name, team: config.p1Team })}`);
    this.write(`>player p2 ${JSON.stringify({ name: config.p2Name, team: config.p2Team })}`);
  }

  async choices(player: PlayerId): Promise<readonly Action[]> {
    for (;;) {
      const choices = this.pendingChoices.get(player);
      if (choices) return choices;
      if (this.finished) return [];
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  async choose(player: PlayerId, action: Action): Promise<void> {
    this.pendingChoices.delete(player);
    const command = action.kind === 'move'
      ? `move ${action.id}`
      : action.kind === 'switch'
        ? `switch ${action.target ?? action.id}`
        : action.kind === 'team'
          ? `team ${action.id}`
          : `move ${action.id} terastallize`;
    this.write(`>${player} ${command}`);
  }

  snapshot(): BattleState {
    return this.reducer.snapshot();
  }

  async clone(): Promise<SimulatorBattle> {
    const clone = new ShowdownBattle(this.perspective, this.onProtocol);
    for (const command of this.commandLog) clone.write(command);
    await clone.waitForOutputCount(this.outputCount);
    return clone;
  }

  isFinished(): boolean {
    return this.finished;
  }

  result(): BattleResult | null {
    return this.battleResult;
  }

  async flush(): Promise<void> {
    await this.protocolCallbacks;
  }

  private async consumeOutput(): Promise<void> {
    for await (const chunk of this.stream) {
      this.outputCount += 1;
      const lines = String(chunk).split('\n');
      const type = lines.shift();
      const payload = lines.join('\n');
      if (type) {
        this.protocolCallbacks = this.protocolCallbacks.then(() => this.onProtocol?.(type, payload));
      }
      if (type === 'update') this.consumePublicLines(payload);
      if (type === 'sideupdate') this.consumeSideUpdate(lines);
      if (type === 'end') this.consumeEnd(payload);
    }
  }

  private consumeLines(payload: string): void {
    for (const line of payload.split('\n')) this.reducer.consume(line);
  }

  private consumePublicLines(payload: string): void {
    const lines = payload.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index]?.startsWith('|split|')) {
        const publicLine = lines[index + 2];
        if (publicLine) this.reducer.consume(publicLine);
        index += 2;
        continue;
      }
      const line = lines[index];
      if (line) this.reducer.consume(line);
    }
  }

  private consumeSideUpdate(lines: readonly string[]): void {
    const player = lines[0];
    if (player !== 'p1' && player !== 'p2') return;
    if (this.perspective !== 'all' && player !== this.perspective) return;
    const payload = lines.slice(1).join('\n');
    this.consumeLines(payload);
    const request = payload.split('\n').find((line) => line.startsWith('|request|'));
    if (request) this.pendingChoices.set(player, legalActionsFromRequest(request));
  }

  private consumeEnd(payload: string): void {
    this.finished = true;
    try {
      const result = JSON.parse(payload) as { winner?: string; tie?: boolean };
      this.battleResult = {
        winner: result.winner === 'p1' || result.winner === 'p2' ? result.winner : null,
        reason: result.tie ? 'tie' : null,
      };
    } catch {
      this.battleResult = { winner: null, reason: null };
    }
  }

  private write(command: string, record = true): void {
    if (record) this.commandLog.push(command);
    this.stream.write(command);
  }

  private async waitForOutputCount(expected: number): Promise<void> {
    const deadline = Date.now() + 5000;
    while (this.outputCount < expected) {
      if (Date.now() >= deadline) throw new Error('simulator replay timeout');
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}