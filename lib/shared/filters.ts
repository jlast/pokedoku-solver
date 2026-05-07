import { FILTER_CATEGORIES as SHARED_FILTER_CATEGORIES } from "@pokedoku-helper/shared-types";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { TYPE_COLORS, REGION_COLORS, EVOLUTION_COLORS, CATEGORY_COLORS } from './constants';

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

export const FILTER_CATEGORIES: FilterCategory[] = [
  {
    key: 'types',
    label: 'Types',
    options: SHARED_FILTER_CATEGORIES.find((cat) => cat.key === 'types')!.options.map(
      (option) => ({
        name: option.name,
        filter: option.matches,
        color:
          TYPE_COLORS[option.name] ??
          (option.name === 'Monotype' ? '#E74C3C' : option.name === 'Dualtype' ? '#3498DB' : undefined),
      })
    ),
  },
  {
    key: 'regions',
    label: 'Regions',
    options: SHARED_FILTER_CATEGORIES.find((cat) => cat.key === 'regions')!.options.map(
      (option) => ({
        name: option.name,
        filter: option.matches,
        color: REGION_COLORS[option.name],
      })
    ),
  },
  {
    key: 'evolution',
    label: 'Evolution',
    options: SHARED_FILTER_CATEGORIES.find((cat) => cat.key === 'evolution')!.options.map(
      (option) => ({
        name: option.name,
        filter: option.matches,
        color: EVOLUTION_COLORS[option.name],
      })
    ),
  },
  {
    key: 'category',
    label: 'Categories',
    options: SHARED_FILTER_CATEGORIES.find((cat) => cat.key === 'category')!.options.map(
      (option) => ({
        name: option.name,
        filter: option.matches,
        color: CATEGORY_COLORS[option.name],
      })
    ),
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
