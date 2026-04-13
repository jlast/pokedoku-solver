import { useState, useMemo, useEffect } from 'react';
import type { Pokemon, PokemonType } from './types';
import { POKEMON_TYPES, POKEMON_REGIONS, EVOLUTION_METHODS, SPECIAL_FORMS, POKEMON_CATEGORIES } from './types';
import './App.css';
import './index.css';

type CellValue = Pokemon | null;

interface Constraint {
  value: string;
  category: 'type' | 'region' | 'evolution' | 'form' | 'category';
}

interface GridState {
  cells: CellValue[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  selectedCell: [number, number] | null;
}

const GRID_SIZE = 3;

const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A878',
  Fire: '#F08030',
  Water: '#6890F0',
  Electric: '#F8D030',
  Grass: '#78C850',
  Ice: '#98D8D8',
  Fighting: '#C03028',
  Poison: '#A040A0',
  Ground: '#E0C068',
  Flying: '#A890F0',
  Psychic: '#F85888',
  Bug: '#A8B820',
  Rock: '#B8A038',
  Ghost: '#705898',
  Dragon: '#7038F8',
  Dark: '#705848',
  Steel: '#B8B8D0',
  Fairy: '#EE99AC',
};

const REGION_COLORS: Record<string, string> = {
  Kanto: '#E3350D',
  Johto: '#CC9933',
  Hoenn: '#33CC33',
  Sinnoh: '#3366CC',
  Unova: '#333366',
  Kalos: '#0099FF',
  Alola: '#FF6699',
  Galar: '#7C7C7C',
  Hisui: '#6699CC',
  Paldea: '#E6A800',
  Unknown: '#808080',
};

const EVOLUTION_COLORS: Record<string, string> = {
  'First Stage': '#78C850',
  'Middle Stage': '#F08030',
  'Final Stage': '#705898',
  'No Evolution Line': '#808080',
  'Evolved by Level': '#58D68D',
  'Evolved by Item': '#F4D03F',
  'Evolved by Trade': '#5DADE2',
  'Evolved by Friendship': '#F5B7B1',
  'Is Branched': '#AF7AC5',
  'Monotype': '#E74C3C',
  'Dualtype': '#3498DB',
};

const FORM_COLORS: Record<string, string> = {
  'Gigantamax': '#FF69B4',
  'Mega Evolution': '#FF6347',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Legendary': '#FFD700',
  'Mythical': '#FF1493',
  'Ultra Beast': '#00CED1',
  'Paradox': '#9370DB',
  'Fossil': '#D2691E',
  'Starter': '#32CD32',
  'Baby': '#FFB6C1',
};

interface ConstraintOption {
  value: string;
  label: string;
  category: 'type' | 'region' | 'evolution' | 'form' | 'category';
}

const CONSTRAINT_OPTIONS: { label: string; options: ConstraintOption[] }[] = [
  { label: 'Types', options: POKEMON_TYPES.map(t => ({ value: t, label: t, category: 'type' as const })) },
  { label: 'Regions', options: POKEMON_REGIONS.map(r => ({ value: r, label: r, category: 'region' as const })) },
  { label: 'Evolution', options: EVOLUTION_METHODS.map(s => ({ value: s, label: s, category: 'evolution' as const })) },
  { label: 'Forms', options: SPECIAL_FORMS.map(f => ({ value: f, label: f, category: 'form' as const })) },
  { label: 'Categories', options: POKEMON_CATEGORIES.map(c => ({ value: c, label: c, category: 'category' as const })) },
];

const ALL_OPTIONS: ConstraintOption[] = CONSTRAINT_OPTIONS.flatMap(g => g.options);

