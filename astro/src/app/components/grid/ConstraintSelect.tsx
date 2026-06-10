import type { ChangeEvent } from 'react';
import {
  FILTER_CATEGORIES,
  FILTER_KEY_TO_CONSTRAINT_CATEGORY,
  findConstraintOption,
  type Constraint,
} from '../../../../../lib/shared/filters';
import { trackEvent } from '../../../../../lib/browser/analytics';
import { getConstraintColor } from '../../lib/pokemonGrid';

interface ConstraintSelectProps {
  constraint: Constraint | null;
  index: number;
  isRow: boolean;
  onChange: (index: number, isRow: boolean, option: { value: string; category: string } | null) => void;
}

export function ConstraintSelect({ constraint, index, isRow, onChange }: ConstraintSelectProps) {
  const selectedValue = constraint ? `${constraint.category}:${constraint.value}` : '';

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const option = findConstraintOption(event.target.value);
    onChange(index, isRow, option);

    if (option) {
      trackEvent(isRow ? 'change_row_constraint' : 'change_col_constraint', {
        position: `${isRow ? 'row' : 'col'}_${index}`,
        category: option.category,
        value: option.value,
      });
    }
  }

  return (
    <select
      className={`w-full cursor-pointer rounded-md border-2 border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none md:text-xs ${isRow ? 'h-full' : ''}`}
      value={selectedValue}
      onChange={handleChange}
      style={{ borderColor: getConstraintColor(constraint) }}
    >
      <option value="">Select...</option>
      {FILTER_CATEGORIES.map((category) => (
        <optgroup key={category.key} label={category.label}>
          {category.options.map((option) => (
            <option
              key={`${category.key}-${option.name}`}
              value={`${FILTER_KEY_TO_CONSTRAINT_CATEGORY[category.key]}:${option.name}`}
            >
              {option.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
