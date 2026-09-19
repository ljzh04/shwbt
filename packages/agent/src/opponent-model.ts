import type {
  Action,
  BattleState,
  Hypothesis,
} from '../../engine/src/types.js';
import type {
  ActionDistribution,
  Observation,
  OpponentModel,
  SetBeliefDistribution,
  SetBeliefDistribution as LegacySetBeliefDistribution,
} from './interfaces.js';

interface ActionBelief {
  readonly action: Action;
  probability: number;
}

interface SetBelief {
  readonly slot: string;
  readonly setId: string;
  probability: number;
}

interface ActionObservation {
  readonly slot?: string;
  readonly action?: Action;
  readonly legalActions?: readonly Action[];
}

interface SetObservation {
  readonly slot?: string;
  readonly setId?: string;
}

function normalize<T extends { probability: number }>(values: readonly T[]): T[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value.probability), 0);
  if (total === 0) return values.map((value) => ({ ...value, probability: 1 / Math.max(1, values.length) }));
  return values.map((value) => ({ ...value, probability: Math.max(0, value.probability) / total }));
}

function actionKey(action: Action): string {
  return `${action.kind}:${action.id}:${action.target ?? ''}`;
}

export class HeuristicOpponentModel implements OpponentModel {
  private readonly actions = new Map<string, ActionBelief[]>();
  private readonly sets = new Map<string, SetBelief[]>();

  constructor(
    actionPriors: readonly { slot: string; action: Action; probability?: number }[] = [],
    setPriors: readonly { slot: string; setId: string; probability?: number }[] = [],
  ) {
    for (const prior of actionPriors) {
      const beliefs = this.actions.get(prior.slot) ?? [];
      beliefs.push({ action: prior.action, probability: prior.probability ?? 1 });
      this.actions.set(prior.slot, beliefs);
    }
    for (const prior of setPriors) {
      const beliefs = this.sets.get(prior.slot) ?? [];
      beliefs.push({ slot: prior.slot, setId: prior.setId, probability: prior.probability ?? 1 });
      this.sets.set(prior.slot, beliefs);
    }
    this.normalizeAll();
  }

  predictActions(state: BattleState): ActionDistribution {
    const slot = state.sides.p2.activeSlot ?? 'p2a';
    const beliefs = this.actions.get(slot) ?? [];
    return {
      actions: normalize(beliefs)
        .filter(({ probability }) => probability > 0)
        .sort((left, right) => right.probability - left.probability)
        .map(({ action, probability }) => ({ action, probability })),
    };
  }

  predictSets(state: BattleState): SetBeliefDistribution {
    const hypotheses = [...this.sets.values()].flat().filter((belief) =>
      state.sides.p2.team.some((pokemon) => pokemon.slot === belief.slot),
    );
    return {
      hypotheses: normalize(hypotheses)
        .filter(({ probability }) => probability > 0)
        .sort((left, right) => right.probability - left.probability)
        .map(({ slot, setId, probability }) => ({ pokemonSlot: slot, setId, probability })),
    };
  }

  update(observation: Observation): void {
    if (observation.eventType === 'opponent_action') {
      this.updateAction(observation.payload as ActionObservation);
    } else if (observation.eventType === 'revealed_set') {
      this.updateSet(observation.payload as SetObservation);
    }
    this.normalizeAll();
  }

  private updateAction(observation: ActionObservation): void {
    if (!observation.slot || !observation.action) return;
    const beliefs = this.actions.get(observation.slot) ?? [];
    const observedKey = actionKey(observation.action);
    const legalKeys = new Set((observation.legalActions ?? []).map(actionKey));
    const next = beliefs.length === 0
      ? [{ action: observation.action, probability: 1 }]
      : beliefs.map((belief) => ({
        ...belief,
        probability: actionKey(belief.action) === observedKey
          ? belief.probability * 4
          : legalKeys.size > 0 && !legalKeys.has(actionKey(belief.action)) ? 0 : belief.probability,
      }));
    this.actions.set(observation.slot, next);
  }

  private updateSet(observation: SetObservation): void {
    if (!observation.slot || !observation.setId) return;
    const beliefs = this.sets.get(observation.slot) ?? [];
    const next = beliefs.length === 0
      ? [{ slot: observation.slot, setId: observation.setId, probability: 1 }]
      : beliefs.map((belief) => ({ ...belief, probability: belief.setId === observation.setId ? belief.probability * 4 : 0 }));
    this.sets.set(observation.slot, next);
  }

  private normalizeAll(): void {
    for (const [slot, beliefs] of this.actions) this.actions.set(slot, normalize(beliefs));
    for (const [slot, beliefs] of this.sets) this.sets.set(slot, normalize(beliefs));
  }
}