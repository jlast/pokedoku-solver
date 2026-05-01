export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
] as const;

export const TYPE_LINES = ['Monotype', 'Dualtype'] as const;

export type PokemonType = typeof POKEMON_TYPES[number];
export type TypeLine = typeof TYPE_LINES[number];

export const POKEMON_REGIONS = [
  'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'
] as const;

export type PokemonRegion = typeof POKEMON_REGIONS[number];

export const EVOLUTION_METHODS = [
  'First Stage',
  'Middle Stage', 
  'Final Stage',
  'No Evolution Line',
  'Not Fully Evolved',
] as const;

export const EVOLUTION_TRIGGERS = [
  'Evolved by Level',
  'Evolved by Item',
  'Evolved by Trade',
  'Evolved by Friendship',
] as const;

export const EVOLUTION_BRANCHED = ['Branched evolution'] as const;

export type EvolutionMethod = typeof EVOLUTION_METHODS[number];
export type EvolutionBranched = typeof EVOLUTION_BRANCHED[number];
export type EvolutionTrigger = typeof EVOLUTION_TRIGGERS[number];

export const POKEMON_CATEGORIES = [
  'Legendary', 'Mythical', 'Ultra Beast', 'Paradox', 'Fossil', 'First Partner', 'Baby', 'Gigantamax', 'Mega Evolution'
] as const;

export type PokemonCategory = typeof POKEMON_CATEGORIES[number];

export const DEX_DIFFICULTIES = ['Easy', 'Normal', 'Hard', 'Expert', 'Nightmare', 'Impossible'] as const;
export type DexDifficulty = typeof DEX_DIFFICULTIES[number];

export interface Pokemon {
  id: number;
  name: string;
  types: [PokemonType, PokemonType] | [PokemonType];
  region?: PokemonRegion;
  evolutionStage?: EvolutionMethod;
  evolutionTrigger?: EvolutionTrigger[];
  isBranched?: boolean;
  categories?: PokemonCategory[];
  sprite?: string;
  dexDifficulty?: DexDifficulty;
  dexDifficultyPercentile?: number;
  formId?: number;
}
