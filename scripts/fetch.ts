import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  REGION_BY_ID,
  STARTER_IDS,
  ULTRA_BEASTS,
  FOSSIL_IDS,
  PARADOX_POKEMON,
  IGNORED_FORM_IDS,
  IGNORED_FORMS,
  CANT_EVOLVE_FORMS,
  IGNORE_SPECIAL_FORMS,
  NAME_REPLACEMENTS,
  IGNORE_EVOLVE_FORMS,
  POKEMON_OVERRIDES,
} from "./ids";
import { fetchWithRetry, delay, ensureFileExists } from "./lib";
import {
  loadPokemon,
  loadForm,
  loadSpecies,
  loadChain,
  loadPokemonList,
  savePokemonList,
  loadSpeciesList,
  saveSpeciesList,
  loadFormsList,
  saveFormsList,
  savePokemon,
  saveSpecies,
  saveForm,
  saveChain,
} from "./lib/cache";
import { getEvolutionStage } from "./lib/evolution";
import type {
  PokeAPIPokemon,
  PokeAPIForm,
  PokeAPISpecies,
  EvolutionNode,
} from "./lib/types";
import { type Pokemon, type PokemonType, type DexDifficulty, type PokemonCategory, type InternalPokemon, type PokemonLearnedMove, POKEMON_LEARNED_MOVES } from "@pokedoku-helper/shared-types";
import { CUSTOM_POKEMON } from "./custom_pokemon";
import { getMoveOverridesForFormId } from './move_overrides';

const NO_CACHE = process.argv.includes("--no-cache");

const POKEMON_API_BASE = "https://pokeapi.co/api/v2";
const REQUEST_DELAY = 100;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, "..", "public", "data", "pokemon.json");

function toMoveSlug(moveLabel: string): string {
  return moveLabel.toLowerCase().replace(/\s+/g, "-");
}

function extractTrackedMoves(pokemon: PokeAPIPokemon): PokemonLearnedMove[] {
  const learnedMoveSet = new Set(pokemon.moves.map((entry) => entry.move.name));
  const trackedMoves = POKEMON_LEARNED_MOVES.filter((moveLabel) =>
    learnedMoveSet.has(toMoveSlug(moveLabel)),
  );

  return trackedMoves;
}

function applyMoveOverrides(entry: InternalPokemon): void {
  if (!entry.formId) return;
  const overrideMoves = getMoveOverridesForFormId(entry.formId);
  if (!overrideMoves || overrideMoves.length === 0) return;

  const currentMoves = entry.learnedMoves ?? [];
  const mergedMoves = new Set<PokemonLearnedMove>([...currentMoves, ...overrideMoves]);
  entry.learnedMoves = [...mergedMoves];
}

function getAllCategories(pokemon: InternalPokemon): string[] {
  const categories: string[] = [];

  for (const type of pokemon.types) {
    if (type) categories.push(type);
  }

  const typeCount = pokemon.types.filter((t) => t).length;
  if (typeCount === 1) categories.push("Monotype");
  else if (typeCount === 2) categories.push("Dualtype");

  if (pokemon.region && pokemon.region !== "Unknown")
    categories.push(pokemon.region);
  if (pokemon.evolutionStage) categories.push(pokemon.evolutionStage);
  if (
    pokemon.evolutionStage === "First Stage" ||
    pokemon.evolutionStage === "Middle Stage"
  )
    categories.push("not fully evolved");
  if (pokemon.evolutionTrigger) categories.push(...pokemon.evolutionTrigger);
  if (pokemon.isBranched) categories.push("branched");
  if (pokemon.categories?.length) categories.push(...pokemon.categories);

  return categories;
}

function addPokemonCategory(entry: InternalPokemon, category: PokemonCategory): void {
  if (!entry.categories) entry.categories = [];
  if (!entry.categories.includes(category)) entry.categories.push(category);
}

