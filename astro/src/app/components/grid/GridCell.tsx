import type { CSSProperties } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import type { Constraint } from '../../../../../lib/shared/filters';
import { trackEvent } from '../../../../../lib/browser/analytics';
import { getConstraintColor, getPokemonKey } from '../../lib/pokemonGrid';
import { EmptyGridCellContent } from './EmptyGridCellContent';
import { FilledPokemonCellContent } from './FilledPokemonCellContent';
import { HiddenPokemonCellContent } from './HiddenPokemonCellContent';

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
  showOwnedState: boolean;
  highlightSwapCount: boolean;
  suggestedPokemonKey?: string | null;
  swapOptionCount: number;
  ownedSwapOptionCount: number;
  singularHintCountLabel?: string;
  pluralHintCountLabel?: string;
  spoilerModeEnabled?: boolean;
  revealState?: 'hidden' | 'hint' | 'revealed';
  onCellClick: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onSwapClick?: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onAdvanceReveal?: (row: number, col: number) => void;
}

function getCellStateClasses({
  isSelected,
  isFilled,
  isOwnedCell,
  fallbackOwned,
  isSpoilerHidden,
  showOwnedState,
}: {
  isSelected: boolean;
  isFilled: boolean;
  isOwnedCell: boolean;
  fallbackOwned: Pokemon | null;
  isSpoilerHidden: boolean;
  showOwnedState: boolean;
}): string {
  if (isSpoilerHidden) {
    return isSelected
      ? 'bg-[var(--code-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]'
      : 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';
  }
  if (isSelected) {
    return isFilled
      ? 'bg-[var(--accent-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]'
      : 'bg-[var(--code-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]';
  }
  if (showOwnedState && isOwnedCell) return 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';
  if (showOwnedState && fallbackOwned) return "bg-[var(--code-bg)] [html[data-theme='dark']_&]:bg-[var(--code-bg-dark)]";
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
  showOwnedState,
  highlightSwapCount,
  suggestedPokemonKey,
  swapOptionCount,
  ownedSwapOptionCount,
  singularHintCountLabel = 'valid answer',
  pluralHintCountLabel = 'valid answers',
  spoilerModeEnabled = false,
  revealState = 'revealed',
  onCellClick,
  onSwapClick,
  onAdvanceReveal,
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
  const displayPokemon = cell ?? fallbackOwned;
  const isSpoilerHidden = spoilerModeEnabled && revealState !== 'revealed' && Boolean(displayPokemon);
  const cellStateClasses = getCellStateClasses({ isSelected, isFilled, isOwnedCell, fallbackOwned, isSpoilerHidden, showOwnedState });

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
      {isSpoilerHidden ? (
        <HiddenPokemonCellContent
          revealState={revealState === 'revealed' ? 'hint' : revealState}
          displayPokemon={displayPokemon}
          validAnswerCount={swapOptionCount}
          singularCountLabel={singularHintCountLabel}
          pluralCountLabel={pluralHintCountLabel}
          rowConstraint={rowConstraint}
          colConstraint={colConstraint}
          onAdvanceReveal={() => onAdvanceReveal?.(rowIndex, colIndex)}
        />
      ) : cell ? (
        <FilledPokemonCellContent
          cell={cell}
          isOwnedCell={isOwnedCell}
          isShinyCell={isShinyCell}
          showOwnedState={showOwnedState}
          isSuggested={isSuggested}
          suggestedLabel={suggestedLabel}
          showSuggestedMeta={showSuggestedMeta}
          swapOptionCount={swapOptionCount}
          ownedSwapOptionCount={ownedSwapOptionCount}
          highlightSwapCount={highlightSwapCount}
          rowIndex={rowIndex}
          colIndex={colIndex}
          onCellClick={onCellClick}
          onSwapClick={onSwapClick}
        />
      ) : (
        <EmptyGridCellContent
          possibleCount={possible.length}
          fallbackOwned={fallbackOwned}
          isSelected={isSelected}
          showOwnedState={showOwnedState}
          swapOptionCount={ownedSwapOptionCount}
          rowIndex={rowIndex}
          colIndex={colIndex}
          onCellClick={onCellClick}
          onSwapClick={onSwapClick}
        />
      )}
    </div>
  );
}
