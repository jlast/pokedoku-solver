import { DEX_DIFFICULTY_COLORS } from '../../../../../lib/shared/constants';

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold text-white shadow-sm"
      style={{
        backgroundColor: DEX_DIFFICULTY_COLORS[difficulty],
        border: '1px solid rgba(255,255,255,0.3)',
      }}
    >
      {difficulty}
    </span>
  );
}
