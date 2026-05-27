import type { Pokemon } from '@pokedoku-helper/shared-types';
import { CATEGORY_COLORS, REGION_COLORS, TYPE_COLORS } from '../../../../lib/shared/constants';
import type { Constraint } from '../../../../lib/shared/filters';
import { parseCategoryId, type ParsedCategory } from '../components/puzzle-stats/categoryUtils';

const DIFFICULTY_RANK: Record<string, number> = {
  Easy: 0,
  Normal: 1,
  Hard: 2,
  Expert: 3,
  Nightmare: 4,
  Impossible: 5,
};

export function getPokemonKey(pokemon: Pokemon): string {
  return pokemon.sprite || pokemon.name;
}

export function getPokemonKeyId(pokemon: Pokemon): number {
  return pokemon.formId ?? pokemon.id;
}

export function compareByHardest(a: Pokemon, b: Pokemon): number {
  const aDifficulty = a.dexDifficulty ? DIFFICULTY_RANK[a.dexDifficulty] ?? -1 : -1;
  const bDifficulty = b.dexDifficulty ? DIFFICULTY_RANK[b.dexDifficulty] ?? -1 : -1;
  if (aDifficulty !== bDifficulty) return bDifficulty - aDifficulty;

  const aPercentile = a.dexDifficultyPercentile ?? Number.POSITIVE_INFINITY;
  const bPercentile = b.dexDifficultyPercentile ?? Number.POSITIVE_INFINITY;
  if (aPercentile !== bPercentile) return bPercentile - aPercentile;

  return a.id - b.id;
}

export function constraintToParsedCategory(constraint: Constraint | null): ParsedCategory | null {
  if (!constraint) return null;

  const typeMap: Record<string, string> = {
    type: 'types',
    types: 'types',
    typeline: 'types',
    move: 'move',
    moves: 'move',
    region: 'regions',
    regions: 'regions',
    evolution: 'evolution',
    category: 'category',
  };

  const mappedType = typeMap[constraint.category] ?? constraint.category;
  return parseCategoryId(`${mappedType}:${constraint.value}`);
}

export function getConstraintColor(constraint: Constraint | null): string | undefined {
  if (!constraint) return undefined;
  if (TYPE_COLORS[constraint.value]) return TYPE_COLORS[constraint.value];
  if (constraint.category === 'typeline') return '#3498db';
  if (constraint.value.includes('Stage') || constraint.value.includes('Evolution')) return '#F08030';
  if (constraint.category === 'region') return REGION_COLORS[constraint.value];
  if (constraint.category === 'category') return CATEGORY_COLORS[constraint.value];
  return undefined;
}
