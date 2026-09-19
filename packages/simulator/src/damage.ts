import * as showdownModule from '../../../vendor/pokemon-showdown/dist/sim/index.js';

export interface DamageRequest {
  readonly formatId: string;
  readonly sourceTeam: readonly Record<string, unknown>[];
  readonly targetTeam: readonly Record<string, unknown>[];
  readonly move: string;
  readonly seed?: number;
}

export interface DamageResult {
  readonly amount: number | undefined | null | false;
  readonly successful: boolean;
  readonly immune: boolean;
}

interface ShowdownBattle {
  readonly actions: { getDamage(source: unknown, target: unknown, move: string): DamageResult['amount'] };
  getSide(side: 'p1' | 'p2'): { readonly pokemon: readonly unknown[] };
}

interface ShowdownApi {
  readonly Battle: new (options: Record<string, unknown>) => ShowdownBattle;
}

const Showdown = ((showdownModule as unknown as { default?: ShowdownApi }).default ?? showdownModule) as unknown as ShowdownApi;

export function calculateDamage(request: DamageRequest): DamageResult {
  if (request.sourceTeam.length === 0 || request.targetTeam.length === 0) {
    throw new Error('damage calculation requires non-empty source and target teams');
  }
  const battle = new Showdown.Battle({
    formatid: request.formatId,
    seed: request.seed === undefined ? undefined : [request.seed, request.seed, request.seed, request.seed],
    p1: { name: 'damage-source', team: request.sourceTeam },
    p2: { name: 'damage-target', team: request.targetTeam },
  });
  const source = battle.getSide('p1').pokemon[0];
  const target = battle.getSide('p2').pokemon[0];
  if (!source || !target) throw new Error('simulator did not create damage participants');
  const amount = battle.actions.getDamage(source, target, request.move);
  return { amount, successful: amount !== null && amount !== false, immune: amount === false };
}