export const POKEMON_TYPES = [
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
] as const;

export const TYPE_LINES = ['Monotype', 'Dualtype'] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];
export type TypeLine = (typeof TYPE_LINES)[number];

export const TYPE_EMOJIS: Record<PokemonType, string> = {
  Normal: '⚪',
  Fire: '🔥',
  Water: '💧',
  Electric: '⚡',
  Grass: '🌿',
  Ice: '❄️',
  Fighting: '🥊',
  Poison: '🧪',
  Ground: '⛰️',
  Flying: '🪽',
  Psychic: '🔮',
  Bug: '🐛',
  Rock: '🪨',
  Ghost: '👻',
  Dragon: '🐉',
  Dark: '🌘',
  Steel: '⚙️',
  Fairy: '🧚',
};

export const typeWithEmoji = (type: PokemonType): string =>
  `${TYPE_EMOJIS[type]} ${type}`;

export const POKEMON_REGIONS = [
  'Kanto',
  'Johto',
  'Hoenn',
  'Sinnoh',
  'Unova',
  'Kalos',
  'Alola',
  'Galar',
  'Hisui',
  'Paldea',
] as const;

export type PokemonRegion = (typeof POKEMON_REGIONS)[number];

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

export const EVOLUTION_BRANCHED = ['Branched Evolution'] as const;

export type EvolutionMethod = (typeof EVOLUTION_METHODS)[number];
export type EvolutionBranched = (typeof EVOLUTION_BRANCHED)[number];
export type EvolutionTrigger = (typeof EVOLUTION_TRIGGERS)[number];

export const POKEMON_CATEGORIES = [
  'Legendary',
  'Mythical',
  'Ultra Beast',
  'Paradox',
  'Fossil',
  'First Partner',
  'Baby',
  'Gigantamax',
  'Mega Evolution',
] as const;

export type PokemonCategory = (typeof POKEMON_CATEGORIES)[number];

export const POKEMON_LEARNED_MOVES = [
  'Acrobatics',
  'Brick Break',
  'Calm Mind',
  'Close Combat',
  'Crunch',
  'Dazzling Gleam',
  'Earthquake',
  'Flamethrower',
  'Fly',
  'Hydro Pump',
  'Ice Beam',
  'Ice Punch',
  'Metronome',
  'Protect',
  'Psychic',
  'Razor Leaf',
  'Shadow Ball',
  'Surf',
  'Sludge Bomb',
  'Tail Slap',
  'Thunderbolt',
] as const;

export type PokemonLearnedMove = (typeof POKEMON_LEARNED_MOVES)[number];

export const POKEMON_ABILITIES = [
  'Intimidate',
  'Keen Eye',
  'Levitate',
  'Sturdy',
  'Swift Swim',
] as const;

export type PokemonAbility = (typeof POKEMON_ABILITIES)[number];

export const DEX_DIFFICULTIES = [
  'Easy',
  'Normal',
  'Hard',
  'Expert',
  'Nightmare',
  'Impossible',
] as const;
export type DexDifficulty = (typeof DEX_DIFFICULTIES)[number];

export const difficultyWithEmoji = (difficulty: string): string => {
  const value = (difficulty ?? 'Unknown').toLowerCase();

  if (value === 'easy') return '🟢 Easy';
  if (value === 'normal') return '🔵 Normal';
  if (value === 'hard') return '🟠 Hard';
  if (value === 'expert') return '🔴 Expert';
  if (value === 'nightmare') return '🟣 Nightmare';
  if (value === 'impossible') return '⚫ Impossible';

  return difficulty ?? 'Unknown';
};

export interface InternalPokemon {
  id: number;
  name: string;
  types: [PokemonType, PokemonType] | [PokemonType];
  region?: PokemonRegion[];
  evolution?: {
    from?: number[];
    to?: number[];
  };
  evolutionStage?: EvolutionMethod;
  evolutionTrigger?: EvolutionTrigger[];
  isBranched?: boolean;
  categories?: PokemonCategory[];
  learnedMoves?: PokemonLearnedMove[];
  abilities?: PokemonAbility[];
  sprite?: string;
  shinySprite?: string;
  formId?: number;
}

