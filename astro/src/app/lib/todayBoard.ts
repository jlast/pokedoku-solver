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

  const rowUsed = Array.from({ length: gridSize }, () => new Set<number>());
  const colUsed = Array.from({ length: gridSize }, () => new Set<number>());
  const suggestedCells = createEmptyPokemonGrid(gridSize);

  const cellOrder = Array.from({ length: gridSize * gridSize }, (_, index) => ({
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  })).sort((a, b) => candidatesByCell[a.row][a.col].length - candidatesByCell[b.row][b.col].length);

  for (const { row, col } of cellOrder) {
    const candidates = candidatesByCell[row][col];
    if (candidates.length === 0) continue;

    const uniqueCandidate = candidates.find(
      (candidate) => !rowUsed[row].has(candidate.id) && !colUsed[col].has(candidate.id),
    );
    const pick = uniqueCandidate ?? candidates[0];
    suggestedCells[row][col] = pick;
    rowUsed[row].add(pick.id);
    colUsed[col].add(pick.id);
  }

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
  const reservedKeyIds = new Set(selectedKeyIds);
  const emptyCells = Array.from({ length: gridSize * gridSize }, (_, index) => ({
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  })).filter(({ row, col }) => possiblePokemon[row][col].length === 0);

  emptyCells.sort((a, b) => {
    const aCount = pokemon.filter((entry) => {
      if (!matchesConstraint(entry, rowConstraints[a.row])) return false;
      if (!matchesConstraint(entry, colConstraints[a.col])) return false;
      const keyId = getPokemonKeyId(entry);
      return caughtSet.has(keyId) && !shinyPokemonKeyIds.has(keyId);
    }).length;
    const bCount = pokemon.filter((entry) => {
      if (!matchesConstraint(entry, rowConstraints[b.row])) return false;
      if (!matchesConstraint(entry, colConstraints[b.col])) return false;
      const keyId = getPokemonKeyId(entry);
      return caughtSet.has(keyId) && !shinyPokemonKeyIds.has(keyId);
    }).length;
    return aCount - bCount;
  });

  for (const { row, col } of emptyCells) {
    const fallbackCandidates = pokemon
      .filter((entry) => {
        if (!matchesConstraint(entry, rowConstraints[row])) return false;
        if (!matchesConstraint(entry, colConstraints[col])) return false;

        const keyId = getPokemonKeyId(entry);
        return caughtSet.has(keyId) && !shinyPokemonKeyIds.has(keyId);
      })
      .sort(compareByHardest);

    const uniqueCandidate = fallbackCandidates.find((entry) => !reservedKeyIds.has(getPokemonKeyId(entry)));
    const pick = uniqueCandidate ?? fallbackCandidates[0] ?? null;
    result[row][col] = pick;
    if (pick) reservedKeyIds.add(getPokemonKeyId(pick));
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
