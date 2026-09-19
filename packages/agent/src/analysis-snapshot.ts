import type { Action, BattleState, PlayerId } from '../../engine/src/types.js';
import { evaluateState } from '../../engine/src/evaluator.js';
import { hashBattleState } from '../../simulator/src/state-hash.js';
import type { ActionDecision, OpponentModel } from './interfaces.js';

export type ProvenanceLabel = 'KNOWN' | 'INFERRED' | 'UNAVAILABLE';

export interface ProbabilityEntry {
  readonly label: string;
  readonly probability: number;
  readonly kind: ProvenanceLabel;
}

export interface SnapshotPokemon {
  readonly slot: string | null;
  readonly species: string | null;
  readonly hp: number | null;
  readonly maxHp: number | null;
  readonly status: string | null;
  readonly revealedMoves: readonly string[];
  readonly hazards: Readonly<Record<string, number>>;
  readonly kind: ProvenanceLabel;
}

export interface CandidateView {
  readonly action: Action;
  readonly expectedUtility: number;
  readonly confidence?: number;
}

export interface PressureMetric {
  readonly value: number;
  readonly kind: ProvenanceLabel;
}

export interface PredictionSnapshot {
  readonly battleId: string;
  readonly turn: number;
  readonly stateHash: string;
  readonly perspective: PlayerId;
  readonly active: { readonly ours: SnapshotPokemon; readonly opponent: SnapshotPokemon };
  readonly opponentBelief: { readonly actions: readonly ProbabilityEntry[]; readonly sets: readonly ProbabilityEntry[] };
  readonly candidates: readonly CandidateView[];
  readonly resources: {
    readonly hpPressure: PressureMetric;
    readonly ppPressure: PressureMetric;
    readonly hazardPressure: PressureMetric;
    readonly statusPressure: PressureMetric;
    readonly structuralIntegrity: PressureMetric;
  };
  readonly provenance: {
    readonly simulatorCommit: string;
    readonly agentVersion: string;
    readonly objectiveVersion?: string;
  };
}

function toPokemon(state: BattleState, side: PlayerId): SnapshotPokemon {
  const active = state.active[side];
  if (!active) return { slot: null, species: null, hp: null, maxHp: null, status: null, revealedMoves: [], hazards: state.sides[side].hazards, kind: 'UNAVAILABLE' };
  return {
    slot: active.slot,
    species: active.species,
    hp: active.hp,
    maxHp: active.maxHp,
    status: active.status,
    revealedMoves: active.revealedMoves,
    hazards: state.sides[side].hazards,
    kind: 'KNOWN',
  };
}

export function buildAnalysisSnapshot(input: {
  battleId: string;
  state: BattleState;
  perspective?: PlayerId;
  decision?: ActionDecision;
  opponentModel?: OpponentModel;
  simulatorCommit: string;
  agentVersion: string;
  objectiveVersion?: string;
}): PredictionSnapshot {
  const perspective = input.perspective ?? 'p1';
  const opponent: PlayerId = perspective === 'p1' ? 'p2' : 'p1';
  const opponentModelActions = input.opponentModel?.predictActions(input.state).actions ?? [];
  const opponentModelSets = input.opponentModel?.predictSets(input.state).hypotheses ?? [];
  // ponytail: resources reuse evaluateState directly; observable-only, no inferred PP/status.
  const features = evaluateState(input.state);
  const known = (value: number): PressureMetric => ({ value, kind: 'KNOWN' });
  return {
    battleId: input.battleId,
    turn: input.state.turn,
    stateHash: hashBattleState(input.state),
    perspective,
    active: { ours: toPokemon(input.state, perspective), opponent: toPokemon(input.state, opponent) },
    // ponytail: model outputs only, never invented; empty when no model.
    opponentBelief: {
      actions: opponentModelActions.map((entry) => ({
        label: `${entry.action.kind}:${entry.action.id}`,
        probability: entry.probability,
        kind: 'INFERRED' as const,
      })),
      sets: opponentModelSets.map((entry) => ({
        label: `${entry.pokemonSlot}:${entry.setId}`,
        probability: entry.probability,
        kind: 'INFERRED' as const,
      })),
    },
    candidates: (input.decision?.candidates ?? []).map((candidate) => ({
      action: candidate.action,
      expectedUtility: candidate.expectedValue,
    })),
    resources: {
      hpPressure: known(features.winProgress),
      ppPressure: known(features.opponentPPDepletion),
      hazardPressure: known(features.hazardPressure),
      statusPressure: known(features.statusPressure),
      structuralIntegrity: known(features.structuralIntegrity),
    },
    provenance: {
      simulatorCommit: input.simulatorCommit,
      agentVersion: input.agentVersion,
      ...(input.objectiveVersion ? { objectiveVersion: input.objectiveVersion } : {}),
    },
  };
}
