import { slugify } from '../../../lib/slug';
import { CategoryBadgeLink } from '../shared/CategoryBadgeLink';
import { parseCategoryId } from '../puzzle-stats/categoryUtils';

interface PokemonTypeBadgesProps {
  types: string[];
  entryKey: string;
  baseUrl: string;
  owned?: boolean;
}

export function PokemonTypeBadges({ types, entryKey, baseUrl, owned = false }: PokemonTypeBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {types.map((type, index) => (
        <CategoryBadgeLink
          key={`${entryKey}-${owned ? 'owned-' : ''}${type}-${index}`}
          parsed={parseCategoryId(`types:${type}`)}
          href={`${baseUrl}tools/category/${slugify(type)}/`}
        />
      ))}
    </div>
  );
}
