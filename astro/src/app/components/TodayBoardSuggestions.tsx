import type { TextualSuggestionEntry } from '../lib/todayBoard';
import { ConstraintPair } from './today-board-suggestions/ConstraintPair';
import { DifficultyBadge } from './today-board-suggestions/DifficultyBadge';
import { OwnedBadge } from './today-board-suggestions/OwnedBadge';
import { PokemonLink } from './today-board-suggestions/PokemonLink';
import { PokemonTypeBadges } from './today-board-suggestions/PokemonTypeBadges';
import { SectionCard } from './shared/SectionCard';
import { CategoryBadgeLink } from './shared/CategoryBadgeLink';
import { buildSpoilerHintBadges } from '../lib/spoilerHints';

interface TodayBoardSuggestionsProps {
  textualSuggestions: TextualSuggestionEntry[];
  spoilerModeEnabled: boolean;
  revealStates: Record<string, 'hidden' | 'hint' | 'revealed'>;
  onAdvanceReveal: (row: number, col: number) => void;
}

function getEntryCellPosition(key: string): [number, number] {
  const [row, col] = key.split('-').map(Number);
  return [row, col];
}

export function TodayBoardSuggestions({
  textualSuggestions,
  spoilerModeEnabled,
  revealStates,
  onAdvanceReveal,
}: TodayBoardSuggestionsProps) {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <section className="mt-6 w-full md:w-auto" aria-labelledby="today-text-suggestions-heading">
      <SectionCard
        className="mt-2 w-full"
        titleId="today-text-suggestions-heading"
        title={(
          <>
            <span className="hidden md:inline">Today&apos;s Recommended Pokedoku Answers</span>
            <span className="md:hidden">Recommended Answers</span>
          </>
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
                    {!spoilerModeEnabled || (revealStates[entry.key] ?? 'revealed') === 'revealed' ? entry.pokemon ? (
                      <PokemonLink pokemon={entry.pokemon} baseUrl={baseUrl} />
                    ) : entry.ownedFallbackPokemon ? (
                      <div className="flex flex-col items-start gap-1">
                        <PokemonLink pokemon={entry.ownedFallbackPokemon} baseUrl={baseUrl} />
                        <OwnedBadge />
                      </div>
                    ) : (
                      <span>No suggestion available</span>
                    ) : (
                      (() => {
                        const [row, col] = getEntryCellPosition(entry.key);
                        const revealState = revealStates[entry.key] ?? 'hidden';
                        const displayPokemon = entry.pokemon ?? entry.ownedFallbackPokemon;
                        const hintBadges = buildSpoilerHintBadges({
                          pokemon: displayPokemon,
                          rowConstraint: entry.rowConstraint,
                          colConstraint: entry.colConstraint,
                        });

                        return (
                          <div className="flex flex-col items-start gap-1.5">
                            {revealState === 'hint' ? (
                              <>
                                {hintBadges.length > 0 ? (
                                  <div className="flex max-w-full flex-nowrap items-center gap-0.5 overflow-hidden">
                                    {hintBadges.map((badge) => (
                                      <CategoryBadgeLink key={badge.raw} parsed={badge} href={null} compact />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-[var(--text-h)]">No extra hint available</span>
                                )}
                              </>
                            ) : (
                              <span className="font-semibold text-[var(--text-h)]">Hidden answer</span>
                            )}
                            <button
                              type="button"
                              className="inline-flex cursor-pointer items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-h)]"
                              onClick={() => onAdvanceReveal(row, col)}
                            >
                              {revealState === 'hint' ? 'Reveal' : 'Show hint'}
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {!spoilerModeEnabled || (revealStates[entry.key] ?? 'revealed') === 'revealed' ? entry.pokemon ? (
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
                    ) : (
                      <span className="text-xs text-[var(--text)]">Reveal to view types and difficulty</span>
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
                    {!spoilerModeEnabled || (revealStates[entry.key] ?? 'revealed') === 'revealed' ? entry.pokemon?.sprite ? (
                      <img src={entry.pokemon.sprite} alt="" className="h-7 w-7" loading="lazy" decoding="async" />
                    ) : entry.ownedFallbackPokemon?.sprite ? (
                      <img src={entry.ownedFallbackPokemon.sprite} alt="" className="h-7 w-7 opacity-50" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-[10px] font-semibold text-[var(--text)]">?</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[var(--text)]">?</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      {!spoilerModeEnabled || (revealStates[entry.key] ?? 'revealed') === 'revealed' ? entry.pokemon ? (
                        <PokemonLink pokemon={entry.pokemon} baseUrl={baseUrl} mobile />
                      ) : entry.ownedFallbackPokemon ? (
                        <div className="flex flex-col items-start gap-1">
                          <PokemonLink pokemon={entry.ownedFallbackPokemon} baseUrl={baseUrl} mobile />
                          <OwnedBadge />
                        </div>
                      ) : (
                        <span className="text-[var(--text)]">No suggestion available</span>
                      ) : (
                        (() => {
                          const [row, col] = getEntryCellPosition(entry.key);
                          const revealState = revealStates[entry.key] ?? 'hidden';
                          const displayPokemon = entry.pokemon ?? entry.ownedFallbackPokemon;
                          const hintBadges = buildSpoilerHintBadges({
                            pokemon: displayPokemon,
                            rowConstraint: entry.rowConstraint,
                            colConstraint: entry.colConstraint,
                          });

                          return (
                            <div className="flex flex-col items-start gap-1">
                              {revealState === 'hint' ? (
                                hintBadges.length > 0 ? (
                                  <div className="flex max-w-full flex-nowrap items-center gap-0.5 overflow-hidden">
                                    {hintBadges.map((badge) => (
                                      <CategoryBadgeLink key={badge.raw} parsed={badge} href={null} compact />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--text)]">No extra hint available</span>
                                )
                              ) : (
                                <span className="text-base font-extrabold tracking-tight text-[var(--text-h)]">Hidden answer</span>
                              )}
                              <button
                                type="button"
                                className="inline-flex cursor-pointer items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-h)]"
                                onClick={() => onAdvanceReveal(row, col)}
                              >
                                {revealState === 'hint' ? 'Reveal' : 'Show hint'}
                              </button>
                            </div>
                          );
                        })()
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
