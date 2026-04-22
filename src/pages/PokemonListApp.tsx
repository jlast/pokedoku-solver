import { useState, useMemo, useEffect } from 'react';
import type { Pokemon } from '../utils/types';
import { TYPE_COLORS } from '../utils/constants';
import { FILTER_CATEGORIES, parseFiltersFromUrl, getActiveFilters, getFiltersForUrl, applyFilters } from '../utils/filters';
import type { FilterState } from '../utils/filters';
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

type SortOption = 'number-asc' | 'number-desc' | 'difficulty-desc' | 'difficulty-asc';

function PokemonListApp() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set([]));
  const [flippedCardId, setFlippedCardId] = useState<number | null>(null);

  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = {};
    FILTER_CATEGORIES.forEach(cat => {
      initial[cat.key] = [];
    });
    const urlFilters = parseFiltersFromUrl(new URLSearchParams(window.location.search));
    return { ...initial, ...urlFilters };
  });

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
        trackEvent('view_pokemon_list', { count: data.length });
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

    const totalFilters = getActiveFilters(filters);
    if (totalFilters > 0) {
      const filterCounts: Record<string, number> = {};
      FILTER_CATEGORIES.forEach(cat => {
        filterCounts[cat.key] = filters[cat.key]?.length ?? 0;
      });
      trackEvent('filter_change', { ...filterCounts, total: totalFilters });
    }

    const params = getFiltersForUrl(filters);
    if (sortBy) params.set('sortBy', sortBy);
    else params.delete('sortBy');

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters, sortBy]);

  const toggleFilter = (categoryKey: string, value: string) => {
    setFilters(prev => {
      const arr = prev[categoryKey] ?? [];
      const isRemoving = arr.includes(value);
      const newArr = isRemoving
        ? arr.filter(v => v !== value)
        : [...arr, value];
      trackEvent('toggle_filter', {
        category: categoryKey,
        value,
        action: isRemoving ? 'remove' : 'add',
        activeCount: newArr.length,
      });
      return { ...prev, [categoryKey]: newArr };
    });
  };

  const toggleFilterExpanded = (key: string) => {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        trackEvent('collapse_filter', { category: key });
      } else {
        next.add(key);
        trackEvent('expand_filter', { category: key });
      }
      return next;
    });
  };

  const clearFilters = () => {
    const activeFilters = getActiveFilters(filters);
    const cleared: FilterState = {};
    FILTER_CATEGORIES.forEach(cat => {
      cleared[cat.key] = [];
    });
    setFilters(cleared);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    trackEvent('clear_filters', { count: activeFilters });
  };

  const handleNavigate = (url: string, clearFiltersFirst?: boolean) => {
    if (clearFiltersFirst) {
      const cleared: FilterState = {};
      FILTER_CATEGORIES.forEach(cat => {
        cleared[cat.key] = [];
      });
      setFilters(cleared);
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
    const newSort = column === 'number'
      ? (sortBy === 'number-asc' ? 'number-desc' : 'number-asc')
      : (sortBy === 'difficulty-asc' ? 'difficulty-desc' : 'difficulty-asc');
    setSortBy(newSort as SortOption);
    trackEvent('change_sort', { column, sort: newSort });
  };

  const filteredPokemon = useMemo(() => {
    return applyFilters(pokemon, filters);
  }, [pokemon, filters]);

  const getPokemonCategories = (p: Pokemon): { label: string; name: string; color?: string }[] => {
    const categories: { label: string; name: string; color?: string }[] = [];
    for (const cat of FILTER_CATEGORIES) {
      for (const opt of cat.options) {
        if (opt.filter(p)) {
          categories.push({ label: cat.label, name: opt.name, color: opt.color });
        }
      }
    }
    return categories;
  };

  const handleCardClick = (p: Pokemon) => {
    if (flippedCardId === p.id) {
      setFlippedCardId(null);
      trackEvent('select_pokemon', { name: p.name, action: 'unflip' });
    } else {
      const categoryCount = getPokemonCategories(p).length;
      setFlippedCardId(p.id);
      trackEvent('select_pokemon', { 
        name: p.name, 
        id: p.id, 
        action: 'flip',
        category_count: categoryCount 
      });
    }
  };

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
        {FILTER_CATEGORIES.map(cat => {
          const isExpanded = expandedFilters.has(cat.key);
          const activeCount = filters[cat.key]?.length ?? 0;
          return (
            <div key={cat.key} className={`filter-group ${isExpanded ? 'expanded' : ''}`}>
              <button
                className="filter-header"
                onClick={() => toggleFilterExpanded(cat.key)}
              >
                <span className="filter-label">{cat.label}</span>
                {activeCount > 0 && (
                  <span className="filter-count">{activeCount}</span>
                )}
                <span className="filter-chevron">{isExpanded ? '▼' : '▶'}</span>
              </button>
              <div className="filter-buttons">
                {cat.options.map(opt => {
                  const isActive = (filters[cat.key] ?? []).includes(opt.name);
                  return (
                    <button
                      key={opt.name}
                      className={`filter-btn ${isActive ? 'active' : ''}`}
                      style={isActive && opt.color ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                      onClick={() => toggleFilter(cat.key, opt.name)}
                    >
                      {opt.name}
                    </button>
                  );
                })}
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
            Number {sortBy === 'number-asc' ? '▲' : sortBy === 'number-desc' ? '▼' : '▲'}
          </button>
          <button
            className={`sort-btn ${sortBy === 'difficulty-asc' || sortBy === 'difficulty-desc' ? 'active' : ''}`}
            onClick={() => sortByColumn('difficulty')}
          >
            Dex Difficulty {sortBy === 'difficulty-asc' ? '▲' : sortBy === 'difficulty-desc' ? '▼' : '▲'}
          </button>
        </div>
        <button onClick={clearFilters} className="clear-btn">Clear Filters</button>
        <div className="results-count">
          {sortedPokemon.length} of {pokemon.length} Pokemon
        </div>
      </div>

      {sortedPokemon.length === 0 && (
        <div className="no-results">
          <p>No Pokémon match the selected filters.</p>
          <button onClick={clearFilters} className="clear-btn">Clear Filters</button>
        </div>
      )}

      <div className="pokemon-grid">
        {sortedPokemon.map(p => {
          const isFlipped = flippedCardId === p.id;
          return (
            <div
              key={`${p.id}-${p.name}`}
              className={isFlipped ? 'pokemon-card flipped' : 'pokemon-card'}
              onClick={() => handleCardClick(p)}
            >
              {isFlipped ? (
                <div className="pokemon-card-back">
                  <div style={{ fontSize: '0.8rem', textAlign: 'center' }}>
                    {getPokemonCategories(p).map((cat, i) => (
                      <span
                        key={i}
                        className="category-badge"
                        style={{ backgroundColor: cat.color, display: 'inline-block', margin: '2px' }}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          );
        })}
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