export interface Pokemon extends InternalPokemon {
  dexDifficulty: DexDifficulty;
  dexDifficultyPercentile: number;
}

export type ConstraintCategory = 'types' | 'regions' | 'evolution' | 'category' | 'move' | 'ability';

export interface FilterOptionDefinition {
  name: string;
  matches: (pokemon: Pokemon) => boolean;
}

export interface FilterCategoryDefinition {
  key: ConstraintCategory;
  label: string;
  options: FilterOptionDefinition[];
}

const hasType = (pokemon: Pokemon, typeName: string): boolean =>
  pokemon.types.some((type) => type === typeName);

export const FILTER_CATEGORIES: FilterCategoryDefinition[] = [
  {
    key: 'types',
    label: 'Types',
    options: [
      ...POKEMON_TYPES.map((name) => ({
        name,
        matches: (pokemon: Pokemon) => hasType(pokemon, name),
      })),
      { name: 'Monotype', matches: (pokemon) => pokemon.types.length === 1 },
      { name: 'Dualtype', matches: (pokemon) => pokemon.types.length === 2 },
    ],
  },
  {
    key: 'regions',
    label: 'Regions',
    options: POKEMON_REGIONS.map((name) => ({
      name,
      matches: (pokemon: Pokemon) => pokemon.region?.includes(name) ?? false,
    })),
  },
  {
    key: 'evolution',
    label: 'Evolution',
    options: [
      {
        name: 'First Stage',
        matches: (pokemon) => pokemon.evolutionStage === 'First Stage',
      },
      {
        name: 'Middle Stage',
        matches: (pokemon) => pokemon.evolutionStage === 'Middle Stage',
      },
      {
        name: 'Final Stage',
        matches: (pokemon) => pokemon.evolutionStage === 'Final Stage',
      },
      {
        name: 'No Evolution Line',
        matches: (pokemon) => pokemon.evolutionStage === 'No Evolution Line',
      },
      {
        name: 'Not Fully Evolved',
        matches: (pokemon) =>
          pokemon.evolutionStage === 'First Stage' ||
          pokemon.evolutionStage === 'Middle Stage',
      },
      ...EVOLUTION_TRIGGERS.map((trigger) => ({
        name: trigger,
        matches: (pokemon: Pokemon) =>
          pokemon.evolutionTrigger?.includes(trigger) ?? false,
      })),
      {
        name: 'Branched Evolution',
        matches: (pokemon) => pokemon.isBranched === true,
      },
    ],
  },
  {
    key: 'category',
    label: 'Categories',
    options: POKEMON_CATEGORIES.map((name) => ({
      name,
      matches: (pokemon: Pokemon) => pokemon.categories?.includes(name) ?? false,
    })),
  },
  {
    key: 'move',
    label: 'Moves',
    options: POKEMON_LEARNED_MOVES.map((name) => ({
      name,
      matches: (pokemon: Pokemon) => pokemon.learnedMoves?.includes(name) ?? false,
    })),
  },
  {
    key: 'ability',
    label: 'Abilities',
    options: POKEMON_ABILITIES.map((name) => ({
      name,
      matches: (pokemon: Pokemon) => pokemon.abilities?.includes(name) ?? false,
    })),
  },
];

export function getCategoryOptionSlug(categoryKey: ConstraintCategory, optionName: string): string {
  const baseSlug = optionName.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');
  if (categoryKey === 'move' && baseSlug === 'psychic') {
    return 'psychic-move';
  }
  return baseSlug;
}

export { POKEDOKU_FORM_ID_MAPPING } from './pokemon-pokedoku-mapping';
