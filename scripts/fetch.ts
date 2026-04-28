import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { REGION_BY_ID, STARTER_IDS, ULTRA_BEASTS, FOSSIL_IDS, PARADOX_POKEMON, IGNORED_FORM_IDS, IGNORED_FORMS, CANT_EVOLVE_FORMS } from './ids';
import { fetchWithRetry } from './lib';
import type { EvolutionMethod, Pokemon, PokemonType } from '../src/types';
import { CUSTOM_POKEMON } from './custom_pokemon';

const NO_CACHE = process.argv.includes('--no-cache');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const POKEMON_API_BASE = 'https://pokeapi.co/api/v2';
const REQUEST_DELAY = 100;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'pokemon.json');
const CACHE_DIR = path.join(__dirname, '.cache');
const POKEMON_CACHE_DIR = path.join(CACHE_DIR, 'pokemon');
const SPECIES_CACHE_DIR = path.join(CACHE_DIR, 'species');
const CHAIN_CACHE_DIR = path.join(CACHE_DIR, 'chains');
const POKEMON_FORM_CACHE_DIR = path.join(CACHE_DIR, 'forms');
const POKEMON_LIST_FILE = path.join(CACHE_DIR, 'pokemon-list.json');
const SPECIES_LIST_FILE = path.join(CACHE_DIR, 'species-list.json');
const FORMS_LIST_FILE = path.join(CACHE_DIR, 'forms-list.json');

interface PokeAPIType {
  slot: number;
  type: { name: string; url: string };
}

interface PokeAPIPokemon {
  species: {
    url: string;
    name: string;
  };
  id: number;
  name: string;
  types: PokeAPIType[];
}

interface PokeAPIForm {
  form_name: string;
  pokemon: {
    url: string;
    name: string;
  };
  id: number;
  name: string;
is_mega: boolean;
}

interface PokeAPISpecies {
  id: number;
  name: string;
  is_baby: boolean;
  is_mythical: boolean;
  is_legendary: boolean;
  is_mega: boolean;
  evolution_chain?: { url: string } | null;
}

interface EvolutionDetail {
  trigger: { name: string; url: string };
  item?: { name: string; url: string } | null;
  min_level?: number | null;
  min_affection?: number | null;
  min_happiness?: number | null;
  gender?: number | null;
}

