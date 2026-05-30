import type { Pokemon } from '@pokedoku-helper/shared-types';
import { OwnedPokemonDisplay } from './OwnedPokemonDisplay';

interface FilledPokemonCellContentProps {
  cell: Pokemon;
  isOwnedCell: boolean;
  isShinyCell: boolean;
  showOwnedState: boolean;
  isSuggested: boolean;
  suggestedLabel: string;
  showSuggestedMeta: boolean;
  swapOptionCount: number;
  ownedSwapOptionCount: number;
  highlightSwapCount: boolean;
  rowIndex: number;
  colIndex: number;
  onCellClick: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
  onSwapClick?: (row: number, col: number, anchorElement?: HTMLDivElement | null) => void;
}

export function FilledPokemonCellContent({
  cell,
  isOwnedCell,
  isShinyCell,
  showOwnedState,
  isSuggested,
  suggestedLabel,
  showSuggestedMeta,
  swapOptionCount,
  ownedSwapOptionCount,
  highlightSwapCount,
  rowIndex,
  colIndex,
  onCellClick,
  onSwapClick,
}: FilledPokemonCellContentProps) {
  if (showOwnedState && isOwnedCell) {
    return (
        <OwnedPokemonDisplay
        pokemon={cell}
        isShiny={isShinyCell}
        swapOptionCount={showSuggestedMeta ? ownedSwapOptionCount : undefined}
        highlightSwapCount={highlightSwapCount}
        onSwapClick={showSuggestedMeta ? (anchorElement) => (onSwapClick ?? onCellClick)(rowIndex, colIndex, anchorElement) : undefined}
      />
    );
  }

  return (
    <>
      {showSuggestedMeta ? (
        <>
          {isSuggested && suggestedLabel ? (
            <span
              className={`absolute left-0 top-0 z-[2] rounded-br-lg rounded-tl-sm px-[5px] py-px text-[7px] font-bold uppercase leading-[14px] tracking-[0.02em] text-white ${cell.dexDifficulty === 'Nightmare' ? 'bg-[#9b59b6]' : 'bg-[#2574f5]'}`}
            >
              {suggestedLabel}
            </span>
          ) : null}
          <button
            type="button"
            className="absolute right-0.5 top-0.5 z-[2] inline-flex h-12 w-[42px] cursor-pointer flex-col items-center justify-center gap-px rounded-[14px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1 max-[768px]:right-[3px] max-[768px]:top-[14px] max-[768px]:h-[34px] max-[768px]:w-[30px] max-[768px]:rounded-xl"
            aria-label={`Swap ${cell.name} (${swapOptionCount} options)`}
            onClick={(event) => {
              event.stopPropagation();
              const anchorElement = event.currentTarget.parentElement as HTMLDivElement | null;
              (onSwapClick ?? onCellClick)(rowIndex, colIndex, anchorElement);
            }}
          >
            <span className="text-[18px] leading-none max-[768px]:text-[13px]">⇄</span>
            <span className={`text-sm font-bold leading-none max-[768px]:text-[11px] ${highlightSwapCount ? "text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400" : ''}`}>{swapOptionCount}</span>
          </button>
        </>
      ) : null}
      {cell.sprite ? (
        <img
          src={cell.sprite}
          alt=""
          className="absolute left-[22px] top-5 z-0 h-[95px] w-[95px] object-contain max-[768px]:left-2 max-[768px]:top-[14px] max-[768px]:h-[68px] max-[768px]:w-[68px]"
        />
      ) : null}
      <div className={`relative z-[1] m-1 inline-flex flex-col items-center gap-px rounded-md px-2 py-1 text-center ${isSuggested ? 'm-0.5 px-1.5 py-[3px]' : ''}`}>
        <span className="text-[9px] font-semibold leading-[1.05] text-[var(--text-h)]">{cell.name}</span>
      </div>
    </>
  );
}
