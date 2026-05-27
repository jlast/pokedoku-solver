import type { TextualSuggestionEntry } from '../lib/todayBoard';
import { ConstraintPair } from './today-board-suggestions/ConstraintPair';
import { DifficultyBadge } from './today-board-suggestions/DifficultyBadge';
import { OwnedBadge } from './today-board-suggestions/OwnedBadge';
import { PokemonLink } from './today-board-suggestions/PokemonLink';
import { PokemonTypeBadges } from './today-board-suggestions/PokemonTypeBadges';
import { SectionCard } from './shared/SectionCard';

export function TodayBoardSuggestions({ textualSuggestions }: { textualSuggestions: TextualSuggestionEntry[] }) {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <section className="mt-6 w-full md:w-auto" aria-labelledby="today-text-suggestions-heading">
      <SectionCard
        className="mt-2 w-full"
        title={(
          <h2 id="today-text-suggestions-heading" className="text-xl font-semibold tracking-tight text-[var(--text-h)]">
            <span className="hidden md:inline">Today&apos;s Recommended Pokedoku Answers</span>
            <span className="md:hidden">Recommended Answers</span>
          </h2>
        )}
        subtitle="9 optimized picks for today's board"
      >
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm text-[var(--text)]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-h)]">
                <th className="px-2 py-3 pr-6 font-semibold">Category</th>
                <th className="px-2 py-3 pr-6 font-semibold">Pokemon</th>
                <th className="px-2 py-3 font-semibold">Types &amp; Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {textualSuggestions.map((entry) => (
                <tr key={entry.key} className="border-b border-[var(--border)] align-top">
                  <td className="px-2 py-3 pr-6">
                    <ConstraintPair entry={entry} baseUrl={baseUrl} />
                  </td>
                  <td className="px-2 py-3">
                    {entry.pokemon ? (
                      <PokemonLink pokemon={entry.pokemon} baseUrl={baseUrl} />
                    ) : entry.ownedFallbackPokemon ? (
                      <div className="flex flex-col items-start gap-1">
                        <PokemonLink pokemon={entry.ownedFallbackPokemon} baseUrl={baseUrl} />
                        <OwnedBadge />
                      </div>
                    ) : (
                      <span>No suggestion available</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {entry.pokemon ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.pokemon.dexDifficulty ? <DifficultyBadge difficulty={entry.pokemon.dexDifficulty} /> : null}
                        <PokemonTypeBadges types={entry.pokemon.types} entryKey={entry.key} baseUrl={baseUrl} />
                      </div>
                    ) : entry.ownedFallbackPokemon ? (
                      <div className="flex flex-wrap items-center gap-2 opacity-80">
                        {entry.ownedFallbackPokemon.dexDifficulty ? <DifficultyBadge difficulty={entry.ownedFallbackPokemon.dexDifficulty} /> : null}
                        <PokemonTypeBadges types={entry.ownedFallbackPokemon.types} entryKey={entry.key} baseUrl={baseUrl} owned />
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 w-full divide-y divide-slate-200 rounded-xl border border-[var(--border)] md:hidden">
          {textualSuggestions.map((entry) => (
            <article key={`mobile-${entry.key}`} className="w-full bg-[var(--bg)] p-2.5">
              <div className="text-sm">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] ring-1 ring-slate-200">
                    {entry.pokemon?.sprite ? (
                      <img src={entry.pokemon.sprite} alt="" className="h-7 w-7" loading="lazy" decoding="async" />
                    ) : entry.ownedFallbackPokemon?.sprite ? (
                      <img src={entry.ownedFallbackPokemon.sprite} alt="" className="h-7 w-7 opacity-50" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-[10px] font-semibold text-[var(--text)]">?</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      {entry.pokemon ? (
                        <PokemonLink pokemon={entry.pokemon} baseUrl={baseUrl} mobile />
                      ) : entry.ownedFallbackPokemon ? (
                        <div className="flex flex-col items-start gap-1">
                          <PokemonLink pokemon={entry.ownedFallbackPokemon} baseUrl={baseUrl} mobile />
                          <OwnedBadge />
                        </div>
                      ) : (
                        <span className="text-[var(--text)]">No suggestion available</span>
                      )}
                      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-right">
                        <ConstraintPair entry={entry} baseUrl={baseUrl} mobile />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
