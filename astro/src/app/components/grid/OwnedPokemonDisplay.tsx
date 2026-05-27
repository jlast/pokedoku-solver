import type { Pokemon } from '@pokedoku-helper/shared-types';

interface OwnedPokemonDisplayProps {
  pokemon: Pokemon;
  isShiny: boolean;
  opacityClass?: string;
}

export function OwnedPokemonDisplay({ pokemon, isShiny, opacityClass = 'opacity-35' }: OwnedPokemonDisplayProps) {
  return (
    <>
      <span className="absolute left-0 top-0 z-[2] inline-flex items-center gap-1 rounded-br-lg rounded-tl-sm border border-amber-300 bg-amber-200 px-[6px] py-px text-[8px] font-bold uppercase leading-[14px] text-amber-950 shadow-[0_1px_3px_rgba(15,23,42,0.14)] [html[data-theme='dark']_&]:border-amber-600 [html[data-theme='dark']_&]:bg-amber-900/20 [html[data-theme='dark']_&]:text-amber-100">
        <span aria-hidden="true" className="text-[9px] leading-none">✓</span>
        <span>{isShiny ? 'Shiny' : 'Owned'}</span>
      </span>
      {pokemon.sprite ? (
        <img
          src={pokemon.sprite}
          alt=""
          className={`absolute left-[22px] top-5 z-0 h-[95px] w-[95px] object-contain max-[768px]:left-2 max-[768px]:top-[14px] max-[768px]:h-[68px] max-[768px]:w-[68px] ${opacityClass}`}
        />
      ) : null}
      <div className="relative z-[1] m-1 inline-flex flex-col items-center gap-px rounded-md px-2 py-1 text-center">
        <span className="text-[9px] font-semibold leading-[1.05] text-[var(--text-h)]">{pokemon.name}</span>
      </div>
    </>
  );
}
