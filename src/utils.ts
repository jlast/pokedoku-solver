import type { Pokemon, EvolutionTrigger, PokemonType } from './types';
import type { Constraint, ConstraintOption } from './constants';
import { ALL_OPTIONS } from './constants';

export function matchesConstraint(p: Pokemon, constraint: Constraint | null): boolean {
  if (!constraint) return true;
  
  if (constraint.category === 'type') {
    return p.types.includes(constraint.value as PokemonType);
  } else if(constraint.category === 'typeline') {
    if (constraint.value === 'Monotype') return p.types.length === 1;
    if (constraint.value === 'Dualtype') return p.types.length === 2;
  } else if (constraint.category === 'region') {
    return p.region === constraint.value;
  } else if (constraint.category === 'evolution') {
    return p.evolutionStage === constraint.value;
  } else if (constraint.category === 'trigger') {
    return p.evolutionTrigger?.includes(constraint.value as EvolutionTrigger) ?? false;
  } else if (constraint.category === 'branched') {
    return constraint.value === 'Yes' ? (p.isBranched ?? false) : !(p.isBranched ?? false);
  } else if (constraint.category === 'form') {
    return p.specialForm === constraint.value;
  } else if (constraint.category === 'category') {
    return p.category === constraint.value;
  }
  return true;
}

export function parseConstraintFromParam(value: string): Constraint | null {
  const option = ALL_OPTIONS.find(o => o.value === value) || 
                 ALL_OPTIONS.find(o => o.label.toLowerCase() === value.toLowerCase());
  return option ? { value: option.value, category: option.category } : null;
}

export function findConstraintOption(value: string): ConstraintOption | null {
  return ALL_OPTIONS.find(o => o.value === value) || null;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