interface EvolutionNode {
  species: { name: string; url: string };
  evolves_to: EvolutionNode[];
  evolution_details?: EvolutionDetail[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function loadPokemon(id: number): PokeAPIPokemon | null {
  if (NO_CACHE) return null;
  const f = path.join(POKEMON_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

function savePokemon(id: number, data: PokeAPIPokemon) {
  if (NO_CACHE) return;
  ensureDir(POKEMON_CACHE_DIR);
  fs.writeFileSync(path.join(POKEMON_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}


function loadForm(id: number): PokeAPIForm | null {
  if (NO_CACHE) return null;
  const f = path.join(POKEMON_FORM_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

function saveForm(id: number, data: PokeAPIForm) {
  if (NO_CACHE) return;
  ensureDir(POKEMON_FORM_CACHE_DIR);
  fs.writeFileSync(path.join(POKEMON_FORM_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

function loadSpecies(id: number): PokeAPISpecies | null {
  if (NO_CACHE) return null;
  const f = path.join(SPECIES_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

function saveSpecies(id: number, data: PokeAPISpecies) {
  if (NO_CACHE) return;
  ensureDir(SPECIES_CACHE_DIR);
  fs.writeFileSync(path.join(SPECIES_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

function loadChain(id: number): EvolutionNode | null {
  if (NO_CACHE) return null;
  const f = path.join(CHAIN_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

function saveChain(id: number, data: EvolutionNode) {
  if (NO_CACHE) return;
  ensureDir(CHAIN_CACHE_DIR);
  fs.writeFileSync(path.join(CHAIN_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

function loadPokemonList(): { count: number; results: { url: string; }[]; } | null {
  if (NO_CACHE) return null;
  if (fs.existsSync(POKEMON_LIST_FILE)) {
    try { return JSON.parse(fs.readFileSync(POKEMON_LIST_FILE, 'utf-8')); } catch {}
  }
  return null;
}

function savePokemonList(data: { count: number; results: { url: string; }[]; }) {
  if (NO_CACHE) return;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(POKEMON_LIST_FILE, JSON.stringify(data));
}

function loadSpeciesList(): { count: number; results: { url: string; }[]; } | null {
  if (NO_CACHE) return null;
  if (fs.existsSync(SPECIES_LIST_FILE)) {
    try { return JSON.parse(fs.readFileSync(SPECIES_LIST_FILE, 'utf-8')); } catch {}
  }
  return null;
}

function saveSpeciesList(data: { count: number; results: { url: string; }[]; }) {
  if (NO_CACHE) return;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(SPECIES_LIST_FILE, JSON.stringify(data));
}

function loadFormsList(): { count: number; results: { url: string; }[]; } | null {
  if (NO_CACHE) return null;
  if (fs.existsSync(FORMS_LIST_FILE)) {
    try { return JSON.parse(fs.readFileSync(FORMS_LIST_FILE, 'utf-8')); } catch {}
  }
  return null;
}

function saveFormsList(data: { count: number; results: { url: string; }[]; }) {
  if (NO_CACHE) return;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(FORMS_LIST_FILE, JSON.stringify(data));
}

function getEvolutionStage(chain: EvolutionNode, speciesName: string): { stage: EvolutionMethod; trigger: string | null; branched: boolean } {
  function findNode(node: EvolutionNode, name: string): EvolutionNode | null {
    if (node.species.name === name) return node;
    for (const n of node.evolves_to) {
      const f = findNode(n, name);
      if (f) return f;
    }
    return null;
  }
  
  function getAncestors(node: EvolutionNode, name: string): EvolutionNode[] {
    const ancestors: EvolutionNode[] = [];
    function search(n: EvolutionNode): boolean {
      if (n.species.name === name) return true;
      for (const nxt of n.evolves_to) {
        if (search(nxt)) { ancestors.push(n); return true; }
      }
      return false;
    }
    search(node);
    return ancestors;
  }
  
  function getTriggerMethod(node: EvolutionNode): string | null {
    // Check if node has evolution_details with trigger info
    if (node.evolution_details && node.evolution_details.length > 0) {
      const details = node.evolution_details[0];
      if (details.trigger) {
        const triggerName = details.trigger.name;
        if (triggerName === 'level-up') {
          if (details.item) return 'Evolved by Item';
          if (details.min_affection !== null || details.min_happiness !== null) return 'Evolved by Friendship';
          return 'Evolved by Level';
        }
        if (triggerName === 'trade') return 'Evolved by Trade';
        if (triggerName === 'use-item') return 'Evolved by Item';
        if (triggerName === 'shed') return 'Evolved by Item';
        if (triggerName === 'aggression') return 'Evolved by Friendship';
        if (triggerName === 'spin') return 'Evolved by Level';
        if (triggerName === 'tower-of-darkness') return 'Evolved by Item';
        if (triggerName === 'tower-of-waters') return 'Evolved by Item';
        if (triggerName === 'three-critical-hits') return 'Evolved by Level';
        if (triggerName === 'trade-s') return 'Evolved by Trade';
        if (triggerName === 'get-gift') return 'Evolved by Item';
        if (triggerName === 'get-gmail') return 'Evolved by Item';
      }
    }
    return null;
  }
  
  const node = findNode(chain, speciesName);
  if (!node) return { stage: 'No Evolution Line', trigger: null, branched: false };
  const hasTo = node.evolves_to.length > 0;
  const ancestors = getAncestors(chain, speciesName);
  const hasFrom = ancestors.length > 0;
  
  let trigger: string | null = null;
  
  // Check for trigger-based evolution
  if (hasFrom || hasTo) {
    // Find the evolution_details leading to this node or from this node
    for (const anc of ancestors) {
      for (const evo of anc.evolves_to) {
        if (evo.species.name === speciesName && evo.evolution_details && evo.evolution_details.length > 0) {
          trigger = getTriggerMethod(evo);
        }
      }
    }
  }
  
  let stage: EvolutionMethod;
  let branched = false;
  if (!hasFrom && !hasTo) {
    return { stage: 'No Evolution Line', trigger: null, branched: false };
  }
  else if (!hasFrom && hasTo) {
    // Set branched if more than 1 evolution target
    if (node.evolves_to.length > 1) {
      branched = true;
    }
    stage = 'First Stage';
  }
  else if (hasFrom && !hasTo) stage = 'Final Stage';
  else {
    stage = 'Middle Stage';
    // Check if middle stage has multiple evolutions (branched)
    if (node.evolves_to.length > 1) {
      branched = true;
    }
  }
  
  return { stage, trigger, branched };
}

async function fetchPokemons() {
  console.log('Fetching Pokemon list...');
  let list = loadPokemonList();
  if (!list) {
    list = await fetchWithRetry<{ count: number; results: { url: string; }[]; }>(`${POKEMON_API_BASE}/pokemon?limit=100000&offset=0`);
    if (!list) throw new Error('Failed to fetch list');
    savePokemonList(list);
  }

  const urls = list.results.map(r => r.url);
  console.log(`Found ${urls.length} entries\n`);

  for (const url of urls) {
    const m = url.match(/\/pokemon\/(\d+)\/$/);
    if (!m) continue;
    const id = parseInt(m[1]);

    if (!loadPokemon(id)) {
      const p = await fetchWithRetry<PokeAPIPokemon>(url, 2);
      if (p) { savePokemon(id, p); console.log(`  ${id}: ${p.name}`); }
      else { console.log(`  ${id}: failed`); }
      await delay(REQUEST_DELAY);
    }
  }
}

async function fetchSpecies() {
  let speciesList = loadSpeciesList();
  if (!speciesList) {
    speciesList = await fetchWithRetry<{ count: number; results: { url: string; }[]; }>(`${POKEMON_API_BASE}/pokemon-species?limit=100000&offset=0`);
    if (!speciesList) throw new Error('Failed to fetch species list');
    saveSpeciesList(speciesList);
  }

  const speciesUrls = speciesList.results.map(r => r.url);
  console.log(`Found ${speciesUrls.length} species entries\n`);

  for (const url of speciesUrls) {
    const m = url.match(/species\/(\d+)$/);
    if (!m) continue;
    const id = parseInt(m[1]);

    if (!loadSpecies(id)) {
      const s = await fetchWithRetry<PokeAPISpecies>(url, 2);
      if (s) {
        saveSpecies(id, s);
        console.log(`  species ${id}: ${s.name}`);

        if (s.evolution_chain?.url) {
          const cm = s.evolution_chain.url.match(/\/evolution-chain\/(\d+)\/$/);
          if (cm) {
            const chainId = parseInt(cm[1]);
            if (!loadChain(chainId)) {
              const c = await fetchWithRetry<{ chain: EvolutionNode; }>(s.evolution_chain.url, 2);
              if (c) { saveChain(chainId, c.chain); console.log(`    chain ${chainId}`); }
            }
          }
        }
      }
      await delay(REQUEST_DELAY);
    }
  }
}


async function fetchForms() {
  console.log('Fetching Pokemon forms...');
  let list = loadFormsList();
  if (!list) {
    list = await fetchWithRetry<{ count: number; results: { url: string; }[]; }>(`${POKEMON_API_BASE}/pokemon-form?limit=100000&offset=0`);
    if (!list) throw new Error('Failed to fetch list');
    saveFormsList(list);
  }

  const urls = list.results.map(r => r.url);
  console.log(`Found ${urls.length} forms\n`);

  for (const url of urls) {
    const m = url.match(/\/pokemon-form\/(\d+)\/$/);
    if (!m) continue;
    const id = parseInt(m[1]);

    if (!loadForm(id)) {
      const p = await fetchWithRetry<PokeAPIForm>(url, 2);
      if (p) { saveForm(id, p); console.log(`  ${id}: ${p.name}`); }
      else { console.log(`  ${id}: failed`); }
      await delay(REQUEST_DELAY);
    }
  }
}

async function main() {
  await fetchPokemons();
  await fetchSpecies();
  await fetchForms();
  
  console.log('\nProcessing...');
  const output: Pokemon[] = [];
  const added = new Set<number>();
  
  
  for (let formId = 1; formId <= 10553; formId++) {
    if(IGNORED_FORM_IDS.has(formId)) continue;
    const form = loadForm(formId);
    if(!form) continue;
    if(IGNORED_FORMS.has(form.form_name)) continue;

    const pokemonMatch = form.pokemon.url.match(/\/pokemon\/(\d+)\/$/);
    if (!pokemonMatch) continue;
    const id = parseInt(pokemonMatch[1]);
    const pokemon = loadPokemon(id);
    if (!pokemon) continue;
    
    const speciesIdMatch = pokemon.species.url.match(/\/pokemon-species\/(\d+)\/$/);
    if (!speciesIdMatch) continue;
    const speciesId = parseInt(speciesIdMatch[1]);
    const species = loadSpecies(speciesId);
    if (!species) continue;
    
    if (added.has(id)) continue;
    added.add(id);
    
    const types = pokemon.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)) as [PokemonType, PokemonType?] | [PokemonType];
    
    const entry: Pokemon = {
      id: species.id,
      name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1).replace(/-/g, ' '),
      types,
      region: REGION_BY_ID[speciesId] || 'Unknown',
    };
    
    if (ULTRA_BEASTS.has(id)) entry.category = 'Ultra Beast';
    else if (FOSSIL_IDS.has(id)) entry.category = 'Fossil';
    else if (STARTER_IDS.has(formId)) entry.category = 'Starter';
    else if (PARADOX_POKEMON.has(id)) entry.category = 'Paradox';
    if (species) {
      if (species.is_legendary) entry.category = 'Legendary';
      if (species.is_mythical) entry.category = 'Mythical';
      if (species.is_baby) entry.category = 'Baby';
      
      if (!CANT_EVOLVE_FORMS.has(form.form_name) && species.evolution_chain?.url) {
        const cm = species.evolution_chain.url.match(/\/evolution-chain\/(\d+)\/$/);
        if (cm) {
          const chainId = parseInt(cm[1]);
          const chain = loadChain(chainId);
          if (chain && species.name) {
            const result = getEvolutionStage(chain, species.name);
            entry.evolutionStage = result.stage;
            if (result.trigger) entry.evolutionTrigger = result.trigger as any;
            if (result.branched) entry.isBranched = true;
          }
        }
      } else {
        entry.evolutionStage = 'No Evolution Line';
      }
    }

    if(form.is_mega) entry.specialForm = 'Mega Evolution';
    if(form.form_name === 'gmax') entry.specialForm = 'Gigantamax';
    if(form.form_name.includes('alola')) entry.region = 'Alola';
    if(form.form_name.includes('galar')) entry.region = 'Galar';
    if(form.form_name.includes('hisui')) entry.region = 'Hisui';
    if(form.form_name.includes('paldea')) entry.region = 'Paldea';
    
    console.log(entry.id, entry.name);
    
    output.push(entry);
  }

  
  output.push(...CUSTOM_POKEMON);
  output.sort((a, b) => a.id - b.id);
  
  // Known true branched: Eevee and Kirlia (multiple evolutions in same game)
  // Known NOT branched: form variants have regional-specific evolutions
  const knownBranched = ['Eevee', 'Kirlia'].join('|');
  const knownNotBranched = ['Meowth', 'Slowpoke', 'Wooper', 'Sneasel', 'Tyrogue', 'Wurmple', 'Nincada'].join('|');
  output.forEach(function(p) {
    if (p.evolutionStage === 'First Stage') {
      if (p.isBranched && knownNotBranched.includes(p.name.split(' ')[0])) {
        p.isBranched = false;
      }
      if (!p.isBranched && knownBranched.includes(p.name.split(' ')[0])) {
        p.isBranched = true;
      }
    }
  });
  
  console.log(`Total: ${output.length} Pokemon`);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
