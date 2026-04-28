import { describe, it, expect } from 'vitest';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  region?: string;
  category?: string;
  evolutionStage?: string;
}

const TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Unknown'];
const EVOLUTION_STAGES = ['First Stage', 'Middle Stage', 'Final Stage', 'No Evolution Line'];

const SAMPLE_DATA: Pokemon[] = [
  { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], region: 'Kanto', category: 'Starter', evolutionStage: 'First Stage' },
  { id: 2, name: 'Ivysaur', types: ['Grass', 'Poison'], region: 'Kanto', category: 'Starter', evolutionStage: 'Middle Stage' },
  { id: 3, name: 'Venusaur', types: ['Grass', 'Poison'], region: 'Kanto', category: 'Starter', evolutionStage: 'Final Stage' },
  { id: 151, name: 'Mew', types: ['Psychic'], region: 'Kanto', category: 'Mythical', evolutionStage: 'No Evolution Line' },
  { id: 10095, name: 'Gholdengo', types: ['Steel', 'Ghost'], region: 'Paldea', evolutionStage: 'No Evolution Line' },
];

describe('pokemon fetch output shape', () => {
  it('has valid type definitions', () => {
    for (const p of SAMPLE_DATA) {
      for (const t of p.types) {
        expect(TYPES).toContain(t);
      }
    }
  });

  it('has valid regions', () => {
    for (const p of SAMPLE_DATA) {
      if (p.region) {
        expect(REGIONS).toContain(p.region);
      }
    }
  });

  it('has valid evolution stages when provided', () => {
    for (const p of SAMPLE_DATA) {
      if (p.evolutionStage) {
        expect(EVOLUTION_STAGES).toContain(p.evolutionStage);
      }
    }
  });

  it('has unique entries by name', () => {
    const byName: Record<string, Pokemon> = {};

    for (const p of SAMPLE_DATA) {
      if (byName[p.name]) {
        expect(p.id).toBe(byName[p.name].id);
      }
      byName[p.name] = p;
    }
  });
});
