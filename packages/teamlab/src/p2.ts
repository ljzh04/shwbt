import { createHash } from 'node:crypto';
import type { PokemonSet, Team, TeamCandidate, TeamFitness } from './types.js';

export function normalizeSet(set: PokemonSet): PokemonSet {
  return {
    ...set,
    species: set.species.trim(),
    moves: [...new Set(set.moves.map((move) => move.trim().toLowerCase()))].sort(),
    evs: Object.fromEntries(Object.entries(set.evs).sort()),
    ivs: Object.fromEntries(Object.entries(set.ivs).sort()),
  };
}

export function normalizeTeam(team: Team): Team {
  const members = team.members.map(normalizeSet).slice(0, 6);
  return { ...team, members, tags: [...new Set(team.tags)].sort() };
}

export function roleTags(team: Team): readonly string[] {
  const moves = team.members.flatMap((member) => member.moves);
  return [
    ...(moves.some((move) => ['recover', 'roost', 'wish', 'softboiled'].includes(move)) ? ['recovery'] : []),
    ...(moves.some((move) => ['toxic', 'willowisp', 'thunderwave', 'leechseed'].includes(move)) ? ['status'] : []),
    ...(moves.some((move) => ['stealthrock', 'spikes', 'toxicspikes'].includes(move)) ? ['hazards'] : []),
  ];
}

export function mutateTeam(team: Team, index: number, replacement: PokemonSet): Team {
  if (index < 0 || index >= team.members.length) throw new Error('team member index out of range');
  return normalizeTeam({ ...team, members: team.members.map((member, current) => current === index ? replacement : member) });
}

export function evaluatePopulation(candidates: readonly TeamCandidate[]): readonly TeamCandidate[] {
  return [...candidates].filter((candidate) => candidate.fitness !== null).sort((left, right) => (right.fitness?.winRate ?? 0) - (left.fitness?.winRate ?? 0));
}

export function selectElites(candidates: readonly TeamCandidate[], count: number): readonly TeamCandidate[] {
  return evaluatePopulation(candidates).slice(0, Math.max(0, count));
}

export function counterTeam(team: Team, candidateId: string): Team {
  const hash = createHash('sha256').update(`${team.id}:${candidateId}`).digest('hex').slice(0, 16);
  return { ...team, id: `counter-${hash}`, tags: [...new Set([...team.tags, 'adversarial'])].sort(), source: { ...team.source, kind: 'adversarial' } };
}

export function emptyFitness(): TeamFitness {
  return { winRate: 0, annoyance: 0, opponentPPDepletion: 0, forcedSwitches: 0, catastrophicLossRate: 0, matchupVariance: 0 };
}