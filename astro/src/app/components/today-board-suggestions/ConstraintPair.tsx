import type { TextualSuggestionEntry } from '../../lib/todayBoard';
import { constraintToParsedCategory } from '../../lib/pokemonGrid';
import { slugify } from '../../../lib/slug';
import { CategoryBadgeLink } from '../shared/CategoryBadgeLink';

interface ConstraintPairProps {
  entry: TextualSuggestionEntry;
  baseUrl: string;
  mobile?: boolean;
}

export function ConstraintPair({ entry, baseUrl, mobile = false }: ConstraintPairProps) {
  const rowParsed = constraintToParsedCategory(entry.rowConstraint);
  const colParsed = constraintToParsedCategory(entry.colConstraint);

  if (!rowParsed && !colParsed) return <span>Any + Any</span>;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${mobile ? 'justify-end text-right' : ''}`}>
      {rowParsed ? (
        mobile ? (
          <span className="inline-flex max-w-full scale-90 origin-right">
            <CategoryBadgeLink parsed={rowParsed} href={`${baseUrl}tools/category/${slugify(rowParsed.label)}/`} />
          </span>
        ) : (
          <CategoryBadgeLink parsed={rowParsed} href={`${baseUrl}tools/category/${slugify(rowParsed.label)}/`} />
        )
      ) : (
        <span>Any</span>
      )}
      <span className="text-[var(--text)]">+</span>
      {colParsed ? (
        mobile ? (
          <span className="inline-flex max-w-full scale-90 origin-right">
            <CategoryBadgeLink parsed={colParsed} href={`${baseUrl}tools/category/${slugify(colParsed.label)}/`} />
          </span>
        ) : (
          <CategoryBadgeLink parsed={colParsed} href={`${baseUrl}tools/category/${slugify(colParsed.label)}/`} />
        )
      ) : (
        <span>Any</span>
      )}
    </div>
  );
}
