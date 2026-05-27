import type { Constraint } from '../../../../../lib/shared/filters';
import { CategoryBadgeLink } from '../shared/CategoryBadgeLink';
import { constraintToParsedCategory, getConstraintColor } from '../../lib/pokemonGrid';

interface ConstraintDisplayProps {
  constraint: Constraint | null;
  isRow?: boolean;
}

export function ConstraintDisplay({ constraint, isRow = false }: ConstraintDisplayProps) {
  const parsed = constraintToParsedCategory(constraint);

  return (
    <div
      className={`flex w-full items-center justify-center rounded-md bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] font-medium text-[var(--text-h)] md:text-xs ${isRow ? 'h-full' : ''}`}
      style={{ borderColor: getConstraintColor(constraint) }}
    >
      {parsed ? <CategoryBadgeLink parsed={parsed} href={null} stacked /> : <span>{constraint?.value || '-'}</span>}
    </div>
  );
}
