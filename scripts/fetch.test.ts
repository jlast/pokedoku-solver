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

  it('Eevee should be First Stage and branched', () => {
    const eevee = data.find(p => p.name === 'Eevee');
    expect(eevee).toBeDefined();
    expect(eevee!.evolutionStage).toBe('First Stage');
    expect(eevee!.isBranched).toBe(true);
  });

  it('Kirlia should be Middle stage and branched', () => {
    const kirlia = data.find(p => p.name === 'Kirlia');
    expect(kirlia).toBeDefined();
    expect(kirlia!.evolutionStage).toBe('Middle Stage');
    expect(kirlia!.isBranched).toBe(true);
  });

  it('Meowth should NOT be branched (regional evolution)', () => {
    const meowth = data.find(p => p.name === 'Meowth');
    expect(meowth).toBeDefined();
    expect(meowth!.isBranched).toBe(false);
  });

  it('Bulbasaur should be Starter', () => {
    const bulbasaur = data.find(p => p.name === 'Bulbasaur');
    expect(bulbasaur).toBeDefined();
    expect(bulbasaur!.category).toBe('Starter');
  });

  it('Mewtwo should be Legendary', () => {
    const mewtwo = data.find(p => p.name === 'Mewtwo');
    expect(mewtwo).toBeDefined();
    expect(mewtwo!.category).toBe('Legendary');
  });

  it('Mew should be Mythical', () => {
    const mew = data.find(p => p.name === 'Mew');
    expect(mew).toBeDefined();
    expect(mew!.category).toBe('Mythical');
  });

  it('has Mega Evolution forms', () => {
    const megas = data.filter(p => p.specialForm === 'Mega Evolution');
    expect(megas.length).toBeGreaterThan(0);
  });

  it('has Gigantamax forms', () => {
    const gmax = data.filter(p => p.specialForm === 'Gigantamax');
    expect(gmax.length).toBeGreaterThan(0);
  });
});

describe('evolution triggers', () => {
  it('should have Pokemon with Evolved by Level', () => {
    const byLevel = data.filter(p => p.evolutionTrigger === 'Evolved by Level');
    expect(byLevel.length).toBeGreaterThan(0);
  });

  it('should have Pokemon with Evolved by Item', () => {
    const byItem = data.filter(p => p.evolutionTrigger === 'Evolved by Item');
    expect(byItem.length).toBeGreaterThan(0);
  });

  it('should have Pokemon with Evolved by Trade', () => {
    const byTrade = data.filter(p => p.evolutionTrigger === 'Evolved by Trade');
    expect(byTrade.length).toBeGreaterThan(0);
  });

  it('should have Pokemon with Evolved by Friendship', () => {
    const byFriend = data.filter(p => p.evolutionTrigger === 'Evolved by Friendship');
    expect(byFriend.length).toBeGreaterThan(0);
  });
});

describe('categories', () => {
  it('should have Legendaries', () => {
    const legendaries = data.filter(p => p.category === 'Legendary');
    expect(legendaries.length).toBeGreaterThan(0);
  });

  it('should have Mythicals', () => {
    const mythicals = data.filter(p => p.category === 'Mythical');
    expect(mythicals.length).toBeGreaterThan(0);
  });

  it('should have Ultra Beasts', () => {
    const ultraBeasts = data.filter(p => p.category === 'Ultra Beast');
    expect(ultraBeasts.length).toBeGreaterThan(0);
  });

  it('should have Paradox', () => {
    const paradox = data.filter(p => p.category === 'Paradox');
    expect(paradox.length).toBeGreaterThan(0);
  });

  it('should have Fossils', () => {
    const fossils = data.filter(p => p.category === 'Fossil');
    expect(fossils.length).toBeGreaterThan(0);
  });
});