import type { ConstraintCategory } from './filters';

export const CATEGORY_COMBINATION_FILTER_KEYS: ConstraintCategory[] = [
  'types',
  'regions',
  'evolution',
  'category',
];

export function isCategoryCombinationFilterKey(value: string): value is ConstraintCategory {
  return CATEGORY_COMBINATION_FILTER_KEYS.includes(value as ConstraintCategory);
}
