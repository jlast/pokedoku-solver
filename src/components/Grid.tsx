import type { Pokemon } from '../utils/types';
import { TYPE_COLORS, CATEGORY_COLORS } from '../utils/constants';
import { FILTER_CATEGORIES, findConstraintOption, type Constraint } from '../utils/filters';
import { trackEvent } from '../utils/analytics';

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
      className="constraint-select"
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

  return (
    <div className="grid-wrapper">
      <div className="type-labels-top">
        <div className="corner-spacer">
        </div>
        {colConstraints.map((constraint, colIndex) => (
          <div key={colIndex} className="constraint-selector">
            {editable ? (
              <ConstraintSelect constraint={constraint} index={colIndex} isRow={false} onChange={onConstraintChange} />
            ) : (
              <div className="constraint-display" style={{ borderColor: getConstraintColor(constraint) }}>
                {constraint?.value || '-'}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid-with-row-labels">
        <div className="type-labels-left">
          {rowConstraints.map((constraint, rowIndex) => (
            <div key={rowIndex} className="constraint-selector">
              {editable ? (
                <ConstraintSelect constraint={constraint} index={rowIndex} isRow={true} onChange={onConstraintChange} />
              ) : (
                <div className="constraint-display" style={{ borderColor: getConstraintColor(constraint) }}>
                  {constraint?.value || '-'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid">
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
                            {isSuggested && <span className="cell-suggested-label">Suggested</span>}
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
