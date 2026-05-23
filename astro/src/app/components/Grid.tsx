import type { Pokemon } from '@pokedoku-helper/shared-types';
import { TYPE_COLORS, CATEGORY_COLORS } from '../../../../lib/shared/constants';
import {
  FILTER_CATEGORIES,
  FILTER_KEY_TO_CONSTRAINT_CATEGORY,
  findConstraintOption,
  type Constraint,
} from '../../../../lib/shared/filters';
import { trackEvent } from '../../../../lib/browser/analytics';
import { CategoryBadgeLink } from './shared/CategoryBadgeLink';
import type { ParsedCategory } from './puzzle-stats/categoryUtils';

interface GridProps {
  cells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  possiblePokemon: Pokemon[][][];
  suggestedPokemonKeys?: (string | null)[][];
  swapOptionCounts?: number[][];
  selectedCell: [number, number] | null;
  editable?: boolean;
  showSuggestedMeta?: boolean;
  onCellClick: (row: number, col: number) => void;
  onSwapClick?: (row: number, col: number) => void;
  onConstraintChange: (index: number, isRow: boolean, option: { value: string; category: string } | null) => void;
}

function getConstraintColor(constraint: Constraint | null): string | undefined {
  if (!constraint) return undefined;
  if (TYPE_COLORS[constraint.value]) return TYPE_COLORS[constraint.value];
  if (constraint.category === 'typeline') return '#3498db';
  if (constraint.value.includes('Stage') || constraint.value.includes('Evolution')) return '#F08030';
  if (constraint.category === 'region') {
    const regionColors: Record<string, string> = {
      Kanto: '#E3350D', Johto: '#CC9933', Hoenn: '#33CC33', Sinnoh: '#3366CC',
      Unova: '#333366', Kalos: '#0099FF', Alola: '#FF6699', Galar: '#7C7C7C',
      Hisui: '#6699CC', Paldea: '#E6A800', Unknown: '#808080',
    };
    return regionColors[constraint.value];
  }
  if (constraint.category === 'category') return CATEGORY_COLORS[constraint.value];
  return undefined;
}

function getConstraintParsedCategory(constraint: Constraint | null): ParsedCategory | null {
  if (!constraint) return null;

  const typeMap: Record<string, string> = {
    type: 'types',
    types: 'types',
    typeline: 'types',
    move: 'move',
    moves: 'move',
    region: 'regions',
    regions: 'regions',
    evolution: 'evolution',
    category: 'category',
  };

  const mappedType = typeMap[constraint.category];
  if (!mappedType) return null;

  return {
    raw: `${mappedType}:${constraint.value}`,
    type: mappedType,
    label: constraint.value,
  };
}

