import type { Pokemon } from '@pokedoku-helper/shared-types';
import { FILTER_CATEGORIES, matchesConstraint, type Constraint } from '../../../../lib/shared/filters';
import { CATEGORY_COMBINATION_FILTER_KEYS } from '../../../../lib/shared/categoryCombinations';
import { compareByHardest, getPokemonKey, getPokemonKeyId } from './pokemonGrid';

export interface TextualSuggestionEntry {
  key: string;
  rowConstraint: Constraint | null;
  colConstraint: Constraint | null;
  pokemon: Pokemon | null;
  ownedFallbackPokemon: Pokemon | null;
}

export function createEmptyPokemonGrid(size: number): (Pokemon | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function createEmptyKeyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function buildEvolutionLineResolver(pokemon: Pokemon[]): (id: number) => string {
  const nodes = new Map<number, Set<number>>();
  const byId = new Map<number, Pokemon>();

  for (const entry of pokemon) {
    byId.set(entry.id, entry);
    if (!nodes.has(entry.id)) nodes.set(entry.id, new Set<number>());
  }

  for (const entry of pokemon) {
    const neighbors = nodes.get(entry.id);
    if (!neighbors) continue;

    const from = entry.evolution?.from ?? [];
    const to = entry.evolution?.to ?? [];
    for (const neighborId of [...from, ...to]) {
      if (!byId.has(neighborId)) continue;
      neighbors.add(neighborId);
      nodes.get(neighborId)?.add(entry.id);
    }
  }

  const visited = new Set<number>();
  const lineById = new Map<number, string>();

  for (const nodeId of nodes.keys()) {
    if (visited.has(nodeId)) continue;

    const stack = [nodeId];
    const component: number[] = [];
    visited.add(nodeId);

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;

      component.push(current);
      for (const neighbor of nodes.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    const key = String(Math.min(...component));
    for (const id of component) lineById.set(id, key);
  }

  return (id: number) => lineById.get(id) ?? String(id);
}

interface CategoryCombinationOption {
  constraint: Constraint;
}

interface CategoryCombinationGroup {
  key: string;
  left: CategoryCombinationOption;
  right: CategoryCombinationOption;
}

function buildCategoryCombinationGroups(pokemon: Pokemon[]): CategoryCombinationGroup[] {
  const options = FILTER_CATEGORIES.filter((category) => CATEGORY_COMBINATION_FILTER_KEYS.includes(category.key)).flatMap((category) =>
    category.options.map((option) => ({
      constraint: { category: category.key, value: option.name },
    })),
  );

  const resolveEvolutionLine = buildEvolutionLineResolver(pokemon);
  const groups: CategoryCombinationGroup[] = [];

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const left = options[i];
      const right = options[j];
      const matching = pokemon.filter((candidate) =>
        matchesConstraint(candidate, left.constraint) && matchesConstraint(candidate, right.constraint),
      );

      if (matching.length === 0) continue;

      const lineCount = new Set(matching.map((candidate) => resolveEvolutionLine(candidate.id))).size;
      if (lineCount <= 1) continue;

      groups.push({
        key: `${left.constraint.category}:${left.constraint.value}|${right.constraint.category}:${right.constraint.value}`,
        left,
        right,
      });
    }
  }

  return groups;
}

export function buildPersonalizedRemainingGroupScoreMap({
  pokemon,
  remainingPokemon,
}: {
  pokemon: Pokemon[];
  remainingPokemon: Pokemon[];
}): Map<number, number> {
  const groups = buildCategoryCombinationGroups(pokemon);
  const remainingCountByGroupKey = new Map<string, number>();

  for (const group of groups) {
    const remainingCount = remainingPokemon.filter((candidate) =>
      matchesConstraint(candidate, group.left.constraint) && matchesConstraint(candidate, group.right.constraint),
    ).length;
    remainingCountByGroupKey.set(group.key, remainingCount);
  }

  const minRemainingCountByKeyId = new Map<number, number>();

  for (const entry of remainingPokemon) {
    let minRemainingCount = Number.POSITIVE_INFINITY;

    for (const group of groups) {
      if (!matchesConstraint(entry, group.left.constraint) || !matchesConstraint(entry, group.right.constraint)) {
        continue;
      }

      const remainingCount = remainingCountByGroupKey.get(group.key);
      if (remainingCount === undefined) continue;
      minRemainingCount = Math.min(minRemainingCount, remainingCount);
    }

    if (Number.isFinite(minRemainingCount)) {
      minRemainingCountByKeyId.set(getPokemonKeyId(entry), minRemainingCount);
    }
  }

  return minRemainingCountByKeyId;
}

