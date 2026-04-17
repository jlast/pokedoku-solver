import type { Pokemon } from '../types';
import type { Constraint } from '../constants';
import { TYPE_COLORS, CATEGORY_COLORS, getCategoryAbbr } from '../constants';
import { trackEvent } from '../analytics';

interface SuggestionsPanelProps {
  selectedCell: [number, number] | null;
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  possiblePokemon: Pokemon[];
  onSelect: (pokemon: Pokemon) => void;
}

function getConstraintColor(constraint: Constraint | null): string | undefined {
  if (!constraint) return undefined;
  if (TYPE_COLORS[constraint.value]) return TYPE_COLORS[constraint.value];
  if (constraint.category === 'typeline') return '#3498db';
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

export function SuggestionsPanel({ selectedCell, rowConstraints, colConstraints, possiblePokemon, onSelect }: SuggestionsPanelProps) {
  if (!selectedCell) return null;

  const [selRow, selCol] = selectedCell;
  const rowConstraint = rowConstraints[selRow];
  const colConstraint = colConstraints[selCol];

  return (
    <div className="suggestions-panel">
      <h3>
        Cell [{selRow + 1}, {selCol + 1}]
        {rowConstraint && (
          <span 
            className="constraint-tag"
            style={{ backgroundColor: getConstraintColor(rowConstraint) }}
          >
            {getCategoryAbbr(rowConstraint.category)}:{rowConstraint.value}
          </span>
        )}
        {colConstraint && (
          <span 
            className="constraint-tag"
            style={{ backgroundColor: getConstraintColor(colConstraint) }}
          >
            {getCategoryAbbr(colConstraint.category)}:{colConstraint.value}
          </span>
        )}
        <span className="count">({possiblePokemon.length})</span>
      </h3>
      <div className="pokemon-list">
        {possiblePokemon.length > 0 ? (
          possiblePokemon.map(p => (
            <button
              key={`${p.id}-${p.name}`}
              className="pokemon-item"
              onClick={() => {
                trackEvent('select_pokemon', {
                  name: p.name,
                  id: p.id,
                  types: p.types.join(','),
                });
                onSelect(p);
              }}
            >
              {p.sprite ? (
                <img src={p.sprite} alt="" className="pokemon-sprite" />
              ) : (
                <div className="pokemon-sprite-placeholder" />
              )}
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
          <p className="no-pokemon">No Pokémon matches the constraints.</p>
        )}
      </div>
    </div>
  );
}
