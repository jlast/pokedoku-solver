import type { CSSProperties } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import type { Constraint } from '../../../../../lib/shared/filters';
import { trackEvent } from '../../../../../lib/browser/analytics';
import { getConstraintColor, getPokemonKey } from '../../lib/pokemonGrid';
import { EmptyGridCellContent } from './EmptyGridCellContent';
import { FilledPokemonCellContent } from './FilledPokemonCellContent';

interface GridCellProps {
  rowIndex: number;
  colIndex: number;
  cell: Pokemon | null;
  possible: Pokemon[];
  rowConstraint: Constraint | null;
  colConstraint: Constraint | null;
  fallbackOwned: Pokemon | null;
  isOwnedCell: boolean;
  isShinyCell: boolean;
  isSelected: boolean;
  showSuggestedMeta: boolean;
  suggestedPokemonKey?: string | null;
  swapOptionCount: number;
  onCellClick: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onSwapClick?: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
}

function getCellStateClasses({
  isSelected,
  isFilled,
  isOwnedCell,
  fallbackOwned,
}: {
  isSelected: boolean;
  isFilled: boolean;
  isOwnedCell: boolean;
  fallbackOwned: Pokemon | null;
}): string {
  if (isSelected) {
    return isFilled
      ? 'bg-[var(--accent-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]'
      : 'bg-[var(--code-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]';
  }
  if (isOwnedCell) return 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';
  if (fallbackOwned) return "bg-[var(--code-bg)] [html[data-theme='dark']_&]:bg-[var(--code-bg-dark)]";
  if (isFilled) return 'bg-[var(--bg)] hover:bg-[var(--accent-bg)]';
  return 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';
}

export function GridCell({
  rowIndex,
  colIndex,
  cell,
  possible,
  rowConstraint,
  colConstraint,
  fallbackOwned,
  isOwnedCell,
  isShinyCell,
  isSelected,
  showSuggestedMeta,
  suggestedPokemonKey,
  swapOptionCount,
  onCellClick,
  onSwapClick,
}: GridCellProps) {
  const hasConstraint = Boolean(rowConstraint || colConstraint);
  const isSuggested = Boolean(showSuggestedMeta && cell && suggestedPokemonKey === getPokemonKey(cell));
  const suggestedLabel = cell
    ? cell.dexDifficulty === 'Nightmare'
      ? 'Nightmare'
      : cell.id !== cell.formId
        ? 'Alt Form'
        : ''
    : '';
  const isFilled = Boolean(cell);
  const cellStateClasses = getCellStateClasses({ isSelected, isFilled, isOwnedCell, fallbackOwned });

  return (
    <div
      className={`relative flex h-[154px] w-[140px] cursor-pointer flex-col items-center justify-end overflow-hidden rounded border-2 border-transparent transition-all max-[768px]:h-[110px] max-[768px]:w-[90px] ${cellStateClasses}`}
      onClick={(event) => {
        trackEvent('click_cell', {
          position: `${rowIndex}_${colIndex}`,
          has_constraint: hasConstraint ? 'true' : 'false',
          has_pokemon: cell ? 'true' : 'false',
        });
        onCellClick(rowIndex, colIndex, event.currentTarget);
      }}
      style={{
        borderColor: hasConstraint ? getConstraintColor(rowConstraint || colConstraint) : undefined,
      } as CSSProperties}
    >
      {cell ? (
        <FilledPokemonCellContent
          cell={cell}
          isOwnedCell={isOwnedCell}
          isShinyCell={isShinyCell}
          isSuggested={isSuggested}
          suggestedLabel={suggestedLabel}
          showSuggestedMeta={showSuggestedMeta}
          swapOptionCount={swapOptionCount}
          rowIndex={rowIndex}
          colIndex={colIndex}
          onCellClick={onCellClick}
          onSwapClick={onSwapClick}
        />
      ) : (
        <EmptyGridCellContent possibleCount={possible.length} fallbackOwned={fallbackOwned} isSelected={isSelected} />
      )}
    </div>
  );
}
