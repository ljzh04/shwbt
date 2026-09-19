# simulator

Adapter around Pokémon Showdown's official simulator.

The upstream simulator documents `BattleStream` as an object read/write stream: the caller writes player choices and reads protocol messages. The simulator can also be used through standard I/O. See `sim/SIMULATOR.md` and `sim/SIM-PROTOCOL.md` in the upstream repository.

## Adapter responsibilities

```ts
export interface SimulatorBattle {
  start(config: BattleConfig): Promise<void>;
  choices(player: PlayerId): Promise<LegalAction[]>;
  choose(player: PlayerId, action: Action): Promise<void>;
  snapshot(): BattleState;
  clone(): Promise<SimulatorBattle>;
  isFinished(): boolean;
  result(): BattleResult | null;
}
```

## Branching requirement

Search should ideally branch exact simulator states. If the first implementation cannot cheaply clone battles, use a replay-to-state mechanism and cache snapshots. Do not create an approximate rules engine for search.
