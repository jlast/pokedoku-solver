import type { Pokemon } from '@pokedoku-helper/shared-types';
import type { Constraint } from '../../../../lib/shared/filters';
import { ConstraintDisplay } from './grid/ConstraintDisplay';
import { ConstraintSelect } from './grid/ConstraintSelect';
import { GridCell } from './grid/GridCell';
import { getPokemonKeyId } from '../lib/pokemonGrid';

interface GridProps {
  cells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  possiblePokemon: Pokemon[][][];
  fallbackOwnedCells?: (Pokemon | null)[][];
  ownedPokemonKeyIds?: Set<number>;
  shinyPokemonKeyIds?: Set<number>;
  suggestedPokemonKeys?: (string | null)[][];
  swapOptionCounts?: number[][];
  selectedCell: [number, number] | null;
  editable?: boolean;
  showSuggestedMeta?: boolean;
  onCellClick: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onSwapClick?: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onConstraintChange: (index: number, isRow: boolean, option: { value: string; category: string } | null) => void;
}

export function Grid({
  cells,
  rowConstraints,
  colConstraints,
  possiblePokemon,
  fallbackOwnedCells,
  ownedPokemonKeyIds,
  shinyPokemonKeyIds,
  suggestedPokemonKeys,
  swapOptionCounts,
  selectedCell,
  editable = true,
  showSuggestedMeta = false,
  onCellClick,
  onSwapClick,
  onConstraintChange,
}: GridProps) {
  function isUsedElsewhere(pokemon: Pokemon, rowIndex: number, colIndex: number): boolean {
    const keyId = getPokemonKeyId(pokemon);
    return cells.some((row, currentRowIndex) =>
      row.some(
        (currentCell, currentColIndex) =>
          currentCell &&
          (currentRowIndex !== rowIndex || currentColIndex !== colIndex) &&
          getPokemonKeyId(currentCell) === keyId,
      ),
    );
  }

  return (
    <div className="mb-3 flex flex-col items-center">
      <div className="mb-1 flex gap-1">
        <div className="flex w-[140px] flex-col items-center justify-center max-[768px]:w-[70px]" />
        {colConstraints.map((constraint, colIndex) => (
          <div key={colIndex} className="flex w-[143px] items-stretch max-[768px]:w-[90px]">
            {editable ? (
              <ConstraintSelect constraint={constraint} index={colIndex} isRow={false} onChange={onConstraintChange} />
            ) : (
              <ConstraintDisplay constraint={constraint} />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-1">
          {rowConstraints.map((constraint, rowIndex) => (
            <div key={rowIndex} className="flex h-[157px] w-[140px] items-stretch max-[768px]:h-[112px] max-[768px]:w-[70px]">
              {editable ? (
                <ConstraintSelect constraint={constraint} index={rowIndex} isRow={true} onChange={onConstraintChange} />
              ) : (
                <ConstraintDisplay constraint={constraint} isRow />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 rounded border-[3px] border-[var(--border)] bg-[var(--border)] [html[data-theme='dark']_&]:border-slate-500 [html[data-theme='dark']_&]:bg-slate-800">
          {cells.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;
                const possible = possiblePokemon[rowIndex][colIndex];
                const fallbackCandidate = fallbackOwnedCells?.[rowIndex]?.[colIndex] ?? null;
                const fallbackOwned = fallbackCandidate && !isUsedElsewhere(fallbackCandidate, rowIndex, colIndex)
                  ? fallbackCandidate
                  : null;
                const isOwnedCell = cell
                  ? (ownedPokemonKeyIds?.has(getPokemonKeyId(cell)) ?? false) && !isUsedElsewhere(cell, rowIndex, colIndex)
                  : false;
                const isShinyCell = cell ? shinyPokemonKeyIds?.has(getPokemonKeyId(cell)) ?? false : false;
                const swapOptionCount = swapOptionCounts?.[rowIndex]?.[colIndex] ?? possible.length;

                return (
                  <GridCell
                    key={colIndex}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    cell={cell}
                    possible={possible}
                    rowConstraint={rowConstraints[rowIndex]}
                    colConstraint={colConstraints[colIndex]}
                    fallbackOwned={fallbackOwned}
                    isOwnedCell={isOwnedCell}
                    isShinyCell={isShinyCell}
                    isSelected={isSelected}
                    showSuggestedMeta={showSuggestedMeta}
                    suggestedPokemonKey={suggestedPokemonKeys?.[rowIndex]?.[colIndex]}
                    swapOptionCount={swapOptionCount}
                    onCellClick={onCellClick}
                    onSwapClick={onSwapClick}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
