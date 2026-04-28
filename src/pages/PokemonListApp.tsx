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

const POKEMON_TYPES_LIST: PokemonType[] = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const POKEMON_REGIONS_LIST: PokemonRegion[] = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'];
const EVOLUTION_METHODS_LIST: EvolutionMethod[] = ['First Stage', 'Middle Stage', 'Final Stage', 'No Evolution Line', 'Not Fully Evolved'];
const SPECIAL_FORMS_LIST: SpecialForm[] = ['Gigantamax', 'Mega Evolution'];
const POKEMON_CATEGORIES_LIST: PokemonCategory[] = ['Legendary', 'Mythical', 'Ultra Beast', 'Paradox', 'Fossil', 'Starter', 'Baby'];

const FILTER_GROUPS = [
  { key: 'types', label: 'Types', options: POKEMON_TYPES_LIST, colors: TYPE_COLORS },
  { key: 'regions', label: 'Regions', options: POKEMON_REGIONS_LIST, colors: REGION_COLORS },
  { key: 'evolution', label: 'Evolution', options: EVOLUTION_METHODS_LIST, colors: EVOLUTION_COLORS },
  { key: 'form', label: 'Forms', options: SPECIAL_FORMS_LIST, colors: FORM_COLORS },
  { key: 'category', label: 'Categories', options: POKEMON_CATEGORIES_LIST, colors: CATEGORY_COLORS },
] as const;

function PokemonListApp() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set(['types']));

  const [filters, setFilters] = useState<FilterState>(parseFiltersFromUrl);

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
     const sortParam = params.get('sortBy') as SortOption | null;

    if (sortParam) return sortParam;

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
    if (sortBy) params.set('sortBy', sortBy);
    else params.delete('sortBy');

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters, sortBy]);

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

  const toggleFilterExpanded = (key: string) => {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
        {FILTER_GROUPS.map(group => {
          const isExpanded = expandedFilters.has(group.key);
          const activeCount = filters[group.key].length;
          return (
            <div key={group.key} className={`filter-group ${isExpanded ? 'expanded' : ''}`}>
              <button 
                className="filter-header"
                onClick={() => toggleFilterExpanded(group.key)}
              >
                <span className="filter-label">{group.label}</span>
                {activeCount > 0 && (
                  <span className="filter-count">{activeCount}</span>
                )}
                <span className="filter-chevron">{isExpanded ? '▼' : '▶'}</span>
              </button>
              <div className="filter-buttons">
                {group.options.map(option => (
                  <button
                    key={option}
                    className={`filter-btn ${(filters[group.key] as string[]).includes(option) ? 'active' : ''}`}
                    style={(filters[group.key] as string[]).includes(option) ? { backgroundColor: group.colors[option], borderColor: group.colors[option] } : {}}
                    onClick={() => toggleFilter(group.key as keyof FilterState, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
