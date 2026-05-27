import type { Pokemon } from '@pokedoku-helper/shared-types';
import { OwnedPokemonDisplay } from './OwnedPokemonDisplay';

interface EmptyGridCellContentProps {
  possibleCount: number;
  fallbackOwned: Pokemon | null;
  isSelected: boolean;
}

export function EmptyGridCellContent({ possibleCount, fallbackOwned, isSelected }: EmptyGridCellContentProps) {
  if (fallbackOwned) {
    return <OwnedPokemonDisplay pokemon={fallbackOwned} isShiny={false} />;
  }

  if (possibleCount === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
        <span className={`text-[18px] font-bold max-[768px]:text-[14px] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>No options yet</span>
        <span className={`text-[0.58rem] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>Tap to check other squares</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-0.5">
      <span className="text-[26px] font-bold text-[var(--text-h)] max-[768px]:text-[20px]">{possibleCount}</span>
      <span className={`text-[0.6rem] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'} opacity-80`}>Tap to explore</span>
    </div>
  );
}
