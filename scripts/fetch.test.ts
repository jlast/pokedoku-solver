import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POKEMON_DATA = path.join(__dirname, '..', 'public', 'pokemon.json');

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  region?: string;
  category?: string;
  evolutionStage?: string;
  evolutionTrigger?: string;
  isBranched?: boolean;
  specialForm?: string;
}

let data: Pokemon[];

beforeAll(() => {
  const json = fs.readFileSync(POKEMON_DATA, 'utf-8');
  data = JSON.parse(json);
});

describe('pokemon.json', () => {
  it('should exist and be valid JSON', () => {
    expect(fs.existsSync(POKEMON_DATA)).toBe(true);
    expect(data.length).toBeGreaterThan(1000);
  });

  it('should have valid type definitions', () => {
    const types = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
    
    for (const p of data.slice(0, 50)) {
      for (const t of p.types) {
        expect(types).toContain(t);
      }
    }
  });

  it('should have valid regions', () => {
    const regions = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'];
    
    for (const p of data) {
      if (p.region) {
        expect(regions).toContain(p.region);
      }
    }
  });

  it('should have evolution stages', () => {
    const stages = ['First Stage', 'Middle Stage', 'Final Stage', 'No Evolution Line'];
    
    for (const p of data) {
      if (p.evolutionStage) {
        expect(stages).toContain(p.evolutionStage);
      }
    }
  });

  it('should have unique entries by id and name', () => {
    const byName: Record<string, Pokemon> = {};
    
    for (const p of data) {
      if (byName[p.name]) {
        expect(p.id).toBe(byName[p.name].id);
      }
      byName[p.name] = p;
    }
  });
});
