import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { REGION_BY_ID, STARTER_IDS, ULTRA_BEASTS, FOSSIL_IDS } from './ids';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'pokemon.json');
const POKEMON_CACHE_DIR = path.join(__dirname, '.cache', 'pokemon');
const SPECIES_CACHE_DIR = path.join(__dirname, '.cache', 'species');
const CHAIN_CACHE_DIR = path.join(__dirname, '.cache', 'chains');

function loadJson(dir: string, id: number) {
  const f = path.join(dir, `${id}.json`);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  }
  return null;
}

interface EvolutionNode {
  species: { name: string };
  evolves_to: EvolutionNode[];
}

function getEvolutionStage(chain: EvolutionNode, name: string): string {
  function find(node: EvolutionNode, n: string): EvolutionNode | null {
    if (node.species.name === n) return node;
    for (const nxt of node.evolves_to) {
      const f = find(nxt, n);
      if (f) return f;
    }
    return null;
  }
  function ancestors(node: EvolutionNode, n: string): EvolutionNode[] {
    const a: EvolutionNode[] = [];
    function search(nd: EvolutionNode): boolean {
      if (nd.species.name === n) return true;
      for (const nxt of nd.evolves_to) {
        if (search(nxt)) { a.push(nd); return true; }
      }
      return false;
    }
    search(node);
    return a;
  }
  const node = find(chain, name);
  if (!node) return 'No Evolution Line';
  const to = node.evolves_to.length > 0;
  const from = ancestors(chain, name).length > 0;
  if (!from && !to) return 'No Evolution Line';
  if (!from && to) return 'First Stage';
  if (from && !to) return 'Final Stage';
  return 'Middle Stage';
}

function process() {
  console.log('Processing from cache...');
  
  const pokemonFiles = fs.readdirSync(POKEMON_CACHE_DIR).filter(f => f.endsWith('.json')).map(f => parseInt(f.replace('.json', '')));
  console.log(`Found ${pokemonFiles.length} Pokemon\n`);
  
  const output: any[] = [];
  const added = new Set<number>();
  
  for (const id of pokemonFiles.sort((a, b) => a - b)) {
    if (added.has(id)) continue;
    
    const p = loadJson(POKEMON_CACHE_DIR, id);
    if (!p || !p.types) continue;
    added.add(id);
    
    const types = p.types.sort((a: any, b: any) => a.slot - b.slot).map((t: any) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1));
    
    const entry: any = {
      id,
      name: p.name.charAt(0).toUpperCase() + p.name.slice(1).replace(/-/g, ' '),
      types,
      region: REGION_BY_ID[id] || 'Unknown',
    };
    
    if (ULTRA_BEASTS.has(id)) entry.category = 'Ultra Beast';
    else if (FOSSIL_IDS.has(id)) entry.category = 'Fossil';
    else if (STARTER_IDS.has(id)) entry.category = 'Starter';
    
    const s = loadJson(SPECIES_CACHE_DIR, id);
    if (s) {
      if (s.is_legendary) entry.category = 'Legendary';
      if (s.is_mythical) entry.category = 'Mythical';
      if (s.is_baby) entry.category = 'Baby';
      
      if (s.evolution_chain?.url) {
        const m = s.evolution_chain.url.match(/\/evolution-chain\/(\d+)/);
        if (m) {
          const chainId = parseInt(m[1]);
          const chain = loadJson(CHAIN_CACHE_DIR, chainId) as EvolutionNode;
          if (chain && s.name) {
            entry.evolutionMethod = getEvolutionStage(chain, s.name);
          }
        }
      }
    }
    
    output.push(entry);
  }
  
  output.sort((a, b) => a.id - b.id);
  console.log(`Total: ${output.length} Pokemon`);
  
  const withEvo = output.filter(p => p.evolutionMethod).length;
  console.log(`With evolution method: ${withEvo}`);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Written to ${OUTPUT_FILE}`);
}

process();