function calculateDexDifficulties(pokemonList: InternalPokemon[]): Pokemon[] {
  const combinationCounts: Record<string, number> = {};

  for (const pokemon of pokemonList) {
    const categories = getAllCategories(pokemon);
    const pairs = getCategoryPairs(categories);
    for (const pair of pairs) {
      combinationCounts[pair] = (combinationCounts[pair] || 0) + 1;
    }
  }

  for (const key of Object.keys(combinationCounts)) {
    if (combinationCounts[key] <= 1) {
      delete combinationCounts[key];
    }
  }

  const scores: { pokemon: InternalPokemon; score: number }[] = [];

  for (const pokemon of pokemonList) {
    const categories = getAllCategories(pokemon);
    const pairs = getCategoryPairs(categories);

    let totalCompetition = 0;
    for (const pair of pairs) {
      const count = combinationCounts[pair] || 1;
      totalCompetition += count;
    }

    const rawScore = totalCompetition;

    scores.push({ pokemon, score: rawScore });
  }

  scores.sort((a, b) => b.score - a.score);

  const total = scores.length;
  const pokemon: Pokemon[] = [];
  for (let i = 0; i < total; i++) {
    const percentile = i / total;
    let grade: DexDifficulty;
    if (percentile < 0.4) grade = "Easy";
    else if (percentile < 0.7) grade = "Normal";
    else if (percentile < 0.9) grade = "Hard";
    else if (percentile < 0.98) grade = "Expert";
    else grade = "Nightmare";

    pokemon.push({
      ...scores[i].pokemon,
      dexDifficultyPercentile: Math.round(percentile * 1000)/1000,
      dexDifficulty: grade,
    })
  }
  return pokemon;
}

function getCategoryPairs(categories: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      pairs.push(`${categories[i]}+${categories[j]}`);
    }
  }
  return pairs;
}

function resolveOverriddenFormId(formId: number, formIdMap: Map<number, number>): number {
  let current = formId;
  const visited = new Set<number>();

  while (formIdMap.has(current) && !visited.has(current)) {
    visited.add(current);
    current = formIdMap.get(current)!;
  }

  return current;
}

function normalizeEvolutionPaths(pokemonList: InternalPokemon[]): void {
  const formIdMap = new Map<number, number>();
  for (const [sourceFormId, override] of Object.entries(POKEMON_OVERRIDES)) {
    if (typeof override.formId === "number") {
      formIdMap.set(Number(sourceFormId), override.formId);
    }
  }

  for (const pokemon of pokemonList) {
    if (!pokemon.evolution) continue;

    if (pokemon.evolution.from?.length) {
      pokemon.evolution.from = Array.from(
        new Set(pokemon.evolution.from.map((id) => resolveOverriddenFormId(id, formIdMap))),
      );
    }

    if (pokemon.evolution.to?.length) {
      pokemon.evolution.to = Array.from(
        new Set(pokemon.evolution.to.map((id) => resolveOverriddenFormId(id, formIdMap))),
      );
    }
  }
}

async function fetchPokemons() {
  console.log("Fetching Pokemon list...");
  let list = loadPokemonList();
  if (!list) {
    list = await fetchWithRetry<{ count: number; results: { url: string }[] }>(
      `${POKEMON_API_BASE}/pokemon?limit=100000&offset=0`,
    );
    if (!list) throw new Error("Failed to fetch list");
    savePokemonList(list);
  }

  const urls = list.results.map((r) => r.url);
  console.log(`Found ${urls.length} entries\n`);

  for (const url of urls) {
    const m = url.match(/\/pokemon\/(\d+)\/$/);
    if (!m) continue;
    const id = parseInt(m[1]);

    if (NO_CACHE || !loadPokemon(id)) {
      const p = await fetchWithRetry<PokeAPIPokemon>(url, 2);
      if (p) {
        savePokemon(id, p);
      } else {
        console.log(`  ${id}: failed`);
      }
      await delay(REQUEST_DELAY);
    }
  }
}

async function fetchSpecies() {
  let speciesList = loadSpeciesList();
  if (!speciesList) {
    speciesList = await fetchWithRetry<{
      count: number;
      results: { url: string }[];
    }>(`${POKEMON_API_BASE}/pokemon-species?limit=100000&offset=0`);
    if (!speciesList) throw new Error("Failed to fetch species list");
    saveSpeciesList(speciesList);
  }

  const speciesUrls = speciesList.results.map((r) => r.url);
  console.log(`Found ${speciesUrls.length} species entries\n`);

  for (const url of speciesUrls) {
    const m = url.match(/species\/(\d+)$/);
    if (!m) continue;
    const id = parseInt(m[1]);

    if (NO_CACHE || !loadSpecies(id)) {
      const s = await fetchWithRetry<PokeAPISpecies>(url, 2);
      if (s) {
        saveSpecies(id, s);

        if (s.evolution_chain?.url) {
          const cm = s.evolution_chain.url.match(/\/evolution-chain\/(\d+)\/$/);
          if (cm) {
            const chainId = parseInt(cm[1]);
            if (NO_CACHE || !loadChain(chainId)) {
              const c = await fetchWithRetry<{ chain: EvolutionNode }>(
                s.evolution_chain.url,
                2,
              );
              if (c) {
                saveChain(chainId, c.chain);
              }
            }
          }
        }
      }
      await delay(REQUEST_DELAY);
    }
  }
}

