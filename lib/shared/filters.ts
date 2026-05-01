import type { Pokemon, PokemonCategory } from './types';
import { TYPE_COLORS, REGION_COLORS, EVOLUTION_COLORS, CATEGORY_COLORS } from './constants';
import { EVOLUTION_TRIGGERS } from './types';

export type ConstraintCategory = 'types' | 'regions' | 'evolution' | 'category';

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

function hasType(p: Pokemon, typeName: string): boolean {
  return p.types.some(t => t === typeName);
}

export const FILTER_CATEGORIES: FilterCategory[] = [
  {
    key: 'types',
    label: 'Types',
    options: [
      ...Object.keys(TYPE_COLORS).map(name => ({
        name,
        filter: (p: Pokemon) => hasType(p, name),
        color: TYPE_COLORS[name],
      })),
      { name: 'Monotype', filter: (p) => p.types.length === 1, color: '#E74C3C' },
      { name: 'Dualtype', filter: (p) => p.types.length === 2, color: '#3498DB' },
    ],
  },
  {
    key: 'regions',
    label: 'Regions',
    options: [
      ...Object.keys(REGION_COLORS).map(name => ({
        name,
        filter: (p: Pokemon) => p.region === name,
        color: REGION_COLORS[name],
      })),
    ],
  },
  {
    key: 'evolution',
    label: 'Evolution',
    options: [
      { name: 'First Stage', filter: (p) => p.evolutionStage === 'First Stage', color: EVOLUTION_COLORS['First Stage'] },
      { name: 'Middle Stage', filter: (p) => p.evolutionStage === 'Middle Stage', color: EVOLUTION_COLORS['Middle Stage'] },
      { name: 'Final Stage', filter: (p) => p.evolutionStage === 'Final Stage', color: EVOLUTION_COLORS['Final Stage'] },
      { name: 'No Evolution Line', filter: (p) => p.evolutionStage === 'No Evolution Line', color: EVOLUTION_COLORS['No Evolution Line'] },
      { name: 'Not Fully Evolved', filter: (p) => p.evolutionStage === 'First Stage' || p.evolutionStage === 'Middle Stage', color: EVOLUTION_COLORS['Not Fully Evolved'] },
      ...EVOLUTION_TRIGGERS.map(trigger => ({
        name: trigger,
        filter: (p: Pokemon) => p.evolutionTrigger?.includes(trigger) ?? false,
        color: EVOLUTION_COLORS[trigger],
      })),
      { name: 'Branched evolution', filter: (p) => p.isBranched === true, color: EVOLUTION_COLORS['Branched evolution'] },
    ],
  },
  {
    key: 'category',
    label: 'Categories',
    options: [
      ...Object.keys(CATEGORY_COLORS).map(name => ({
        name,
        filter: (p: Pokemon) => p.categories?.includes(name as PokemonCategory) ?? false,
        color: CATEGORY_COLORS[name],
      })),
    ],
  },
];

export const FILTER_KEY_TO_CONSTRAINT_CATEGORY: Record<string, string> = {
  types: 'type',
  regions: 'region',
  evolution: 'evolution',
  category: 'category',
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
