import type {
  BattleState,
  CandidateScore,
  EvaluationConfig,
  EvaluationVector,
} from './types.js';

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function health(pokemon: BattleState['active']['p1']): number {
  return pokemon && pokemon.maxHp > 0 ? clamp(pokemon.hp / pokemon.maxHp) : 0;
}

function teamHealth(state: BattleState, player: 'p1' | 'p2'): number {
  const team = state.sides[player].team;
  return team.length === 0 ? 0 : team.reduce((total, pokemon) => total + health(pokemon), 0) / team.length;
}

function revealedInformation(state: BattleState, player: 'p1' | 'p2'): number {
  const team = state.sides[player].team;
  const signals = team.reduce(
    (total, pokemon) => total + pokemon.revealedMoves.length + (pokemon.item ? 1 : 0) + (pokemon.ability ? 1 : 0),
    0,
  );
  return clamp(signals / Math.max(1, team.length * 6));
}

function statusCount(state: BattleState, player: 'p1' | 'p2'): number {
  return state.sides[player].team.filter((pokemon) => pokemon.status !== null).length;
}

function hazardPressure(state: BattleState): number {
  return clamp(Object.values(state.sides.p2.hazards).reduce((total, count) => total + count, 0) / 6);
}

function dot(features: EvaluationVector, config: EvaluationConfig): number {
  const { weights } = config;
  return (
    features.winProgress * weights.winProgress +
    features.opponentPPDepletion * weights.opponentPPDepletion +
    features.forcedSwitchValue * weights.forcedSwitchValue +
    features.statusPressure * weights.statusPressure +
    features.hazardPressure * weights.hazardPressure +
    features.informationGain * weights.informationGain +
    features.structuralIntegrity * weights.structuralIntegrity +
    features.decisionBurden * weights.decisionBurden
  );
}

export function riskAdjustedValue(
  features: EvaluationVector,
  config: EvaluationConfig,
): number {
  return (
    dot(features, config) -
    features.catastrophicRisk * config.risk.catastrophicRisk -
    features.irreversibleResourceLoss * config.risk.irreversibleResourceLoss
  );
}

export function evaluateState(state: BattleState): EvaluationVector {
  const ownTeam = state.sides.p1.team;
  const opponentTeam = state.sides.p2.team;
  const ownFainted = ownTeam.filter((pokemon) => pokemon.fainted).length;
  const opponentFainted = opponentTeam.filter((pokemon) => pokemon.fainted).length;
  const ownViable = ownTeam.filter((pokemon) => !pokemon.fainted).length;
  const opponentStatus = statusCount(state, 'p2');
  const knownPp = opponentTeam.flatMap((pokemon) => Object.values(pokemon.movePp));
  const ppDepletion = knownPp.length === 0 ? 0 : clamp(knownPp.filter((pp) => pp === 0).length / knownPp.length);
  return {
    winProgress: clamp(0.5 + (opponentFainted - ownFainted) / Math.max(1, ownTeam.length + opponentTeam.length)),
    opponentPPDepletion: ppDepletion,
    forcedSwitchValue: 0,
    statusPressure: clamp(opponentStatus / Math.max(1, opponentTeam.length)),
    hazardPressure: hazardPressure(state),
    informationGain: revealedInformation(state, 'p2'),
    structuralIntegrity: clamp(ownViable / Math.max(1, ownTeam.length)),
    decisionBurden: clamp(state.choices.length / 10),
    catastrophicRisk: ownViable === 0 || state.active.p1?.fainted === true ? 1 : 0,
    irreversibleResourceLoss: 0,
  };
}

export function rankCandidates(
  candidates: readonly CandidateScore[],
): CandidateScore[] {
  return [...candidates].sort(
    (a, b) => b.riskAdjustedValue - a.riskAdjustedValue,
  );
}
