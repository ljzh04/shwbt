import type { Action } from '../../engine/src/types.js';

interface ChoiceRequest {
  readonly teamPreview?: boolean;
  readonly active?: readonly ActiveRequest[];
  readonly side?: {
    readonly pokemon?: readonly PokemonRequest[];
  };
}

interface ActiveRequest {
  readonly moves?: readonly MoveRequest[];
  readonly canTerastallize?: string;
  readonly trapped?: boolean;
  readonly maybeTrapped?: boolean;
}

interface MoveRequest {
  readonly id?: string;
  readonly disabled?: boolean;
}

interface PokemonRequest {
  readonly ident?: string;
  readonly active?: boolean;
  readonly condition?: string;
  readonly fainted?: boolean;
}

function requestJson(message: string): ChoiceRequest | null {
  const prefix = '|request|';
  if (!message.startsWith(prefix)) return null;
  try {
    return JSON.parse(message.slice(prefix.length)) as ChoiceRequest;
  } catch {
    return null;
  }
}

export function legalActionsFromRequest(message: string): readonly Action[] {
  const request = requestJson(message);
  const active = request?.active?.[0];
  const roster = request?.side?.pokemon ?? [];
  if (!active) {
    if (!request?.teamPreview) return [];
    return permutations(roster
      .map((entry, index) => (!entry.fainted && entry.condition !== '0 fnt' ? index + 1 : null))
      .filter((index): index is number => index !== null))
      .map((order) => ({ kind: 'team', id: order.join('') }));
  }

  const actions: Action[] = (active.moves ?? [])
    .flatMap((move): Action[] =>
      move.id && !move.disabled ? [{ kind: 'move', id: move.id }] : [],
    );

  if (!active.trapped && !active.maybeTrapped) {
    for (const [index, pokemon] of roster.entries()) {
      if (!pokemon.active && !pokemon.fainted && pokemon.condition !== '0 fnt') {
        actions.push({ kind: 'switch', id: pokemon.ident ?? String(index + 1), target: index + 1 });
      }
    }
  }

  if (active.canTerastallize) {
    actions.push({ kind: 'terastallize', id: active.canTerastallize });
  }

  return actions;
}

function permutations(values: readonly number[]): number[][] {
  if (values.length <= 1) return [Array.from(values)];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]),
  );
}