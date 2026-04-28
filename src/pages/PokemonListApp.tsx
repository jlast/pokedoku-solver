import { useState, useMemo, useEffect } from "react";
import type { Pokemon } from "../utils/types";
import { TYPE_COLORS, DEX_DIFFICULTY_COLORS } from "../utils/constants";
import {
  FILTER_CATEGORIES,
  parseFiltersFromUrl,
  getActiveFilters,
  getFiltersForUrl,
  applyFilters,
} from "../utils/filters";
import type { FilterState } from "../utils/filters";
import { trackEvent } from "../utils/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import "./App.css";
import "../index.css";

type SortOption =
  | "number-asc"
  | "number-desc"
  | "difficulty-desc"
  | "difficulty-asc";

function PokemonListApp() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(
    new Set([]),
  );
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = {};
    FILTER_CATEGORIES.forEach((cat) => {
      initial[cat.key] = [];
    });
    const urlFilters = parseFiltersFromUrl(
      new URLSearchParams(window.location.search),
    );
    return { ...initial, ...urlFilters };
  });

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
    fetch(`${import.meta.env.BASE_URL}pokemon.json?t=${Date.now()}`)
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
    if (sortBy) params.set("sortBy", sortBy);
    else params.delete("sortBy");

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [filters, sortBy]);

  const toggleFilter = (categoryKey: string, value: string) => {
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
    setShowFilterDrawer(false);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    trackEvent("clear_filters", { count: activeFilters });
  };

  const sortByColumn = (column: "number" | "difficulty") => {
    const newSort =
      column === "number"
        ? sortBy === "number-asc"
          ? "number-desc"
          : "number-asc"
        : sortBy === "difficulty-asc"
          ? "difficulty-desc"
          : "difficulty-asc";
    setSortBy(newSort as SortOption);
    trackEvent("change_sort", { column, sort: newSort });
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

  const getPokemonCategories = (
    p: Pokemon,
  ): { label: string; name: string; color?: string }[] => {
    const categories: { label: string; name: string; color?: string }[] = [];
    for (const cat of FILTER_CATEGORIES) {
      for (const opt of cat.options) {
        if (opt.filter(p)) {
          categories.push({
            label: cat.label,
            name: opt.name,
            color: opt.color,
          });
        }
      }
    }
    return categories;
  };

  const handleCardClick = (p: Pokemon) => {
    if (flippedCardId === `${p.id}-${p.name}`) {
      setFlippedCardId(null);
      trackEvent("select_pokemon", { name: p.name, action: "unflip" });
    } else {
      const categoryCount = getPokemonCategories(p).length;
      setFlippedCardId(`${p.id}-${p.name}`);
      trackEvent("select_pokemon", {
        name: p.name,
        id: p.id,
        action: "flip",
        category_count: categoryCount,
      });
    }
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
            Filters{" "}
            {getActiveFilters(filters) + difficultyFilter.length > 0 && (
              <span className="filter-count">
                {getActiveFilters(filters) + difficultyFilter.length}
              </span>
            )}
          </button>
          <button onClick={clearFilters} className="filter-btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
            Clear
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, type, or region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  onClick={() => {
                    setDifficultyFilter((prev) =>
                      prev.includes(diff)
                        ? prev.filter((d) => d !== diff)
                        : [...prev, diff],
                    );
                  }}
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

      <div className="header-divider" />

      <div className="pokemon-list-header">
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === "number-asc" || sortBy === "number-desc" ? "active" : ""}`}
            onClick={() => sortByColumn("number")}
          >
            Number{" "}
            {sortBy === "number-asc"
              ? "▲"
              : sortBy === "number-desc"
                ? "▼"
                : "▲"}
          </button>
          <button
            className={`sort-btn ${sortBy === "difficulty-asc" || sortBy === "difficulty-desc" ? "active" : ""}`}
            onClick={() => sortByColumn("difficulty")}
          >
            Dex Difficulty{" "}
            {sortBy === "difficulty-asc"
              ? "▲"
              : sortBy === "difficulty-desc"
                ? "▼"
                : "▲"}
          </button>
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
        {sortedPokemon.map((p) => {
          const isFlipped = flippedCardId === `${p.id}-${p.name}`;
          return (
            <div
              key={`${p.id}-${p.name}`}
              className={isFlipped ? "pokemon-card flipped" : "pokemon-card"}
              onClick={() => handleCardClick(p)}
            >
              {isFlipped ? (
                <div className="pokemon-card-back">
                  <div style={{ fontSize: "0.8rem", textAlign: "center" }}>
                    {getPokemonCategories(p).map((cat, i) => (
                      <span
                        key={i}
                        className="category-badge"
                        style={{
                          backgroundColor: cat.color,
                          display: "inline-block",
                          margin: "2px",
                        }}
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
                          backgroundColor:
                            DEX_DIFFICULTY_COLORS[p.dexDifficulty],
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                      onClick={() => {
                        setDifficultyFilter((prev) =>
                          prev.includes(diff)
                            ? prev.filter((d) => d !== diff)
                            : [...prev, diff],
                        );
                      }}
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