function App() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>({
    cells: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
    rowConstraints: [null, null, null],
    colConstraints: [null, null, null],
    selectedCell: null,
  });

  useEffect(() => {
    fetch('/pokemon.json')
      .then(res => res.json())
      .then(data => {
        setPokemon(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load Pokemon:', err);
        setLoading(false);
      });
  }, []);

  const possiblePokemon = useMemo(() => {
    const result: Pokemon[][][] = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => [] as Pokemon[])
    );

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid.cells[row][col] !== null) {
          result[row][col] = [grid.cells[row][col]!];
          continue;
        }

        const usedInRow = new Set(grid.cells[row].filter(Boolean).map(p => p!.id));
        const usedInCol = new Set(grid.cells.map(r => r[col]).filter(Boolean).map(p => p!.id));
        const rowConstraint = grid.rowConstraints[row];
        const colConstraint = grid.colConstraints[col];

        const candidates = pokemon.filter(p => {
          if (usedInRow.has(p.id) || usedInCol.has(p.id)) return false;
          
          if (rowConstraint) {
            if (rowConstraint.category === 'type') {
              if (!p.types.includes(rowConstraint.value as PokemonType)) return false;
            } else if (rowConstraint.category === 'region') {
              if (p.region !== rowConstraint.value) return false;
            } else if (rowConstraint.category === 'evolution') {
              if (rowConstraint.value === 'Monotype') {
                if (p.types.length !== 1) return false;
              } else if (rowConstraint.value === 'Dualtype') {
                if (p.types.length !== 2) return false;
              } else if (p.evolutionMethod !== rowConstraint.value) return false;
            } else if (rowConstraint.category === 'form') {
              if (p.specialForm !== rowConstraint.value) return false;
            } else if (rowConstraint.category === 'category') {
              if (p.category !== rowConstraint.value) return false;
            }
          }
          
          if (colConstraint) {
            if (colConstraint.category === 'type') {
              if (!p.types.includes(colConstraint.value as PokemonType)) return false;
            } else if (colConstraint.category === 'region') {
              if (p.region !== colConstraint.value) return false;
            } else if (colConstraint.category === 'evolution') {
              if (colConstraint.value === 'Monotype') {
                if (p.types.length !== 1) return false;
              } else if (colConstraint.value === 'Dualtype') {
                if (p.types.length !== 2) return false;
              } else if (p.evolutionMethod !== colConstraint.value) return false;
            } else if (colConstraint.category === 'form') {
              if (p.specialForm !== colConstraint.value) return false;
            } else if (colConstraint.category === 'category') {
              if (p.category !== colConstraint.value) return false;
            }
          }
          
          return true;
        });

        result[row][col] = candidates;
      }
    }

    return result;
  }, [grid, pokemon]);

  const handleCellClick = (row: number, col: number) => {
    const cell = grid.cells[row][col];
    
    if (cell) {
      setGrid(prev => ({
        ...prev,
        cells: prev.cells.map((r, ri) =>
          ri === row ? r.map((cellValue, ci): CellValue => ci === col ? null : cellValue) : r
        ),
        selectedCell: null,
      }));
    } else {
      setGrid(prev => ({
        ...prev,
        selectedCell: [row, col],
      }));
    }
  };

  const handlePokemonSelect = (selectedPokemon: Pokemon) => {
    if (!grid.selectedCell) return;
    const [row, col] = grid.selectedCell;
    
    setGrid(prev => ({
      ...prev,
      cells: prev.cells.map((r, ri) =>
        ri === row ? r.map((cellValue, ci): CellValue => ci === col ? selectedPokemon : cellValue) : r
      ),
      selectedCell: null,
    }));
  };

  const handleConstraintChange = (index: number, isRow: boolean, option: ConstraintOption | null) => {
    const constraint = option ? { value: option.value, category: option.category } : null;
    setGrid(prev => ({
      ...prev,
      [isRow ? 'rowConstraints' : 'colConstraints']: 
        prev[isRow ? 'rowConstraints' : 'colConstraints'].map((c, i) => 
          i === index ? constraint : c
        ),
    }));
  };

  const clearGrid = () => {
    setGrid({
      cells: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
      rowConstraints: [null, null, null],
      colConstraints: [null, null, null],
      selectedCell: null,
    });
  };

  const selectedCellPossible = grid.selectedCell 
    ? possiblePokemon[grid.selectedCell[0]][grid.selectedCell[1]] 
    : [];

  const getConstraintColor = (constraint: Constraint | null): string | undefined => {
    if (!constraint) return undefined;
    if (TYPE_COLORS[constraint.value]) return TYPE_COLORS[constraint.value];
    if (REGION_COLORS[constraint.value]) return REGION_COLORS[constraint.value];
    if (EVOLUTION_COLORS[constraint.value]) return EVOLUTION_COLORS[constraint.value];
    if (FORM_COLORS[constraint.value]) return FORM_COLORS[constraint.value];
    if (CATEGORY_COLORS[constraint.value]) return CATEGORY_COLORS[constraint.value];
    return undefined;
  };

  const getCategoryAbbr = (category: string): string => {
    switch (category) {
      case 'type': return 'T';
      case 'region': return 'R';
      case 'evolution': return 'E';
      case 'form': return 'F';
      case 'category': return 'C';
      default: return '?';
    }
  };

  if (loading) {
    return (
      <div className="app loading">
        <p>Loading Pokemon data...</p>
      </div>
    );
  }

  const [selRow, selCol] = grid.selectedCell || [null, null];

  return (
    <div className="app">
      <header>
        <h1>Pokedoku Helper</h1>
        <p>Set row/column constraints, then click a cell to place a Pokemon.</p>
        <p className="pokemon-count">{pokemon.length} Pokemon loaded</p>
      </header>

      <div className="controls">
        <button onClick={clearGrid} className="clear-btn">Clear All</button>
      </div>

      <div className="main-content">
        <div className="grid-wrapper">
          <div className="type-labels-top">
            <div className="corner-spacer">
              <span className="corner-label">Rows</span>
            </div>
            {grid.colConstraints.map((constraint, colIndex) => (
              <div key={colIndex} className="constraint-selector">
                <select
                  className="constraint-select"
                  value={constraint?.value || ''}
                  onChange={(e) => {
                    const option = ALL_OPTIONS.find(o => o.value === e.target.value);
                    handleConstraintChange(colIndex, false, option || null);
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
              </div>
            ))}
          </div>

          <div className="grid-with-row-labels">
            <div className="type-labels-left">
              {grid.rowConstraints.map((constraint, rowIndex) => (
                <div key={rowIndex} className="constraint-selector">
                  <select
                    className="constraint-select"
                    value={constraint?.value || ''}
                    onChange={(e) => {
                      const option = ALL_OPTIONS.find(o => o.value === e.target.value);
                      handleConstraintChange(rowIndex, true, option || null);
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
                </div>
              ))}
            </div>

            <div className="grid">
              {grid.cells.map((row, rowIndex) => (
                <div key={rowIndex} className="row">
                  {row.map((cell, colIndex) => {
                    const isSelected = selRow === rowIndex && selCol === colIndex;
                    const possible = possiblePokemon[rowIndex][colIndex];
                    const rowConstraint = grid.rowConstraints[rowIndex];
                    const colConstraint = grid.colConstraints[colIndex];
                    const hasConstraint = rowConstraint || colConstraint;
                    
                    return (
                      <div
                        key={colIndex}
                        className={`cell ${isSelected ? 'selected' : ''} ${cell ? 'filled' : ''} ${hasConstraint ? 'constrained' : ''}`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        style={{
                          '--constraint-color': getConstraintColor(rowConstraint || colConstraint),
                        } as React.CSSProperties}
                      >
                        {cell ? (
                          <div className="cell-content">
                            <span className="pokemon-id">#{cell.id.toString().padStart(4, '0')}</span>
                            <span className="pokemon-name">{cell.name}</span>
                            <div className="pokemon-types">
                              {cell.types.map((type, i) => (
                                <span 
                                  key={i} 
                                  className="type-badge"
                                  style={{ backgroundColor: TYPE_COLORS[type!] }}
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                            {cell.category && (
                              <span className="class-badge" style={{ backgroundColor: CATEGORY_COLORS[cell.category] }}>
                                {cell.category}
                              </span>
                            )}
                            {cell.evolutionMethod && (
                              <span className="evolution-badge" style={{ backgroundColor: EVOLUTION_COLORS[cell.evolutionMethod] }}>
                                {cell.evolutionMethod}
                              </span>
                            )}
                            {cell.specialForm && (
                              <span className="form-badge" style={{ backgroundColor: FORM_COLORS[cell.specialForm] }}>
                                {cell.specialForm}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="possible-count">{possible.length}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {grid.selectedCell && (
          <div className="suggestions-panel">
            <h3>
              Cell [{selRow! + 1}, {selCol! + 1}]
              {grid.rowConstraints[selRow!] && (
                <span 
                  className="constraint-tag"
                  style={{ backgroundColor: getConstraintColor(grid.rowConstraints[selRow!]) }}
                >
                  {getCategoryAbbr(grid.rowConstraints[selRow!]!.category)}:{grid.rowConstraints[selRow!]!.value}
                </span>
              )}
              {grid.colConstraints[selCol!] && (
                <span 
                  className="constraint-tag"
                  style={{ backgroundColor: getConstraintColor(grid.colConstraints[selCol!]) }}
                >
                  {getCategoryAbbr(grid.colConstraints[selCol!]!.category)}:{grid.colConstraints[selCol!]!.value}
                </span>
              )}
              <span className="count">({selectedCellPossible.length})</span>
            </h3>
            <div className="pokemon-list">
              {selectedCellPossible.length > 0 ? (
                selectedCellPossible.map(p => (
                  <button
                    key={p.id}
                    className="pokemon-item"
                    onClick={() => handlePokemonSelect(p)}
                  >
                    <span className="pokemon-id">#{p.id.toString().padStart(4, '0')}</span>
                    <span className="pokemon-name">{p.name}</span>
                    <div className="pokemon-types">
                      {p.types.map((type, i) => (
                        <span 
                          key={i} 
                          className="type-badge"
                          style={{ backgroundColor: TYPE_COLORS[type!] }}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    {p.category && (
                      <span className="class-badge-small" style={{ backgroundColor: CATEGORY_COLORS[p.category] }}>
                        {p.category}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="no-pokemon">No Pokemon matches the constraints.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
