import type { DatasetManifest } from './dataset-manifest.js';
import type { PendingDecisionPoint } from './decision-extractor.js';

export interface QueryClient {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: readonly T[] }>;
}

export interface BattleRecord {
  readonly id: string;
  readonly formatId: string;
  readonly simulatorCommit: string;
  readonly seed: number | null;
  readonly winner: string | null;
}

export class MetadataRepository {
  constructor(private readonly client: QueryClient) {}

  async insertBattle(battle: BattleRecord): Promise<void> {
    await this.client.query(
      'insert into battles (id, format_id, simulator_commit, seed, winner) values ($1, $2, $3, $4, $5)',
      [battle.id, battle.formatId, battle.simulatorCommit, battle.seed, battle.winner],
    );
  }

  async insertDecision(battleId: string, decision: PendingDecisionPoint): Promise<void> {
    await this.client.query(
      'insert into decision_points (id, battle_id, turn, actor, state_hash, state, legal_actions, chosen_action, objective_delta) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [decision.decision_id, battleId, decision.turn, decision.actor, decision.state_hash, decision.state, decision.legal_actions, {}, {}],
    );
  }

  async insertDatasetManifest(manifest: DatasetManifest): Promise<void> {
    await this.client.query(
      'insert into datasets (id, version, manifest) values ($1, $2, $3)',
      [manifest.dataset_id, manifest.dataset_version, manifest],
    );
  }
}