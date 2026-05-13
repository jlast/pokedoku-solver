import type { Pokemon } from '@pokedoku-helper/shared-types';
import { TYPE_COLORS, CATEGORY_COLORS } from '../../../../lib/shared/constants';
import { FILTER_CATEGORIES, findConstraintOption, type Constraint } from '../../../../lib/shared/filters';
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
      value={constraint?.value || ''}
      onChange={handleChange}
      style={{ borderColor: getConstraintColor(constraint) }}
    >
      <option value="">…</option>
      {FILTER_CATEGORIES.map(cat => (
        <optgroup key={cat.key} label={cat.label}>
          {cat.options.map(opt => (
            <option key={opt.name} value={opt.name}>{opt.name}</option>
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
        className={`flex w-full items-center justify-center rounded-md border-2 border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-center text-[10px] font-medium text-[var(--text-h)] md:text-xs ${isRow ? 'h-full' : ''}`}
        style={{ borderColor: getConstraintColor(constraint) }}
      >
        {parsed ? <CategoryBadgeLink parsed={parsed} href={null} /> : <span>{constraint?.value || '-'}</span>}
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

        <div className="suggested-grid">
          {cells.map((row, rowIndex) => (
            <div key={rowIndex} className="row">
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
                
                return (
                    <div
                      key={colIndex}
                      className={`cell ${isSelected ? 'selected' : ''} ${cell ? 'filled' : ''} ${hasConstraint ? 'constrained' : ''} ${isSuggested ? 'suggested-cell' : ''}`}
                      onClick={() => {
                      trackEvent('click_cell', {
                        position: `${rowIndex}_${colIndex}`,
                        has_constraint: hasConstraint ? 'true' : 'false',
                        has_pokemon: cell ? 'true' : 'false',
                      });
                      onCellClick(rowIndex, colIndex);
                    }}
                    style={{
                      '--constraint-color': getConstraintColor(rowConstraint || colConstraint),
                    } as React.CSSProperties}
                  >
                    {cell ? (
                      <>
                        {showSuggestedMeta && (
                          <>
                            {isSuggested && (
                              <span
                                className={`${cell.dexDifficulty === "Nightmare" ? "cell-suggested-label cell-suggested-label--nightmare" : cell.id !== cell.formId ? "cell-suggested-label cell-suggested-label--special-form" : ""}`}
                              >
                                {cell.dexDifficulty === "Nightmare" ? "Nightmare" : cell.id !== cell.formId ? "Alt Form" : ""}
                              </span>
                            )}
                            <button
                              type="button"
                              className="cell-swap-btn"
                              aria-label={`Swap ${cell.name} (${optionCount} options)`}
                              onClick={(event) => {
                                event.stopPropagation();
                                (onSwapClick ?? onCellClick)(rowIndex, colIndex);
                              }}
                            >
                              <span className="cell-swap-icon">⇄</span>
                              <span className="cell-swap-count">{optionCount}</span>
                            </button>
                          </>
                        )}
                        {cell.sprite && <img src={cell.sprite} alt="" className="pokemon-sprite" />}
                        <div className="cell-content">
                          <span className="pokemon-name">{cell.name}</span>
                        </div>
                      </>
                    ) : (
                      <div className="cell-count">
                        <span className="possible-count">{possible.length}</span>
                        <span className="tap-hint">Tap to explore</span>
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
