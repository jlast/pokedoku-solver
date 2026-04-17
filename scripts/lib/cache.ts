import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ensureDir } from '../lib';
import type { PokeAPIPokemon, PokeAPIForm, PokeAPISpecies, EvolutionNode } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '.cache');
const POKEMON_CACHE_DIR = path.join(CACHE_DIR, 'pokemon');
const SPECIES_CACHE_DIR = path.join(CACHE_DIR, 'species');
const CHAIN_CACHE_DIR = path.join(CACHE_DIR, 'chains');
const POKEMON_FORM_CACHE_DIR = path.join(CACHE_DIR, 'forms');
const POKEMON_LIST_FILE = path.join(CACHE_DIR, 'pokemon-list.json');
const SPECIES_LIST_FILE = path.join(CACHE_DIR, 'species-list.json');
const FORMS_LIST_FILE = path.join(CACHE_DIR, 'forms-list.json');

export { POKEMON_CACHE_DIR, SPECIES_CACHE_DIR, CHAIN_CACHE_DIR, POKEMON_FORM_CACHE_DIR };

const NO_CACHE = process.argv.includes('--no-cache');

export function loadPokemon(id: number): PokeAPIPokemon | null {
  if (NO_CACHE) return null;
  const f = path.join(POKEMON_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

export function savePokemon(id: number, data: PokeAPIPokemon) {
  if (NO_CACHE) return;
  ensureDir(POKEMON_CACHE_DIR);
  fs.writeFileSync(path.join(POKEMON_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

export function loadForm(id: number): PokeAPIForm | null {
  if (NO_CACHE) return null;
  const f = path.join(POKEMON_FORM_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

export function saveForm(id: number, data: PokeAPIForm) {
  if (NO_CACHE) return;
  ensureDir(POKEMON_FORM_CACHE_DIR);
  fs.writeFileSync(path.join(POKEMON_FORM_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

export function loadSpecies(id: number): PokeAPISpecies | null {
  if (NO_CACHE) return null;
  const f = path.join(SPECIES_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

export function saveSpecies(id: number, data: PokeAPISpecies) {
  if (NO_CACHE) return;
  ensureDir(SPECIES_CACHE_DIR);
  fs.writeFileSync(path.join(SPECIES_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

export function loadChain(id: number): EvolutionNode | null {
  if (NO_CACHE) return null;
  const f = path.join(CHAIN_CACHE_DIR, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

export function saveChain(id: number, data: EvolutionNode) {
  if (NO_CACHE) return;
  ensureDir(CHAIN_CACHE_DIR);
  fs.writeFileSync(path.join(CHAIN_CACHE_DIR, `${id}.json`), JSON.stringify(data));
}

export function savePokemonList(data: { count: number; results: { url: string }[] }) {
  if (NO_CACHE) return;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(POKEMON_LIST_FILE, JSON.stringify(data));
}

export function saveSpeciesList(data: { count: number; results: { url: string }[] }) {
  if (NO_CACHE) return;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(SPECIES_LIST_FILE, JSON.stringify(data));
}

export function saveFormsList(data: { count: number; results: { url: string }[] }) {
  if (NO_CACHE) return;
  ensureDir(CACHE_DIR);
  fs.writeFileSync(FORMS_LIST_FILE, JSON.stringify(data));
}

export function loadPokemonList(): { count: number; results: { url: string }[] } | null {
  if (NO_CACHE) return null;
  if (fs.existsSync(POKEMON_LIST_FILE)) {
    try { return JSON.parse(fs.readFileSync(POKEMON_LIST_FILE, 'utf-8')); } catch {}
  }
  return null;
}

export function loadSpeciesList(): { count: number; results: { url: string }[] } | null {
  if (NO_CACHE) return null;
  if (fs.existsSync(SPECIES_LIST_FILE)) {
    try { return JSON.parse(fs.readFileSync(SPECIES_LIST_FILE, 'utf-8')); } catch {}
  }
  return null;
}

export function loadFormsList(): { count: number; results: { url: string }[] } | null {
  if (NO_CACHE) return null;
  if (fs.existsSync(FORMS_LIST_FILE)) {
    try { return JSON.parse(fs.readFileSync(FORMS_LIST_FILE, 'utf-8')); } catch {}
  }
  return null;
}
