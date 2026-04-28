import type { Pokemon } from '../utils/types';
import { TYPE_COLORS } from '../utils/constants';
import { trackEvent } from '../utils/analytics';

interface SuggestionsPanelProps {
  selectedCell: [number, number] | null;
  possiblePokemon: Pokemon[];
  onSelect: (pokemon: Pokemon) => void;
}

const DEX_DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#27ae60',
  Normal: '#3498db',
  Hard: '#e67e22',
  Expert: '#e74c3c',
  Nightmare: '#9b59b6',
};

export function SuggestionsPanel({ selectedCell, possiblePokemon, onSelect }: SuggestionsPanelProps) {
  if (!selectedCell) return null;

  return (
    <div className="suggestions-panel">
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
              <div className="pokemon-item-top">
                <div className="pokemon-item-name-row">
                  <span className="pokemon-name">{p.name}</span>
                  {p.dexDifficulty && (
                    <span 
                      className="dex-difficulty-badge"
                      style={{ backgroundColor: DEX_DIFFICULTY_COLORS[p.dexDifficulty] }}
                      title="Easy = many choices • Nightmare = few choices"
                    >
                      {p.dexDifficulty}
                    </span>
                  )}
                </div>
                <div className="pokemon-item-bottom">
                  <span className="pokemon-id">#{p.id}</span>
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
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className="no-pokemon">No Pokémon matches the constraints.</p>
        )}
      </div>
    </div>
  );
}
