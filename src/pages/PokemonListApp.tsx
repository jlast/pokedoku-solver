import { useState, useMemo, useEffect } from 'react';
import type { Pokemon, PokemonType, PokemonRegion, EvolutionMethod, SpecialForm, PokemonCategory } from '../utils/types';
import { TYPE_COLORS, REGION_COLORS, EVOLUTION_COLORS, FORM_COLORS, CATEGORY_COLORS } from '../utils/constants';
import { trackEvent } from '../utils/analytics';
import { Header } from '../components/Header';
import './App.css';
import '../index.css';

const DEX_DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#27ae60',
  Normal: '#3498db',
  Hard: '#e67e22',
  Expert: '#e74c3c',
  Nightmare: '#9b59b6',
};

interface FilterState {
  types: PokemonType[];
  regions: PokemonRegion[];
  evolution: EvolutionMethod[];
  form: SpecialForm[];
  category: PokemonCategory[];
}

type SortOption = 'number-asc' | 'number-desc' | 'difficulty-desc' | 'difficulty-asc';

function parseFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const loadedFilters: FilterState = {
    types: [],
    regions: [],
    evolution: [],
    form: [],
    category: [],
  };

  const typeValues = params.get('types')?.split(',').filter(Boolean) || [];
  loadedFilters.types = typeValues.filter(t => 
    (['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'] as const).includes(t as PokemonType)
  ) as PokemonType[];

  const regionValues = params.get('regions')?.split(',').filter(Boolean) || [];
  loadedFilters.regions = regionValues.filter(r =>
    (['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'] as const).includes(r as PokemonRegion)
  ) as PokemonRegion[];

  const evoValues = params.get('evolution')?.split(',').filter(Boolean) || [];
  loadedFilters.evolution = evoValues.filter(e =>
    (['First Stage', 'Middle Stage', 'Final Stage', 'No Evolution Line', 'Not Fully Evolved'] as const).includes(e as EvolutionMethod)
  ) as EvolutionMethod[];

  const formValues = params.get('form')?.split(',').filter(Boolean) || [];
  loadedFilters.form = formValues.filter(f =>
    (['Gigantamax', 'Mega Evolution'] as const).includes(f as SpecialForm)
  ) as SpecialForm[];

  const catValues = params.get('category')?.split(',').filter(Boolean) || [];
  loadedFilters.category = catValues.filter(c =>
    (['Legendary', 'Mythical', 'Ultra Beast', 'Paradox', 'Fossil', 'Starter', 'Baby'] as const).includes(c as PokemonCategory)
  ) as PokemonCategory[];

  return loadedFilters;
}