export function assignSuggestedCellsFromCandidates(
  candidatesByCell: Pokemon[][][],
  initiallyReservedKeyIds: Iterable<number> = [],
  allowDuplicateFallback = true,
): (Pokemon | null)[][] {
  const gridSize = candidatesByCell.length;
  const suggestedCells = createEmptyPokemonGrid(gridSize);

  const cellOrder = Array.from({ length: gridSize * gridSize }, (_, index) => ({
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  })).sort((a, b) => candidatesByCell[a.row][a.col].length - candidatesByCell[b.row][b.col].length);

  const cellKeyToPosition = new Map(cellOrder.map((cell) => [`${cell.row}-${cell.col}`, cell]));
  const matchedCellKeyByPokemonKeyId = new Map<number, string>(
    Array.from(initiallyReservedKeyIds, (keyId) => [keyId, '__reserved__']),
  );
  const matchedPokemonByCellKey = new Map<string, Pokemon>();

  const tryMatchCell = (row: number, col: number, visitedPokemonKeyIds: Set<number>): boolean => {
    for (const candidate of candidatesByCell[row][col]) {
      const keyId = getPokemonKeyId(candidate);
      if (visitedPokemonKeyIds.has(keyId)) continue;

      visitedPokemonKeyIds.add(keyId);
      const matchedCellKey = matchedCellKeyByPokemonKeyId.get(keyId);
      if (!matchedCellKey) {
        matchedCellKeyByPokemonKeyId.set(keyId, `${row}-${col}`);
        matchedPokemonByCellKey.set(`${row}-${col}`, candidate);
        return true;
      }

      const matchedCell = cellKeyToPosition.get(matchedCellKey);
      if (!matchedCell) continue;

      if (tryMatchCell(matchedCell.row, matchedCell.col, visitedPokemonKeyIds)) {
        matchedCellKeyByPokemonKeyId.set(keyId, `${row}-${col}`);
        matchedPokemonByCellKey.set(`${row}-${col}`, candidate);
        return true;
      }
    }

    return false;
  };

  for (const { row, col } of cellOrder) {
    if (candidatesByCell[row][col].length === 0) continue;
    tryMatchCell(row, col, new Set<number>());
  }

  for (const { row, col } of cellOrder) {
    const candidates = candidatesByCell[row][col];
    if (candidates.length === 0) continue;

    suggestedCells[row][col] = matchedPokemonByCellKey.get(`${row}-${col}`) ?? (allowDuplicateFallback ? candidates[0] : null);
  }

  return suggestedCells;
}

export function buildSuggestedCells(
  pokemon: Pokemon[],
  rowConstraints: (Constraint | null)[],
  colConstraints: (Constraint | null)[],
  personalizedRemainingGroupScoreByKeyId?: Map<number, number>,
): { cells: (Pokemon | null)[][]; suggestedKeys: (string | null)[][] } {
  const gridSize = rowConstraints.length;
  const candidatesByCell: Pokemon[][][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => [] as Pokemon[]),
  );

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      candidatesByCell[row][col] = pokemon
        .filter((entry) => matchesConstraint(entry, rowConstraints[row]) && matchesConstraint(entry, colConstraints[col]))
        .sort((a, b) => {
          const aScore = personalizedRemainingGroupScoreByKeyId?.get(getPokemonKeyId(a)) ?? Number.NEGATIVE_INFINITY;
          const bScore = personalizedRemainingGroupScoreByKeyId?.get(getPokemonKeyId(b)) ?? Number.NEGATIVE_INFINITY;
          if (aScore !== bScore) return bScore - aScore;
          return compareByHardest(a, b);
        });
    }
  }

  const suggestedCells = assignSuggestedCellsFromCandidates(candidatesByCell, [], false);

  return {
    cells: suggestedCells,
    suggestedKeys: suggestedCells.map((row) => row.map((cell) => (cell ? getPokemonKey(cell) : null))),
  };
}

export function buildFallbackOwnedCells({
  pokemon,
  gridCells,
  rowConstraints,
  colConstraints,
  caughtSet,
  shinyPokemonKeyIds,
}: {
  pokemon: Pokemon[];
  gridCells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  caughtSet: Set<number>;
  shinyPokemonKeyIds: Set<number>;
}): (Pokemon | null)[][] {
  const gridSize = rowConstraints.length;
  const result = createEmptyPokemonGrid(gridSize);

  const selectedKeyIds = new Set(
    gridCells
      .flat()
      .filter((cell): cell is Pokemon => Boolean(cell))
      .map((cell) => getPokemonKeyId(cell)),
  );
  const fallbackCandidatesByCell: Pokemon[][][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => [] as Pokemon[]),
  );

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (gridCells[row][col] !== null) continue;

      fallbackCandidatesByCell[row][col] = pokemon
        .filter((entry) => {
          if (!matchesConstraint(entry, rowConstraints[row])) return false;
          if (!matchesConstraint(entry, colConstraints[col])) return false;

          const keyId = getPokemonKeyId(entry);
          return caughtSet.has(keyId) && !shinyPokemonKeyIds.has(keyId);
        })
        .sort(compareByHardest);
    }
  }

  const uniqueFallbackCells = assignSuggestedCellsFromCandidates(fallbackCandidatesByCell, selectedKeyIds, false);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (gridCells[row][col] !== null) continue;

      const uniquePick = uniqueFallbackCells[row][col];
      result[row][col] = uniquePick;
    }
  }

  return result;
}

export function buildTextualSuggestionEntries({
  gridCells,
  rowConstraints,
  colConstraints,
  fallbackOwnedCells,
}: {
  gridCells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  fallbackOwnedCells: (Pokemon | null)[][];
}): TextualSuggestionEntry[] {
  const gridSize = rowConstraints.length;
  const entries: TextualSuggestionEntry[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      entries.push({
        key: `${row}-${col}`,
        rowConstraint: rowConstraints[row],
        colConstraint: colConstraints[col],
        pokemon: gridCells[row][col],
        ownedFallbackPokemon: fallbackOwnedCells[row][col],
      });
    }
  }

  return entries.sort((a, b) => {
    const aRank = a.pokemon ? 0 : a.ownedFallbackPokemon ? 1 : 2;
    const bRank = b.pokemon ? 0 : b.ownedFallbackPokemon ? 1 : 2;
    return aRank - bRank;
  });
}
