export interface PokemonSet {
  readonly species: string;
  readonly ability: string | null;
  readonly item: string | null;
  readonly nature: string | null;
  readonly evs: Readonly<Record<string, number>>;
  readonly ivs: Readonly<Record<string, number>>;
  readonly moves: readonly string[];
  readonly teraType: string | null;
}

export interface Team {
  readonly id: string;
  readonly formatId: string;
  readonly members: readonly PokemonSet[];
  readonly tags: readonly string[];
  readonly source: {
    readonly kind: string;
    readonly uri: string | null;
    readonly capturedAt: string | null;
    readonly sourceHash: string | null;
  };
}

export interface TeamFitness {
  readonly winRate: number;
  readonly annoyance: number;
  readonly opponentPPDepletion: number;
  readonly forcedSwitches: number;
  readonly catastrophicLossRate: number;
  readonly matchupVariance: number;
}

export interface TeamCandidate {
  readonly team: Team;
  readonly fitness: TeamFitness | null;
}
