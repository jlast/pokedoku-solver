import type { Pokemon } from '@pokedoku-helper/shared-types';
import type { Constraint } from '../../../../../lib/shared/filters';
import { buildSpoilerHintBadges } from '../../lib/spoilerHints';
import { CategoryBadgeLink } from '../shared/CategoryBadgeLink';

interface HiddenPokemonCellContentProps {
  revealState: 'hidden' | 'hint';
  displayPokemon: Pokemon | null;
  validAnswerCount: number;
  singularCountLabel: string;
  pluralCountLabel: string;
  rowConstraint: Constraint | null;
  colConstraint: Constraint | null;
  onAdvanceReveal: () => void;
}

export function HiddenPokemonCellContent({
  revealState,
  displayPokemon,
  validAnswerCount,
  singularCountLabel,
  pluralCountLabel,
  rowConstraint,
  colConstraint,
  onAdvanceReveal,
}: HiddenPokemonCellContentProps) {
  const hintBadges = buildSpoilerHintBadges({
    pokemon: displayPokemon,
    rowConstraint,
    colConstraint,
  });

  return (
    <>
      <div 
        onClick={(event) => {
            event.stopPropagation();
            onAdvanceReveal();
          }}
        className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center"
      >
        {revealState === 'hint' ? (
          <>
            {hintBadges.length > 0 ? (
              <div className="flex flex-col max-w-full items-center justify-center gap-0.5 overflow-hidden">
                {hintBadges.map((badge) => (
                  <span className="text-[0.7rem]">
                    {badge.label}
                  </span>
                ))}
               <span className="text-[0.4rem] text-[var(--text)] max-[768px]:text-[0.55rem]">
                {validAnswerCount === 1 ? `1 ${singularCountLabel}` : `${validAnswerCount} ${pluralCountLabel}`}
               </span>
              </div>
            ) : (
              <span className="text-[0.82rem] font-semibold leading-tight text-[var(--text-h)] max-[768px]:text-[0.64rem]">
                No extra hint available
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-[28px] font-bold leading-none text-[var(--text-h)] max-[768px]:text-[22px]">?</span>
            <span className="text-[0.58rem] leading-1 text-[var(--text)] max-[768px]:text-[0.53rem]">Hidden answer</span>
          </>
        )}
        <button
          type="button"
          className="mt-0.5 inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-[0.65rem] font-semibold text-[var(--text-h)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-bg)_65%,var(--bg))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1 max-[768px]:px-2.5"
          onClick={(event) => {
            event.stopPropagation();
            onAdvanceReveal();
          }}
        >
          {revealState === 'hint' ? 'Reveal' : 'Hint'}
        </button>
      </div>
    </>
  );
}
