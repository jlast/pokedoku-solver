import type { Pokemon } from '@pokedoku-helper/shared-types';
import type { Constraint } from '../../../../lib/shared/filters';
import { parseCategoryId, type ParsedCategory } from '../components/puzzle-stats/categoryUtils';

function isTypeConstraint(constraint: Constraint | null): boolean {
  return constraint?.category === 'type' || constraint?.category === 'types';
}

function isRegionConstraint(constraint: Constraint | null): boolean {
  return constraint?.category === 'region' || constraint?.category === 'regions';
}

function pushUniqueBadge(
  badges: ParsedCategory[],
  seen: Set<string>,
  rawCategoryId: string,
  blockedLabels: Set<string>,
) {
  const parsed = parseCategoryId(rawCategoryId);
  const key = `${parsed.type}:${parsed.label}`;
  if (seen.has(key) || blockedLabels.has(key)) return;
  seen.add(key);
  badges.push(parsed);
}

export function buildSpoilerHintBadges({
  pokemon,
  rowConstraint,
  colConstraint,
}: {
  pokemon: Pokemon | null;
  rowConstraint: Constraint | null;
  colConstraint: Constraint | null;
}): ParsedCategory[] {
  if (!pokemon) return [];

  const constraints = [rowConstraint, colConstraint];
  const typeConstraints = constraints.filter(isTypeConstraint);
  const hasRegionConstraint = constraints.some(isRegionConstraint);
  const blockedLabels = new Set(
    constraints
      .filter((constraint): constraint is Constraint => Boolean(constraint))
      .map((constraint) => {
        if (isTypeConstraint(constraint)) return `types:${constraint.value}`;
        if (isRegionConstraint(constraint)) return `regions:${constraint.value}`;
        return `${constraint.category}:${constraint.value}`;
      }),
  );

  const badges: ParsedCategory[] = [];
  const seen = new Set<string>();

  if (typeConstraints.length === 0) {
    for (const type of pokemon.types) {
      pushUniqueBadge(badges, seen, `types:${type}`, blockedLabels);
    }
    return badges;
  }

  for (const type of pokemon.types) {
    pushUniqueBadge(badges, seen, `types:${type}`, blockedLabels);
  }

  if (pokemon.region) {
    pushUniqueBadge(badges, seen, `regions:${pokemon.region}`, blockedLabels);
  }

  if (typeConstraints.length === 1 && hasRegionConstraint && pokemon.types.length === 1) {
    pushUniqueBadge(badges, seen, 'types:Monotype', blockedLabels);
  }

  return badges;
}
