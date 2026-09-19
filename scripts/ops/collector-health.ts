export interface CollectorHealth {
  readonly startedAt: string;
  readonly heartbeats: number;
  readonly battlesCompleted: number;
  readonly battlesFailed: number;
  readonly lastError: string | null;
}

export class CollectorHealthTracker {
  private state: CollectorHealth = {
    startedAt: new Date().toISOString(), heartbeats: 0, battlesCompleted: 0, battlesFailed: 0, lastError: null,
  };

  heartbeat(): void { this.state = { ...this.state, heartbeats: this.state.heartbeats + 1 }; }
  battleCompleted(): void { this.state = { ...this.state, battlesCompleted: this.state.battlesCompleted + 1 }; }
  battleFailed(error: unknown): void { this.state = { ...this.state, battlesFailed: this.state.battlesFailed + 1, lastError: String(error) }; }
  snapshot(): CollectorHealth { return this.state; }
}