import { useState, useMemo, useEffect, useRef } from "react";
import type { Pokemon } from "../../../../lib/shared/types";
import { DEX_DIFFICULTY_COLORS } from "../../../../lib/shared/constants";
import {
  FILTER_CATEGORIES,
  parseFiltersFromUrl,
  getActiveFilters,
  getFiltersForUrl,
  applyFilters,
} from "../../../../lib/shared/filters";
import type { FilterState } from "../../../../lib/shared/filters";
import { trackEvent } from "../../../../lib/browser/analytics";
import { slugify } from "../../lib/slug";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PokemonCard } from "../components/shared/PokemonCard";

type SortOption =
  | "number-asc"
  | "number-desc"
  | "difficulty-desc"
  | "difficulty-asc";

const INITIAL_RENDER_COUNT = 120;
const RENDER_BATCH_SIZE = 80;

function createInitialFilters(): FilterState {
  const initial: FilterState = {};
  FILTER_CATEGORIES.forEach((cat) => {
    initial[cat.key] = [];
  });

  if (typeof window === "undefined") {
    return initial;
  }

  const urlFilters = parseFiltersFromUrl(
    new URLSearchParams(window.location.search),
  );
  return { ...initial, ...urlFilters };
}

function PokemonListApp() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(
    new Set([]),
  );
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") ?? "";
  });
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return new URLSearchParams(window.location.search).getAll("difficulty");
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const resetVisibleCount = () => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  };

  const [filters, setFilters] = useState<FilterState>(createInitialFilters);

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sortParam = params.get("sortBy") as SortOption | null;

      if (sortParam) return sortParam;

      return (
        (localStorage.getItem("pokedoku-sort") as SortOption) || "number-asc"
      );
    }
    return "number-asc";
  });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        setPokemon(data);
        setLoading(false);
        trackEvent("view_pokemon_list", { count: data.length });
      })
      .catch((err) => {
        console.error("Failed to load Pokemon:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("pokedoku-sort", sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const totalFilters = getActiveFilters(filters);
    if (totalFilters > 0) {
      const filterCounts: Record<string, number> = {};
      FILTER_CATEGORIES.forEach((cat) => {
        filterCounts[cat.key] = filters[cat.key]?.length ?? 0;
      });
      trackEvent("filter_change", { ...filterCounts, total: totalFilters });
    }

    const params = getFiltersForUrl(filters);
    const trimmedSearch = searchQuery.trim();

    if (trimmedSearch) params.set("search", trimmedSearch);
    else params.delete("search");

    params.delete("difficulty");
    difficultyFilter.forEach((value) => params.append("difficulty", value));

    if (sortBy) params.set("sortBy", sortBy);
    else params.delete("sortBy");

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [filters, sortBy, searchQuery, difficultyFilter]);

  const toggleFilter = (categoryKey: string, value: string) => {
    resetVisibleCount();
    setFilters((prev) => {
      const arr = prev[categoryKey] ?? [];
      const isRemoving = arr.includes(value);
      const newArr = isRemoving
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      trackEvent("toggle_filter", {
        category: categoryKey,
        value,
        action: isRemoving ? "remove" : "add",
        activeCount: newArr.length,
      });
      return { ...prev, [categoryKey]: newArr };
    });
  };

  const toggleFilterExpanded = (key: string) => {
    setExpandedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        trackEvent("collapse_filter", { category: key });
      } else {
        next.add(key);
        trackEvent("expand_filter", { category: key });
      }
      return next;
    });
  };

  const clearFilters = () => {
    const activeFilters = getActiveFilters(filters);
    const cleared: FilterState = {};
    FILTER_CATEGORIES.forEach((cat) => {
      cleared[cat.key] = [];
    });
    setFilters(cleared);
    setSearchQuery("");
    setDifficultyFilter([]);
    resetVisibleCount();
    setShowFilterDrawer(false);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    trackEvent("clear_filters", { count: activeFilters });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    resetVisibleCount();
    const column = newSort.startsWith("number") ? "number" : "difficulty";
    trackEvent("change_sort", { column, sort: newSort });
  };

  const toggleDifficulty = (diff: string) => {
    resetVisibleCount();
    setDifficultyFilter((prev) =>
      prev.includes(diff)
        ? prev.filter((d) => d !== diff)
        : [...prev, diff],
    );
  };

  const filteredPokemon = useMemo(() => {
    let result = applyFilters(pokemon, filters);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.types.some((t) => t?.toLowerCase().includes(query)) ||
          p.region?.toLowerCase().includes(query),
      );
    }

    if (difficultyFilter.length > 0) {
      result = result.filter(
        (p) => p.dexDifficulty && difficultyFilter.includes(p.dexDifficulty),
      );
    }

    return result;
  }, [pokemon, filters, searchQuery, difficultyFilter]);

  const handleCardClick = (p: Pokemon) => {
    const pokemonKeyId = p.formId ?? p.id;
    const slug = `${slugify(p.name)}-${pokemonKeyId}`;
    trackEvent("click_pokemon_detail", {
      name: p.name,
      id: p.id,
      form_id: p.formId,
      slug,
      from: "pokemon-list",
    });
    window.location.assign(`${import.meta.env.BASE_URL}pokemon/${slug}/`);
  };

  const sortedPokemon = useMemo(() => {
    const copy = [...filteredPokemon];
    if (sortBy === "number-asc") {
      return copy.sort((a, b) => a.id - b.id);
    } else if (sortBy === "number-desc") {
      return copy.sort((a, b) => b.id - a.id);
    } else if (sortBy === "difficulty-asc") {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return bPercentile - aPercentile;
      });
    } else if (sortBy === "difficulty-desc") {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return aPercentile - bPercentile;
      });
    }
    return copy;
  }, [filteredPokemon, sortBy]);

  const visiblePokemon = useMemo(
    () => sortedPokemon.slice(0, visibleCount),
    [sortedPokemon, visibleCount],
  );

  const hasActiveFilters =
    getActiveFilters(filters) + difficultyFilter.length > 0 ||
    searchQuery.trim().length > 0;

  useEffect(() => {
    if (!loadMoreRef.current || visibleCount >= sortedPokemon.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((prev) =>
          Math.min(prev + RENDER_BATCH_SIZE, sortedPokemon.length),
        );
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [sortedPokemon.length, visibleCount]);

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
        currentPage="pokemon-list"
      />

      <div className="controls-panel">

        <div className="filter-controls">
          <button
            onClick={() => setShowFilterDrawer(true)}
            className="filter-btn-main"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
            Filter{" "}
            {getActiveFilters(filters) + difficultyFilter.length > 0 && (
              <span className="filter-count">
                {getActiveFilters(filters) + difficultyFilter.length}
              </span>
            )}
          </button>
          <button
            onClick={clearFilters}
            className="filter-btn-secondary"
            disabled={!hasActiveFilters}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
            Clear filters
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, type, or region..."
            value={searchQuery}
            onChange={(e) => {
              resetVisibleCount();
              setSearchQuery(e.target.value);
            }}
            className="search-input"
          />
        </div>

        <div className="pokemon-list-filters">
          <div
            className={`filter-group ${expandedFilters.has("difficulty") ? "expanded" : ""}`}
          >
            <button
              className="filter-header"
              onClick={() => toggleFilterExpanded("difficulty")}
            >
              <span className="filter-label">Dex Difficulty</span>
              {difficultyFilter.length > 0 && (
                <span className="filter-count">{difficultyFilter.length}</span>
              )}
              <span className="filter-chevron">
                {expandedFilters.has("difficulty") ? "▼" : "▶"}
              </span>
            </button>
            <div className="filter-buttons">
              {Object.keys(DEX_DIFFICULTY_COLORS).map((diff) => (
                <button
                  key={diff}
                  className={`filter-btn ${difficultyFilter.includes(diff) ? "active" : ""}`}
                  style={{
                    backgroundColor: difficultyFilter.includes(diff)
                      ? DEX_DIFFICULTY_COLORS[diff]
                      : undefined,
                    borderColor: DEX_DIFFICULTY_COLORS[diff],
                    color: difficultyFilter.includes(diff)
                      ? "white"
                      : DEX_DIFFICULTY_COLORS[diff],
                  }}
                   onClick={() => toggleDifficulty(diff)}
                 >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {FILTER_CATEGORIES.map((cat) => {
            const isExpanded = expandedFilters.has(cat.key);
            const activeCount = filters[cat.key]?.length ?? 0;
            return (
              <div
                key={cat.key}
                className={`filter-group ${isExpanded ? "expanded" : ""}`}
              >
                <button
                  className="filter-header"
                  onClick={() => toggleFilterExpanded(cat.key)}
                >
                  <span className="filter-label">{cat.label}</span>
                  {activeCount > 0 && (
                    <span className="filter-count">{activeCount}</span>
                  )}
                  <span className="filter-chevron">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </button>
                <div className="filter-buttons">
                  {cat.options.map((opt) => {
                    const isActive = (filters[cat.key] ?? []).includes(
                      opt.name,
                    );
                    return (
                      <button
                        key={opt.name}
                        className={`filter-btn ${isActive ? "active" : ""}`}
                        style={
                          isActive && opt.color
                            ? {
                                backgroundColor: opt.color,
                                borderColor: opt.color,
                              }
                            : {}
                        }
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
      </div>

      <div className="my-6 h-1 bg-gradient-to-b from-black/10 to-transparent" />

      <div className="pokemon-list-header">
        <div className="sort-controls">
          <label className="sort-label">
            <span className="sort-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="sort-select-wrap">
              <select
                className="sort-select"
                aria-label="Sort Pokemon list"
                value={sortBy}
                onChange={(event) =>
                  handleSortChange(event.target.value as SortOption)
                }
              >
                <option value="number-asc">Pokemon # (low to high)</option>
                <option value="number-desc">Pokemon # (high to low)</option>
                <option value="difficulty-asc">Dex difficulty (hard to easy)</option>
                <option value="difficulty-desc">Dex difficulty (easy to hard)</option>
              </select>
              <span className="sort-select-arrow" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </label>
        </div>
        <div className="results-count">
          {sortedPokemon.length} of {pokemon.length} Pokemon
        </div>
      </div>

      {sortedPokemon.length === 0 && (
        <div className="no-results">
          <p>No Pokémon match the selected filters.</p>
        </div>
      )}

      <div className="pokemon-grid">
        {visiblePokemon.map((p) => {
          return (
            <PokemonCard
              key={`${p.id}-${p.name}`}
              pokemon={p}
              onClick={() => handleCardClick(p)}
            />
          );
        })}
      </div>

      {visibleCount < sortedPokemon.length && <div ref={loadMoreRef} aria-hidden="true" />}

      <Footer />

      {showFilterDrawer && (
        <>
          <div
            className="filter-drawer-overlay"
            onClick={() => setShowFilterDrawer(false)}
          />
          <div className="filter-drawer">
            <div className="filter-drawer-header">
              <span className="filter-drawer-title">Filters</span>
              <button
                className="filter-drawer-close"
                onClick={() => setShowFilterDrawer(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div className="filter-drawer-content">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search by name, type, or region..."
                  value={searchQuery}
                  onChange={(e) => {
                    resetVisibleCount();
                    setSearchQuery(e.target.value);
                  }}
                  className="search-input"
                />
              </div>

              <div className="filter-group expanded">
                <button
                  className="filter-header"
                  onClick={() => toggleFilterExpanded("difficulty")}
                >
                  <span className="filter-label">Dex Difficulty</span>
                  {difficultyFilter.length > 0 && (
                    <span className="filter-count">
                      {difficultyFilter.length}
                    </span>
                  )}
                </button>
                <div className="filter-buttons">
                  {Object.keys(DEX_DIFFICULTY_COLORS).map((diff) => (
                    <button
                      key={diff}
                      className={`filter-btn ${difficultyFilter.includes(diff) ? "active" : ""}`}
                      style={{
                        backgroundColor: difficultyFilter.includes(diff)
                          ? DEX_DIFFICULTY_COLORS[diff]
                          : undefined,
                        borderColor: DEX_DIFFICULTY_COLORS[diff],
                        color: difficultyFilter.includes(diff)
                          ? "white"
                          : DEX_DIFFICULTY_COLORS[diff],
                      }}
                      onClick={() => toggleDifficulty(diff)}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {FILTER_CATEGORIES.map((cat) => {
                const activeCount = filters[cat.key]?.length ?? 0;
                return (
                  <div key={cat.key} className="filter-group expanded">
                    <button
                      className="filter-header"
                      onClick={() => toggleFilterExpanded(cat.key)}
                    >
                      <span className="filter-label">{cat.label}</span>
                      {activeCount > 0 && (
                        <span className="filter-count">{activeCount}</span>
                      )}
                    </button>
                    <div className="filter-buttons">
                      {cat.options.map((opt) => {
                        const isActive = (filters[cat.key] ?? []).includes(
                          opt.name,
                        );
                        return (
                          <button
                            key={opt.name}
                            className={`filter-btn ${isActive ? "active" : ""}`}
                            style={
                              isActive && opt.color
                                ? {
                                    backgroundColor: opt.color,
                                    borderColor: opt.color,
                                  }
                                : {}
                            }
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
            <div className="filter-drawer-footer">
              <button onClick={clearFilters} className="clear-btn">
                Clear All
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PokemonListApp;
