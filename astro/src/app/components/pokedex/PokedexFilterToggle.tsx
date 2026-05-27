export type FilterMode = 'all' | 'caught' | 'missing' | 'shiny';

const FILTER_MODE_OPTIONS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'caught', label: 'Caught' },
  { value: 'missing', label: 'Missing' },
  { value: 'shiny', label: 'Shiny' },
];

interface PokedexFilterToggleProps {
  filterMode: FilterMode;
  onChange: (filterMode: FilterMode) => void;
}

export function PokedexFilterToggle({ filterMode, onChange }: PokedexFilterToggleProps) {
  return (
    <div className="inline-flex h-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] p-1">
      {FILTER_MODE_OPTIONS.map((option) => {
        const isSelected = filterMode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
            }}
            className={`rounded-md px-3 text-sm font-semibold transition ${
              isSelected
                ? 'bg-[var(--accent-bg)] text-[var(--text-h)] shadow-sm'
                : 'text-[var(--text)] hover:bg-[var(--accent-bg)]'
            }`}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
