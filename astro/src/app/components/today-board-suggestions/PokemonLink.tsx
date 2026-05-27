import type { TextualSuggestionEntry } from '../../lib/todayBoard';
import { slugify } from '../../../lib/slug';

interface PokemonLinkProps {
  pokemon: NonNullable<TextualSuggestionEntry['pokemon']> | NonNullable<TextualSuggestionEntry['ownedFallbackPokemon']>;
  baseUrl: string;
  mobile?: boolean;
}

export function PokemonLink({ pokemon, baseUrl, mobile = false }: PokemonLinkProps) {
  return (
    <a
      href={`${baseUrl}pokemon/${slugify(pokemon.name)}-${pokemon.formId ?? pokemon.id}/`}
      className={mobile
        ? 'inline-flex items-center text-base font-extrabold tracking-tight text-[var(--text-h)] no-underline hover:text-[var(--text)]'
        : 'font-semibold text-[var(--text-h)] underline decoration-slate-300 underline-offset-2 hover:text-[var(--text)]'}
    >
      {pokemon.name}
    </a>
  );
}
