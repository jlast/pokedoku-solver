import type { Pokemon, PokemonLearnedMove } from "@pokedoku-helper/shared-types";
import { TYPE_COLORS, REGION_COLORS, EVOLUTION_COLORS, CATEGORY_COLORS } from './constants';

export const POKEMON_LEARNED_MOVES = ['Surf'] as const;

export type ConstraintCategory = 'types' | 'regions' | 'evolution' | 'category' | 'move';

export interface Constraint {
  category: string;
  value: string;
}

export interface FilterOption {
  name: string;
  filter: (pokemon: Pokemon) => boolean;
  color?: string;
}

export interface FilterCategory {
  key: ConstraintCategory;
  label: string;
  options: FilterOption[];
}

const TYPE_OPTIONS = [
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

const REGION_OPTIONS = [
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
  'Unknown',
] as const;

const EVOLUTION_TRIGGER_OPTIONS = [
  'Evolved by Level',
  'Evolved by Item',
  'Evolved by Trade',
  'Evolved by Friendship',
] as const;

const CATEGORY_OPTIONS = [
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

const MOVE_OPTIONS = POKEMON_LEARNED_MOVES;

export const FILTER_CATEGORIES: FilterCategory[] = [
  {
    key: 'types',
    label: 'Types',
    options: [
      ...TYPE_OPTIONS.map((name) => ({
        name,
        filter: (pokemon: Pokemon) => pokemon.types.some((type) => type === name),
        color: TYPE_COLORS[name],
      })),
      {
        name: 'Monotype',
        filter: (pokemon: Pokemon) => pokemon.types.length === 1,
        color: '#E74C3C',
      },
      {
        name: 'Dualtype',
        filter: (pokemon: Pokemon) => pokemon.types.length === 2,
        color: '#3498DB',
      },
    ],
  },
  {
    key: 'regions',
    label: 'Regions',
    options: REGION_OPTIONS.map((name) => ({
      name,
      filter: (pokemon: Pokemon) => pokemon.region === name,
      color: REGION_COLORS[name],
    })),
  },
  {
    key: 'evolution',
    label: 'Evolution',
    options: [
      {
        name: 'First Stage',
        filter: (pokemon: Pokemon) => pokemon.evolutionStage === 'First Stage',
        color: EVOLUTION_COLORS['First Stage'],
      },
      {
        name: 'Middle Stage',
        filter: (pokemon: Pokemon) => pokemon.evolutionStage === 'Middle Stage',
        color: EVOLUTION_COLORS['Middle Stage'],
      },
      {
        name: 'Final Stage',
        filter: (pokemon: Pokemon) => pokemon.evolutionStage === 'Final Stage',
        color: EVOLUTION_COLORS['Final Stage'],
      },
      {
        name: 'No Evolution Line',
        filter: (pokemon: Pokemon) => pokemon.evolutionStage === 'No Evolution Line',
        color: EVOLUTION_COLORS['No Evolution Line'],
      },
      {
        name: 'Not Fully Evolved',
        filter: (pokemon: Pokemon) =>
          pokemon.evolutionStage === 'First Stage' || pokemon.evolutionStage === 'Middle Stage',
        color: EVOLUTION_COLORS['Not Fully Evolved'],
      },
      ...EVOLUTION_TRIGGER_OPTIONS.map((trigger) => ({
        name: trigger,
        filter: (pokemon: Pokemon) => pokemon.evolutionTrigger?.includes(trigger) ?? false,
        color: EVOLUTION_COLORS[trigger],
      })),
      {
        name: 'Branched evolution',
        filter: (pokemon: Pokemon) => pokemon.isBranched === true,
        color: EVOLUTION_COLORS['Branched evolution'],
      },
    ],
  },
  {
    key: 'category',
    label: 'Categories',
    options: CATEGORY_OPTIONS.map((name) => ({
      name,
      filter: (pokemon: Pokemon) => pokemon.categories?.includes(name) ?? false,
      color: CATEGORY_COLORS[name],
    })),
  },
  {
    key: 'move',
    label: 'Moves',
    options: MOVE_OPTIONS.map((name) => ({
      name,
      filter: (pokemon: Pokemon) => pokemon.learnedMoves?.includes(name) ?? false,
      color: '#0ea5e9',
    })),
  },
];

export const FILTER_KEY_TO_CONSTRAINT_CATEGORY: Record<string, string> = {
  types: 'type',
  regions: 'region',
  evolution: 'evolution',
  category: 'category',
  move: 'move',
};

export function findConstraintOption(value: string): { value: string; category: string } | null {
  for (const cat of FILTER_CATEGORIES) {
    const opt = cat.options.find(o => o.name === value);
    if (opt) {
      return { value: opt.name, category: FILTER_KEY_TO_CONSTRAINT_CATEGORY[cat.key] };
    }
  }
  return null;
}

export function matchesConstraint(pokemon: Pokemon, constraint: Constraint | null): boolean {
  if (!constraint) return true;
  if (constraint.category === 'move') {
    return pokemon.learnedMoves?.includes(constraint.value as PokemonLearnedMove) ?? false;
  }
  for (const cat of FILTER_CATEGORIES) {
    const opt = cat.options.find(o => o.name === constraint.value);
    if (opt) {
      return opt.filter(pokemon);
    }
  }
  return false;
}

export type FilterState = Record<string, string[]>;

export function parseFiltersFromUrl(params: URLSearchParams): FilterState {
  const filters: FilterState = {};
  
  FILTER_CATEGORIES.forEach(cat => {
    const values = params.get(cat.key)?.split(',').filter(Boolean) || [];
    const validOptions = cat.options.map(o => o.name);
    filters[cat.key] = values.filter(v => validOptions.includes(v));
  });

  return filters;
}

export function getActiveFilters(filters: FilterState): number {
  return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);
}

export function getFiltersForUrl(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  
  FILTER_CATEGORIES.forEach(cat => {
    if (filters[cat.key]?.length > 0) {
      params.set(cat.key, filters[cat.key].join(','));
    }
  });

  return params;
}

export function applyFilters(pokemon: Pokemon[], filters: FilterState): Pokemon[] {
  return pokemon.filter(p => {
    for (const cat of FILTER_CATEGORIES) {
      const selected = filters[cat.key];
      if (!selected || selected.length === 0) continue;
      
      // AND logic: must match ALL selected options
      const matches = selected.every(optionName => {
        const opt = cat.options.find(o => o.name === optionName);
        return opt?.filter(p) ?? false;
      });
      
      if (!matches) return false;
    }
    return true;
  });
}
