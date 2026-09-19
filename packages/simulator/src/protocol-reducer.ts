import type {
  Action,
  BattleState,
  FieldState,
  OpponentBeliefState,
  PlayerId,
  PokemonState,
  SideState,
} from '../../engine/src/types.js';
import type { ProtocolReducer } from './adapter.js';

const emptyBeliefs: OpponentBeliefState = { sets: {}, actions: {} };

function emptyState(): BattleState {
  return {
    turn: 0,
    active: { p1: null, p2: null },
    sides: { p1: emptySide('p1'), p2: emptySide('p2') },
    field: { weather: null, terrain: null, pseudoWeather: {} },
    choices: [],
    beliefs: emptyBeliefs,
  };
}

function emptySide(player: PlayerId): SideState {
  return {
    player,
    team: [],
    activeSlot: null,
    hazards: {},
    volatile: {},
  };
}

function playerOf(slot: string): PlayerId | null {
  return slot.startsWith('p1') ? 'p1' : slot.startsWith('p2') ? 'p2' : null;
}

function parseHp(value: string | undefined): { hp: number; maxHp: number } {
  const match = value?.match(/^(\d+)\/?(\d+)?/);
  if (!match) return { hp: 0, maxHp: 0 };
  return { hp: Number(match[1]), maxHp: Number(match[2] ?? match[1]) };
}

function pokemonFromMessage(slot: string, name: string, hpText?: string): PokemonState {
  const hp = parseHp(hpText);
  return {
    slot,
    species: name.trim(),
    hp: hp.hp,
    maxHp: hp.maxHp,
    status: null,
    fainted: false,
    revealedMoves: [],
    movePp: {},
    item: null,
    ability: null,
    boosts: {},
    teraRevealed: false,
  };
}

export class BattleProtocolReducer implements ProtocolReducer {
  private state = emptyState();

  consume(message: string): void {
    const parts = message.trim().split('|');
    const event = parts[1];
    if (!event) return;

    switch (event) {
      case 'turn':
        this.state = { ...this.state, turn: Number(parts[2] ?? 0) };
        break;
      case 'switch':
      case 'drag':
        this.updateSwitch(parts[2], parts[3]);
        break;
      case 'move':
        this.updateMove(parts[2], parts[3]);
        break;
      case '-status':
        this.updateStatus(parts[2], parts[3]);
        break;
      case '-damage':
        this.updateHp(parts[2], parts[3]);
        break;
      case 'faint':
        this.updateFaint(parts[2]);
        break;
      case 'weather':
      case '-weather':
        this.updateField('weather', parts[2]);
        break;
      case '-terrain':
        this.updateField('terrain', parts[2]);
        break;
    }
  }

  snapshot(): BattleState {
    return this.state;
  }

  private updateSwitch(reference: string | undefined, hpText: string | undefined): void {
    const parsed = reference?.match(/^(p[12][a-z]\d*):\s*(.+)$/);
    if (!parsed) return;
    const slot = parsed[1];
    const species = parsed[2];
    if (!slot || !species) return;
    const player = playerOf(slot);
    if (!player) return;
    const existing = this.findPokemon(player, slot);
    const pokemon = existing
      ? { ...existing, species, ...parseHp(hpText), fainted: false }
      : pokemonFromMessage(slot, species, hpText);
    this.replacePokemon(player, pokemon);
    this.state = {
      ...this.state,
      active: { ...this.state.active, [player]: pokemon },
      sides: {
        ...this.state.sides,
        [player]: { ...this.state.sides[player], activeSlot: slot },
      },
    };
  }

  private updateMove(reference: string | undefined, move: string | undefined): void {
    const parsed = reference?.match(/^(p[12][a-z]\d*):/);
    const slot = parsed?.[1];
    if (!slot || !move) return;
    const player = playerOf(slot);
    if (!player) return;
    const pokemon = this.findPokemon(player, slot);
    if (!pokemon || pokemon.revealedMoves.includes(move)) return;
    this.replacePokemon(player, { ...pokemon, revealedMoves: [...pokemon.revealedMoves, move] });
  }

  private updateStatus(reference: string | undefined, status: string | undefined): void {
    const pokemon = this.findByReference(reference);
    if (!pokemon || !status) return;
    this.replacePokemon(pokemon.player, { ...pokemon.value, status });
  }

  private updateHp(reference: string | undefined, hpText: string | undefined): void {
    const pokemon = this.findByReference(reference);
    if (!pokemon) return;
    this.replacePokemon(pokemon.player, { ...pokemon.value, ...parseHp(hpText) });
  }

  private updateFaint(reference: string | undefined): void {
    const pokemon = this.findByReference(reference);
    if (!pokemon) return;
    this.replacePokemon(pokemon.player, { ...pokemon.value, hp: 0, fainted: true });
  }

  private updateField(field: 'weather' | 'terrain', value: string | undefined): void {
    const next: FieldState = { ...this.state.field, [field]: value ?? null };
    this.state = { ...this.state, field: next };
  }

  private findPokemon(player: PlayerId, slot: string): PokemonState | undefined {
    return this.state.sides[player].team.find((pokemon) => pokemon.slot === slot);
  }

  private findByReference(reference: string | undefined): { player: PlayerId; value: PokemonState } | undefined {
    const slot = reference?.match(/^(p[12][a-z]\d*)/)?.[1];
    const player = playerOf(slot ?? '');
    const value = player && slot ? this.findPokemon(player, slot) : undefined;
    return player && value ? { player, value } : undefined;
  }

  private replacePokemon(player: PlayerId, pokemon: PokemonState): void {
    const team = this.state.sides[player].team.filter((entry) => entry.slot !== pokemon.slot);
    const side = { ...this.state.sides[player], team: [...team, pokemon] };
    this.state = {
      ...this.state,
      active: this.state.sides[player].activeSlot === pokemon.slot
        ? { ...this.state.active, [player]: pokemon }
        : this.state.active,
      sides: { ...this.state.sides, [player]: side },
    };
  }
}