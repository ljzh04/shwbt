import { createHash } from 'node:crypto';

export interface DatasetManifest {
  readonly dataset_id: string;
  readonly dataset_version: string;
  readonly created_at: string;
  readonly schema_version: string;
  readonly source_runs: readonly string[];
  readonly feature_version: string;
  readonly simulator_commits: readonly string[];
  readonly objective_versions: readonly string[];
  readonly agent_versions?: readonly string[];
  readonly split_policy: {
    readonly name: string;
    readonly holdout_frozen: boolean;
    readonly group_key: 'battle_id' | 'replay_id';
  };
  readonly counts: { readonly battles: number; readonly decision_points: number };
  readonly content_hash: string;
}

export interface DatasetSplits {
  readonly train: readonly string[];
  readonly validation: readonly string[];
  readonly test: readonly string[];
}

export function contentHash(splits: DatasetSplits): string {
  const canonical = Object.entries(splits)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, ids]) => `${name}:${[...ids].sort().join(',')}`)
    .join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

export function validateSplitIsolation(splits: DatasetSplits): readonly string[] {
  const owners = new Map<string, string>();
  const errors: string[] = [];
  for (const [split, ids] of Object.entries(splits)) {
    for (const id of ids) {
      const owner = owners.get(id);
      if (owner && owner !== split) errors.push(`battle ${id} appears in ${owner} and ${split}`);
      owners.set(id, split);
    }
  }
  return errors;
}

export function validateManifest(manifest: DatasetManifest, splits: DatasetSplits): readonly string[] {
  const errors = [...validateSplitIsolation(splits)];
  if (manifest.split_policy.holdout_frozen !== true) errors.push('holdout must be frozen');
  if (manifest.content_hash !== contentHash(splits)) errors.push('content hash does not match splits');
  if (manifest.counts.battles !== new Set(Object.values(splits).flat()).size) errors.push('battle count does not match splits');
  if (!Number.isInteger(manifest.counts.decision_points) || manifest.counts.decision_points < 0) {
    errors.push('decision point count must be non-negative');
  }
  return errors;
}