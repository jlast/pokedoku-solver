export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
] as const;

export type PokemonType = typeof POKEMON_TYPES[number];

export const POKEMON_REGIONS = [
  'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'
] as const;

export type PokemonRegion = typeof POKEMON_REGIONS[number];

export const EVOLUTION_METHODS = [
  'First Stage',
  'Middle Stage', 
  'Final Stage',
  'No Evolution Line',
  'Monotype',
  'Dualtype'
] as const;

export const EVOLUTION_TRIGGERS = [
  'Evolved by Level',
  'Evolved by Item',
  'Evolved by Trade',
  'Evolved by Friendship',
] as const;

export type EvolutionMethod = typeof EVOLUTION_METHODS[number];
export type EvolutionTrigger = typeof EVOLUTION_TRIGGERS[number];

export const SPECIAL_FORMS = ['Gigantamax', 'Mega Evolution'] as const;

export type SpecialForm = typeof SPECIAL_FORMS[number];

export const POKEMON_CATEGORIES = [
  'Legendary', 'Mythical', 'Ultra Beast', 'Paradox', 'Fossil', 'Starter', 'Baby'
] as const;

export type PokemonCategory = typeof POKEMON_CATEGORIES[number];

export interface Pokemon {
  id: number;
  name: string;
  types: [PokemonType, PokemonType?] | [PokemonType];
  region?: PokemonRegion;
  evolutionStage?: EvolutionMethod;
  evolutionTrigger?: EvolutionTrigger;
  isBranched?: boolean;
  specialForm?: SpecialForm;
  category?: PokemonCategory;
}
