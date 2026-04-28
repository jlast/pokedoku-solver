import type { Pokemon } from '../types';
import type { Constraint } from '../constants';
import { TYPE_COLORS, CATEGORY_COLORS, CONSTRAINT_OPTIONS, findConstraintOption } from '../constants';
import { trackEvent } from '../analytics';

interface GridProps {
  cells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  possiblePokemon: Pokemon[][][];
  selectedCell: [number, number] | null;
  editable?: boolean;
  onCellClick: (row: number, col: number) => void;
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

export function Grid({ cells, rowConstraints, colConstraints, possiblePokemon, selectedCell, editable = true, onCellClick, onConstraintChange }: GridProps) {
  return (
    <div className="grid-wrapper">
      <div className="type-labels-top">
        <div className="corner-spacer">
        </div>
        {colConstraints.map((constraint, colIndex) => (
          <div key={colIndex} className="constraint-selector">
            {editable ? (
              <select
                className="constraint-select"
                value={constraint?.value || ''}
                onChange={(e) => {
                  const option = findConstraintOption(e.target.value);
                  onConstraintChange(colIndex, false, option);
                  if (option) {
                    trackEvent('change_col_constraint', {
                      position: `col_${colIndex}`,
                      category: option.category,
                      value: option.value,
                    });
                  }
                }}
                style={{ borderColor: getConstraintColor(constraint) }}
              >
                <option value="">-</option>
                {CONSTRAINT_OPTIONS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
              <select
                className="constraint-select"
                value={constraint?.value || ''}
                onChange={(e) => {
                  const option = findConstraintOption(e.target.value);
                  onConstraintChange(rowIndex, true, option);
                  if (option) {
                    trackEvent('change_row_constraint', {
                      position: `row_${rowIndex}`,
                      category: option.category,
                      value: option.value,
                    });
                  }
                }}
                style={{ borderColor: getConstraintColor(constraint) }}
              >
                  <option value="">-</option>
                  {CONSTRAINT_OPTIONS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
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
                
                return (
                  <div
                    key={colIndex}
                    className={`cell ${isSelected ? 'selected' : ''} ${cell ? 'filled' : ''} ${hasConstraint ? 'constrained' : ''}`}
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
                      <div className="cell-content">
                        {cell.sprite && <img src={cell.sprite} alt="" className="pokemon-sprite" />}
                        <span className="pokemon-id">#{cell.id.toString().padStart(4, '0')}</span>
                        <span className="pokemon-name">{cell.name}</span>
                      </div>
                    ) : (
                      <div className="cell-count">
                        <span className="possible-count">{possible.length}</span>
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
