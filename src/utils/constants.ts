import type { ConstraintCategory } from './types';
import { POKEMON_TYPES, POKEMON_REGIONS, EVOLUTION_METHODS, EVOLUTION_TRIGGERS, SPECIAL_FORMS, POKEMON_CATEGORIES } from './types';

export interface Constraint {
  value: string;
  category: ConstraintCategory;
}

export const GRID_SIZE = 3;

export const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A878',
  Fire: '#F08030',
  Water: '#6890F0',
  Electric: '#F8D030',
  Grass: '#78C850',
  Ice: '#98D8D8',
  Fighting: '#C03028',
  Poison: '#A040A0',
  Ground: '#E0C068',
  Flying: '#A890F0',
  Psychic: '#F85888',
  Bug: '#A8B820',
  Rock: '#B8A038',
  Ghost: '#705898',
  Dragon: '#7038F8',
  Dark: '#705848',
  Steel: '#B8B8D0',
  Fairy: '#EE99AC',
};

export const REGION_COLORS: Record<string, string> = {
  Kanto: '#E3350D',
  Johto: '#CC9933',
  Hoenn: '#33CC33',
  Sinnoh: '#3366CC',
  Unova: '#333366',
  Kalos: '#0099FF',
  Alola: '#FF6699',
  Galar: '#7C7C7C',
  Hisui: '#6699CC',
  Paldea: '#E6A800',
  Unknown: '#808080',
};

export const EVOLUTION_COLORS: Record<string, string> = {
  'First Stage': '#78C850',
  'Middle Stage': '#F08030',
  'Final Stage': '#705898',
  'No Evolution Line': '#808080',
  'Not Fully Evolved': '#E67E22',
  'Evolved by Level': '#58D68D',
  'Evolved by Item': '#F4D03F',
  'Evolved by Trade': '#5DADE2',
  'Evolved by Friendship': '#F5B7B1',
  'Is Branched': '#AF7AC5',
  'Monotype': '#E74C3C',
  'Dualtype': '#3498DB',
};

export const FORM_COLORS: Record<string, string> = {
  'Gigantamax': '#FF69B4',
  'Mega Evolution': '#FF6347',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Legendary': '#FFD700',
  'Mythical': '#FF1493',
  'Ultra Beast': '#00CED1',
  'Paradox': '#9370DB',
  'Fossil': '#D2691E',
  'Starter': '#32CD32',
  'Baby': '#FFB6C1',
};

export interface ConstraintOption {
  value: string;
  label: string;
  category: ConstraintCategory;
}

export const CONSTRAINT_OPTIONS: { label: string; options: ConstraintOption[] }[] = [
  { label: 'Types', options: POKEMON_TYPES.map(t => ({ value: t, label: t, category: 'type' })) },
  { label: 'Typeline', options: [
    { value: 'Monotype', label: 'Monotype', category: 'typeline' },
    { value: 'Dualtype', label: 'Dualtype', category: 'typeline' },
  ]},
  { label: 'Regions', options: POKEMON_REGIONS.map(r => ({ value: r, label: r, category: 'region' })) },
  { label: 'Evolution', options: EVOLUTION_METHODS.map(s => ({ value: s, label: s, category: 'evolution' })) },
  { label: 'Branched', options: [{ value: 'Yes', label: 'Branched evolutions', category: 'branched' }] },
  { label: 'Evolution Triggers', options: EVOLUTION_TRIGGERS.map(t => ({ value: t, label: t, category: 'trigger' })) },
  { label: 'Forms', options: SPECIAL_FORMS.map(f => ({ value: f, label: f, category: 'form' })) },
  { label: 'Categories', options: POKEMON_CATEGORIES.map(c => ({ value: c, label: c, category: 'category' })) },
];

export const ALL_OPTIONS: ConstraintOption[] = CONSTRAINT_OPTIONS.flatMap(g => g.options);

export function getCategoryAbbr(category: string): string {
  switch (category) {
    case 'type': return 'T';
    case 'typeline': return 'Ty';
    case 'region': return 'R';
    case 'evolution': return 'E';
    case 'trigger': return 'Et';
    case 'branched': return 'B';
    case 'form': return 'F';
    case 'category': return 'C';
    default: return '?';
  }
}

export function findConstraintOption(value: string): ConstraintOption | null {
  return ALL_OPTIONS.find(o => o.value === value) || null;
}