function ConstraintSelect({ constraint, index, isRow, onChange }: { constraint: Constraint | null; index: number; isRow: boolean; onChange: GridProps['onConstraintChange'] }) {
  const selectedValue = constraint ? `${constraint.category}:${constraint.value}` : '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = findConstraintOption(e.target.value);
    onChange(index, isRow, option);
    if (option) {
      trackEvent(isRow ? 'change_row_constraint' : 'change_col_constraint', {
        position: `${isRow ? 'row' : 'col'}_${index}`,
        category: option.category,
        value: option.value,
      });
    }
  };

  return (
    <select
      className={`w-full cursor-pointer rounded-md border-2 border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none md:text-xs ${isRow ? 'h-full' : ''}`}
      value={selectedValue}
      onChange={handleChange}
      style={{ borderColor: getConstraintColor(constraint) }}
    >
      <option value="">…</option>
      {FILTER_CATEGORIES.map(cat => (
        <optgroup key={cat.key} label={cat.label}>
          {cat.options.map(opt => (
            <option key={`${cat.key}-${opt.name}`} value={`${FILTER_KEY_TO_CONSTRAINT_CATEGORY[cat.key]}:${opt.name}`}>{opt.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function Grid({ cells, rowConstraints, colConstraints, possiblePokemon, suggestedPokemonKeys, swapOptionCounts, selectedCell, editable = true, showSuggestedMeta = false, onCellClick, onSwapClick, onConstraintChange }: GridProps) {
  const getPokemonKey = (pokemon: Pokemon): string => pokemon.sprite || pokemon.name;
  const renderConstraintDisplay = (constraint: Constraint | null, isRow = false) => {
    const parsed = getConstraintParsedCategory(constraint);

    return (
      <div
        className={`flex w-full items-center justify-center rounded-md bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] font-medium text-[var(--text-h)] md:text-xs ${isRow ? 'h-full' : ''}`}
        style={{ borderColor: getConstraintColor(constraint) }}
      >
        {parsed ? <CategoryBadgeLink parsed={parsed} href={null} stacked /> : <span>{constraint?.value || '-'}</span>}
      </div>
    );
  };

  return (
    <div className="mb-3 flex flex-col items-center">
      <div className="mb-1 flex gap-1">
        <div className="flex w-[140px] flex-col items-center justify-center max-[768px]:w-[70px]">
        </div>
        {colConstraints.map((constraint, colIndex) => (
          <div key={colIndex} className="flex w-[143px] items-stretch max-[768px]:w-[90px]">
            {editable ? (
              <ConstraintSelect constraint={constraint} index={colIndex} isRow={false} onChange={onConstraintChange} />
            ) : (
              renderConstraintDisplay(constraint, false)
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-1">
          {rowConstraints.map((constraint, rowIndex) => (
            <div key={rowIndex} className="flex h-[157px] w-[140px] items-stretch max-[768px]:h-[112px] max-[768px]:w-[70px]">
              {editable ? (
                <ConstraintSelect constraint={constraint} index={rowIndex} isRow={true} onChange={onConstraintChange} />
              ) : (
                renderConstraintDisplay(constraint, true)
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 rounded border-[3px] border-[var(--border)] bg-[var(--border)]">
          {cells.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;
                const possible = possiblePokemon[rowIndex][colIndex];
                const rowConstraint = rowConstraints[rowIndex];
                const colConstraint = colConstraints[colIndex];
                const hasConstraint = rowConstraint || colConstraint;
                const optionCount = swapOptionCounts?.[rowIndex]?.[colIndex] ?? possible.length;
                const isSuggested = Boolean(
                  showSuggestedMeta &&
                    cell &&
                    suggestedPokemonKeys?.[rowIndex]?.[colIndex] === getPokemonKey(cell),
                );
                const suggestedLabel = cell
                  ? cell.dexDifficulty === 'Nightmare'
                    ? 'Nightmare'
                    : cell.id !== cell.formId
                      ? 'Alt Form'
                      : ''
                  : '';
                const isFilled = Boolean(cell);
                const cellStateClasses = isSelected
                  ? isFilled
                    ? 'bg-[var(--accent-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]'
                    : 'bg-[var(--code-bg)] text-[var(--text-h)] shadow-[0_0_0_2px_var(--accent),inset_0_0_0_1px_var(--border)]'
                  : isFilled
                    ? 'bg-[var(--bg)] hover:bg-[var(--accent-bg)]'
                    : 'bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]';

                return (
                    <div
                      key={colIndex}
                      className={`relative flex h-[154px] w-[140px] cursor-pointer flex-col items-center justify-end overflow-hidden rounded border-2 border-transparent transition-all max-[768px]:h-[110px] max-[768px]:w-[90px] ${cellStateClasses}`}
                      onClick={() => {
                      trackEvent('click_cell', {
                        position: `${rowIndex}_${colIndex}`,
                        has_constraint: hasConstraint ? 'true' : 'false',
                        has_pokemon: cell ? 'true' : 'false',
                      });
                      onCellClick(rowIndex, colIndex);
                    }}
                    style={{
                      borderColor: hasConstraint ? getConstraintColor(rowConstraint || colConstraint) : undefined,
                    } as React.CSSProperties}
                  >
                    {cell ? (
                      <>
                        {showSuggestedMeta && (
                          <>
                            {isSuggested && (
                              suggestedLabel ? (
                                <span
                                  className={`absolute left-0 top-0 z-[2] rounded-br-lg rounded-tl-sm px-[5px] py-px text-[7px] font-bold uppercase leading-[14px] tracking-[0.02em] text-white ${cell.dexDifficulty === "Nightmare" ? "bg-[#9b59b6]" : "bg-[#2574f5]"}`}
                                >
                                  {suggestedLabel}
                                </span>
                              ) : null
                            )}
                            <button
                              type="button"
                              className="absolute right-0.5 top-0.5 z-[2] inline-flex h-12 w-[42px] cursor-pointer flex-col items-center justify-center gap-px rounded-[14px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1 max-[768px]:right-[3px] max-[768px]:top-[14px] max-[768px]:h-[34px] max-[768px]:w-[30px] max-[768px]:rounded-xl"
                              aria-label={`Swap ${cell.name} (${optionCount} options)`}
                              onClick={(event) => {
                                event.stopPropagation();
                                (onSwapClick ?? onCellClick)(rowIndex, colIndex);
                              }}
                            >
                              <span className="text-[18px] leading-none max-[768px]:text-[13px]">⇄</span>
                              <span className="text-sm font-bold leading-none max-[768px]:text-[11px]">{optionCount}</span>
                            </button>
                          </>
                        )}
                        {cell.sprite && <img src={cell.sprite} alt="" className="absolute left-[22px] top-5 z-0 h-[95px] w-[95px] object-contain max-[768px]:left-2 max-[768px]:top-[14px] max-[768px]:h-[68px] max-[768px]:w-[68px]" />}
                        <div className={`relative z-[1] m-1 inline-flex flex-col items-center gap-px rounded-md px-2 py-1 text-center ${isSuggested ? 'm-0.5 px-1.5 py-[3px]' : ''}`}>
                          <span className={`text-[9px] font-semibold leading-[1.05] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text-h)]'}`}>{cell.name}</span>
                        </div>
                      </>
                    ) : possible.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                        <span className={`text-[18px] font-bold max-[768px]:text-[14px] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>No options yet</span>
                        <span className={`text-[0.58rem] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}>Tap to check other squares</span>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-0.5">
                         <span className={`text-[26px] font-bold max-[768px]:text-[20px] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text-h)]'}`}>{possible.length}</span>
                         <span className={`text-[0.6rem] ${isSelected ? 'text-[var(--text-h)]' : 'text-[var(--text)]'} opacity-80`}>Tap to explore</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
