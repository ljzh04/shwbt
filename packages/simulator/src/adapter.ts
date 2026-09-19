import type { Action, BattleState, PlayerId } from '../../engine/src/types.js';

export interface BattleConfig {
  readonly formatId: string;
  readonly p1Name: string;
  readonly p2Name: string;
  readonly p1Team: string;
  readonly p2Team: string;
  readonly seed?: number;
}

export interface BattleResult {
  readonly winner: PlayerId | null;
  readonly reason: string | null;
}

export interface SimulatorBattle {
  start(config: BattleConfig): Promise<void>;
  choices(player: PlayerId): Promise<readonly Action[]>;
  choose(player: PlayerId, action: Action): Promise<void>;
  snapshot(): BattleState;
  clone(): Promise<SimulatorBattle>;
  isFinished(): boolean;
  result(): BattleResult | null;
}

/**
 * The concrete adapter should use the pinned Pokémon Showdown BattleStream.
 * Keep all protocol parsing inside this package so the rest of the codebase
 * never depends on raw `|move|`, `|switch|`, etc. strings.
 */
export interface ProtocolReducer {
  consume(message: string): void;
  snapshot(): BattleState;
}
