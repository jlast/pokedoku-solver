import type { Pokemon } from '@pokedoku-helper/shared-types';

interface OwnedPokemonDisplayProps {
  pokemon: Pokemon;
  isShiny: boolean;
  opacityClass?: string;
  hideIdentity?: boolean;
  swapOptionCount?: number;
  onSwapClick?: (anchorElement?: HTMLDivElement | null) => void;
  highlightSwapCount?: boolean;
}

export function OwnedPokemonDisplay({
  pokemon,
  isShiny,
  opacityClass = 'opacity-35',
  hideIdentity = false,
  swapOptionCount,
  onSwapClick,
  highlightSwapCount = false,
}: OwnedPokemonDisplayProps) {
  return (
    <>
      <span className="absolute left-0 top-0 z-[2] inline-flex items-center gap-1 rounded-br-lg rounded-tl-sm border border-amber-300 bg-amber-200 px-[6px] py-px text-[8px] font-bold uppercase leading-[14px] text-amber-950 shadow-[0_1px_3px_rgba(15,23,42,0.14)] [html[data-theme='dark']_&]:border-amber-600 [html[data-theme='dark']_&]:bg-amber-900/20 [html[data-theme='dark']_&]:text-amber-100">
        <span aria-hidden="true" className="text-[9px] leading-none">✓</span>
        <span>{isShiny ? 'Shiny' : 'Owned'}</span>
      </span>
      {typeof swapOptionCount === 'number' && onSwapClick ? (
        <button
          type="button"
          className="absolute right-0.5 top-0.5 z-[2] inline-flex h-12 w-[42px] cursor-pointer flex-col items-center justify-center gap-px rounded-[14px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1 max-[768px]:right-[3px] max-[768px]:top-[14px] max-[768px]:h-[34px] max-[768px]:w-[30px] max-[768px]:rounded-xl"
          aria-label={`Swap ${pokemon.name} (${swapOptionCount} options)`}
          onClick={(event) => {
            event.stopPropagation();
            onSwapClick(event.currentTarget.parentElement as HTMLDivElement | null);
          }}
        >
          <span className="text-[18px] leading-none max-[768px]:text-[13px]">⇄</span>
          <span className={`text-sm font-bold leading-none max-[768px]:text-[11px] ${highlightSwapCount ? "text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400" : ''}`}>{swapOptionCount}</span>
        </button>
      ) : null}
      {!hideIdentity && pokemon.sprite ? (
        <img
          src={pokemon.sprite}
          alt=""
          className={`absolute left-[22px] top-5 z-0 h-[95px] w-[95px] object-contain max-[768px]:left-2 max-[768px]:top-[14px] max-[768px]:h-[68px] max-[768px]:w-[68px] ${opacityClass}`}
        />
      ) : null}
      {!hideIdentity ? (
        <div className="relative z-[1] m-1 inline-flex flex-col items-center gap-px rounded-md px-2 py-1 text-center">
          <span className="text-[9px] font-semibold leading-[1.05] text-[var(--text-h)]">{pokemon.name}</span>
        </div>
      ) : null}
    </>
  );
}