function PokemonListApp() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(parseFiltersFromUrl);

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pokedoku-sort') as SortOption) || 'number-asc';
    }
    return 'number-asc';
  });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}pokemon.json?t=${Date.now()}`)
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

  useEffect(() => {
    localStorage.setItem('pokedoku-sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    
    if (filters.types.length > 0) params.set('types', filters.types.join(','));
    else params.delete('types');
    if (filters.regions.length > 0) params.set('regions', filters.regions.join(','));
    else params.delete('regions');
    if (filters.evolution.length > 0) params.set('evolution', filters.evolution.join(','));
    else params.delete('evolution');
    if (filters.form.length > 0) params.set('form', filters.form.join(','));
    else params.delete('form');
    if (filters.category.length > 0) params.set('category', filters.category.join(','));
    else params.delete('category');

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters]);

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const arr = prev[category] as string[];
      if (arr.includes(value)) {
        return { ...prev, [category]: arr.filter(v => v !== value) };
      } else {
        return { ...prev, [category]: [...arr, value] };
      }
    });
    trackEvent('toggle_filter', { category, value });
  };

  const clearFilters = () => {
    setFilters({
      types: [],
      regions: [],
      evolution: [],
      form: [],
      category: [],
    });
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    trackEvent('clear_filters');
  };

  const handleNavigate = (url: string, clearFiltersFirst?: boolean) => {
    if (clearFiltersFirst) {
      setFilters({
        types: [],
        regions: [],
        evolution: [],
        form: [],
        category: [],
      });
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    trackEvent('click_navigate', { url });
    window.location.href = `${import.meta.env.BASE_URL}${url}`;
  };

  const handleClearAndNavigate = () => {
    handleNavigate('', true);
    window.location.href = import.meta.env.BASE_URL || '/';
  };

  const sortByColumn = (column: 'number' | 'difficulty') => {
    if (column === 'number') {
      setSortBy(sortBy === 'number-asc' ? 'number-desc' : 'number-asc');
    } else {
      setSortBy(sortBy === 'difficulty-asc' ? 'difficulty-desc' : 'difficulty-asc');
    }
  };

  const filteredPokemon = useMemo(() => {
    return pokemon.filter(p => {
      if (filters.types.length > 0 && !filters.types.every(t => p.types.includes(t as PokemonType))) {
        return false;
      }
      if (filters.regions.length > 0) {
        if (!p.region) return false;
        if (!filters.regions.every(r => p.region === r)) return false;
      }
      if (filters.evolution.length > 0) {
        if (!p.evolutionStage) return false;
        if (!filters.evolution.every(e => p.evolutionStage === e)) return false;
      }
      if (filters.form.length > 0) {
        if (!p.specialForm) return false;
        if (!filters.form.every(f => p.specialForm === f)) return false;
      }
      if (filters.category.length > 0) {
        if (!p.category) return false;
        if (!filters.category.every(c => p.category === c)) return false;
      }
      return true;
    });
  }, [pokemon, filters]);

  const sortedPokemon = useMemo(() => {
    const copy = [...filteredPokemon];
    if (sortBy === 'number-asc') {
      return copy.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'number-desc') {
      return copy.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'difficulty-asc') {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return bPercentile - aPercentile;
      });
    } else if (sortBy === 'difficulty-desc') {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return aPercentile - bPercentile;
      });
    }
    return copy;
  }, [filteredPokemon, sortBy]);

  const POKEMON_TYPES: PokemonType[] = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
  const POKEMON_REGIONS: PokemonRegion[] = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'];
  const EVOLUTION_METHODS: EvolutionMethod[] = ['First Stage', 'Middle Stage', 'Final Stage', 'No Evolution Line', 'Not Fully Evolved'];
  const SPECIAL_FORMS: SpecialForm[] = ['Mega Evolution', 'Gigantamax'];
  const POKEMON_CATEGORIES: PokemonCategory[] = ['Legendary', 'Mythical', 'Ultra Beast', 'Paradox', 'Fossil', 'Starter', 'Baby'];

  if (loading) {
    return (
      <div className="app loading">
        <p>Loading Pokémon data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        title="Pokemon List"
        subtitle={`Browse all ${pokemon.length} Pokemon with filters for types, regions, categories, and more.`}
      />

      <div className="controls">
        <button onClick={handleClearAndNavigate} className="nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          Editor
        </button>
        <button onClick={() => handleNavigate('today/')} className="nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>
          Today's Puzzle
        </button>
      </div>

      <div className="pokemon-list-filters">
        <div className="filter-group">
          <div className="filter-label">Types</div>
          <div className="filter-buttons">
            {POKEMON_TYPES.map(type => (
              <button
                key={type}
                className={`filter-btn ${filters.types.includes(type) ? 'active' : ''}`}
                style={filters.types.includes(type) ? { backgroundColor: TYPE_COLORS[type], borderColor: TYPE_COLORS[type] } : {}}
                onClick={() => toggleFilter('types', type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      
        <div className="filter-group">
          <div className="filter-label">Regions</div>
          <div className="filter-buttons">
            {POKEMON_REGIONS.map(region => (
              <button
                key={region}
                className={`filter-btn ${filters.regions.includes(region) ? 'active' : ''}`}
                style={filters.regions.includes(region) ? { backgroundColor: REGION_COLORS[region], borderColor: REGION_COLORS[region] } : {}}
                onClick={() => toggleFilter('regions', region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Evolution</div>
          <div className="filter-buttons">
            {EVOLUTION_METHODS.map(evo => (
              <button
                key={evo}
                className={`filter-btn ${filters.evolution.includes(evo) ? 'active' : ''}`}
                style={filters.evolution.includes(evo) ? { backgroundColor: EVOLUTION_COLORS[evo], borderColor: EVOLUTION_COLORS[evo] } : {}}
                onClick={() => toggleFilter('evolution', evo)}
              >
                {evo}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Forms</div>
          <div className="filter-buttons">
            {SPECIAL_FORMS.map(form => (
              <button
                key={form}
                className={`filter-btn ${filters.form.includes(form) ? 'active' : ''}`}
                style={filters.form.includes(form) ? { backgroundColor: FORM_COLORS[form], borderColor: FORM_COLORS[form] } : {}}
                onClick={() => toggleFilter('form', form)}
              >
                {form}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Categories</div>
          <div className="filter-buttons">
            {POKEMON_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${filters.category.includes(cat) ? 'active' : ''}`}
                style={filters.category.includes(cat) ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
                onClick={() => toggleFilter('category', cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pokemon-list-header">
        <div className="sort-controls">
          <button 
            className={`sort-btn ${sortBy === 'number-asc' || sortBy === 'number-desc' ? 'active' : ''}`}
            onClick={() => sortByColumn('number')}
          >
            Number {sortBy === 'number-asc' ? '▲' : sortBy === 'number-desc' ? '▼' : '↕'}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'difficulty-asc' || sortBy === 'difficulty-desc' ? 'active' : ''}`}
            onClick={() => sortByColumn('difficulty')}
          >
            Dex Difficulty {sortBy === 'difficulty-asc' ? '▲' : sortBy === 'difficulty-desc' ? '▼' : '↕'}
          </button>
        </div>
        <button onClick={clearFilters} className="clear-btn">Clear Filters</button>
        <div className="results-count">
          {sortedPokemon.length} of {pokemon.length} Pokemon
        </div>
      </div>

      <div className="pokemon-grid">
        {sortedPokemon.map(p => (
          <div key={`${p.id}-${p.name}`} className="pokemon-card">
            {p.sprite ? (
              <img src={p.sprite} alt="" className="pokemon-sprite" />
            ) : (
              <div className="pokemon-sprite-placeholder" />
            )}
            <div className="pokemon-card-info">
              <div className="pokemon-card-name">{p.name}</div>
              <div className="pokemon-card-id">#{p.id}</div>
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
              {p.dexDifficulty && (
                <span
                  className="dex-difficulty-badge"
                  style={{
                    backgroundColor: DEX_DIFFICULTY_COLORS[p.dexDifficulty],
                  }}
                >
                  {p.dexDifficulty}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer>
        <a href="https://pokedoku.com" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('click_pokedoku', { url: 'https://pokedoku.com' })}>Play Pokedoku</a>
        <span>•</span>
        <a href="https://github.com/jlast/pokedoku-solver/issues" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('click_report_issues', { url: 'https://github.com/jlast/pokedoku-solver/issues' })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          Report Issues
        </a>
      </footer>
    </div>
  );
}

export default PokemonListApp;