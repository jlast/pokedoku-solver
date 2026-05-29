import type { Pokemon } from '@pokedoku-helper/shared-types';
import { matchesConstraint, type Constraint } from '../../../../lib/shared/filters';
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
): { cells: (Pokemon | null)[][]; suggestedKeys: (string | null)[][] } {
  const gridSize = rowConstraints.length;
  const candidatesByCell: Pokemon[][][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => [] as Pokemon[]),
  );

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      candidatesByCell[row][col] = pokemon
        .filter((entry) => matchesConstraint(entry, rowConstraints[row]) && matchesConstraint(entry, colConstraints[col]))
        .sort(compareByHardest);
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
  possiblePokemon,
  caughtSet,
  shinyPokemonKeyIds,
}: {
  pokemon: Pokemon[];
  gridCells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  possiblePokemon: Pokemon[][][];
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