async function fetchForms() {
  console.log("Fetching Pokemon forms...");
  let list = loadFormsList();
  if (!list) {
    list = await fetchWithRetry<{ count: number; results: { url: string }[] }>(
      `${POKEMON_API_BASE}/pokemon-form?limit=100000&offset=0`,
    );
    if (!list) throw new Error("Failed to fetch list");
    saveFormsList(list);
  }

  const urls = list.results.map((r) => r.url);
  console.log(`Found ${urls.length} forms\n`);

  for (const url of urls) {
    const m = url.match(/\/pokemon-form\/(\d+)\/$/);
    if (!m) continue;
    const id = parseInt(m[1]);

    if (NO_CACHE || !loadForm(id)) {
      const p = await fetchWithRetry<PokeAPIForm>(url, 2);
      if (p) {
        saveForm(id, p);
      } else {
        console.log(`  ${id}: failed`);
      }
      await delay(REQUEST_DELAY);
    }
  }
}

function getEntry(
  formId: number,
  added: Set<number>,
): InternalPokemon | undefined {
  if (IGNORED_FORM_IDS.has(formId)) return;
  const form = loadForm(formId);
  if (!form) return;
  if (IGNORED_FORMS.has(form.form_name)) return;

  const pokemonMatch = form.pokemon.url.match(/\/pokemon\/(\d+)\/$/);
  if (!pokemonMatch) return;
  const id = parseInt(pokemonMatch[1]);
  const pokemon = loadPokemon(id);
  if (!pokemon) return;

  const speciesIdMatch = pokemon.species.url.match(
    /\/pokemon-species\/(\d+)\/$/,
  );
  if (!speciesIdMatch) return;
  const speciesId = parseInt(speciesIdMatch[1]);
  const species = loadSpecies(speciesId);
  if (!species) return;

  if (added.has(id) && IGNORE_SPECIAL_FORMS.has(species.name)) return;

  let name = IGNORE_SPECIAL_FORMS.has(species.name) ? species.name : form.name;
  name = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
  name = NAME_REPLACEMENTS[name] || name;

  const types = pokemon.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)) as
    | [PokemonType, PokemonType]
    | [PokemonType];

  const entry: InternalPokemon = {
    id: species.id,
    name,
    types,
    region: REGION_BY_ID[speciesId] || "Unknown",
    sprite: `/images/sprites/${form.id}.png`,
    formId,
  };

  const learnedMoves = extractTrackedMoves(pokemon);
  if (learnedMoves.length > 0) entry.learnedMoves = learnedMoves;

  if (ULTRA_BEASTS.has(id)) addPokemonCategory(entry, "Ultra Beast");
  else if (FOSSIL_IDS.has(id)) addPokemonCategory(entry, "Fossil");
  else if (STARTER_IDS.has(formId)) addPokemonCategory(entry, "First Partner");
  else if (PARADOX_POKEMON.has(id)) addPokemonCategory(entry, "Paradox");
  if (species) {
    if (species.is_legendary) addPokemonCategory(entry, "Legendary");
    if (species.is_mythical) addPokemonCategory(entry, "Mythical");
    if (species.is_baby) addPokemonCategory(entry, "Baby");

    if (
      !CANT_EVOLVE_FORMS.has(form.form_name) &&
      !IGNORE_EVOLVE_FORMS.has(form.form_name) &&
      species.evolution_chain?.url
    ) {
      const cm = species.evolution_chain.url.match(
        /\/evolution-chain\/(\d+)\/$/,
      );
      if (cm) {
        const chainId = parseInt(cm[1]);
        const chain = loadChain(chainId);
        if (chain && species.name) {
          const result = getEvolutionStage(chain, species.name);
          entry.evolutionStage = result.stage;
          if (result.trigger)
            entry.evolutionTrigger =
              result.trigger.length > 0 ? result.trigger : undefined;
          if (result.branched) entry.isBranched = true;

          const queue: EvolutionNode[] = [chain];
          let currentNode: EvolutionNode | undefined;
          let parentNode: EvolutionNode | undefined;
          while (queue.length > 0 && !currentNode) {
            const node = queue.shift();
            if (!node) break;
            if (node.species.name === species.name) {
              currentNode = node;
              break;
            }
            for (const child of node.evolves_to) {
              if (child.species.name === species.name) {
                parentNode = node;
              }
              queue.push(child);
            }
          }

          if (currentNode) {
            const fromFormId = parentNode?.species.url
              ? (() => {
                  const speciesMatch = parentNode.species.url.match(/\/pokemon-species\/(\d+)\/$/);
                  if (!speciesMatch) return undefined;
                  return parseInt(speciesMatch[1]);
                })()
              : undefined;

            const toFormIds = currentNode.evolves_to
              .map((node) => {
                const speciesMatch = node.species.url.match(/\/pokemon-species\/(\d+)\/$/);
                if (!speciesMatch) return undefined;
                return parseInt(speciesMatch[1]);
              })
              .filter((id): id is number => typeof id === "number");

            if (typeof fromFormId === "number" || toFormIds.length > 0) {
              entry.evolution = {
                ...(typeof fromFormId === "number" ? { from: [fromFormId] } : {}),
                ...(toFormIds.length > 0 ? { to: toFormIds } : {}),
              };
            }
          }
        }
      }
    } else if (!IGNORE_EVOLVE_FORMS.has(form.form_name)) {
      entry.evolutionStage = "No Evolution Line";
    }
  }

  if (form.is_mega) addPokemonCategory(entry, "Mega Evolution");
  if (form.form_name === "gmax") addPokemonCategory(entry, "Gigantamax");
  if (form.form_name.includes("alola")) entry.region = "Alola";
  if (form.form_name.includes("galar")) entry.region = "Galar";
  if (form.form_name.includes("hisui")) entry.region = "Hisui";
  if (form.form_name.includes("paldea")) entry.region = "Paldea";

  const formOverride = POKEMON_OVERRIDES[formId];
  if (formOverride) {
    if (formOverride.formId) entry.formId = formOverride.formId;
    if (formOverride.types) entry.types = formOverride.types;
    if (formOverride.region) entry.region = formOverride.region;
    if (formOverride.evolution?.from) {
      entry.evolution = {...entry.evolution, from: formOverride.evolution.from };
    }
    if (formOverride.evolution?.to) {
      entry.evolution = {...entry.evolution, to: formOverride.evolution.to };
    }
    if(formOverride.evolution?.from?.length === 0) delete entry.evolution?.from;
    if(formOverride.evolution?.to?.length === 0) delete entry.evolution?.to;
    if(!entry.evolution?.from && !entry.evolution?.to) delete entry.evolution;
    if (formOverride.evolutionStage)
      entry.evolutionStage = formOverride.evolutionStage;
    if (formOverride.evolutionTrigger)
      entry.evolutionTrigger = formOverride.evolutionTrigger;
    if (formOverride.isBranched !== undefined)
      entry.isBranched = formOverride.isBranched;
    if (formOverride.categories?.length) {
      entry.categories = formOverride.categories;
    }
    if (formOverride.sprite) entry.sprite = formOverride.sprite;
  }
  if(!formOverride?.sprite) {
    ensureFileExists('public/images/sprites', `${form.id}.png`, form?.sprites?.front_default);
  }

  applyMoveOverrides(entry);

  return entry;
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.mkdirSync(path.join(__dirname, "..", "public", "images", "sprites"), { recursive: true });

  await fetchPokemons();
  await fetchSpecies();
  await fetchForms();

  console.log("\nProcessing...");
  const output: InternalPokemon[] = [];
  const added = new Set<number>();

  for (let formId = 1; formId <= 10553; formId++) {
    const entry = getEntry(formId, added);
    if (entry) {
      output.push(entry);
      added.add(entry.id);
    }
  }

  output.push(...CUSTOM_POKEMON);
  normalizeEvolutionPaths(output);
  output.sort((a, b) => a.id - b.id);

  console.log("Calculating Dex difficulties...");
  const pokemonResult = calculateDexDifficulties(output);
  
  console.log(`Total: ${pokemonResult.length} Pokemon`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemonResult, null, 2));
  console.log(`Written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
