import { describe, it, expect } from 'vitest';
import { matchesConstraint, type Constraint } from './utils/filters';
import type { Pokemon } from './utils/types';

const FIXTURE: Pokemon[] = [
  { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], region: 'Kanto', category: 'Starter', evolutionStage: 'First Stage' },
  { id: 2, name: 'Ivysaur', types: ['Grass', 'Poison'], region: 'Kanto', category: 'Starter', evolutionStage: 'Middle Stage', evolutionTrigger: ['Evolved by Level'] },
  { id: 3, name: 'Venusaur', types: ['Grass', 'Poison'], region: 'Kanto', category: 'Starter', evolutionStage: 'Final Stage', evolutionTrigger: ['Evolved by Level'] },
  { id: 4, name: 'Pikachu', types: ['Electric'], region: 'Kanto', evolutionStage: 'Middle Stage', evolutionTrigger: ['Evolved by Friendship', 'Evolved by Level'] },
  { id: 5, name: 'Raichu', types: ['Electric'], region: 'Kanto', evolutionStage: 'Final Stage', evolutionTrigger: ['Evolved by Item'] },
  { id: 6, name: 'Slowpoke', types: ['Water', 'Psychic'], region: 'Kanto', evolutionStage: 'First Stage', isBranched: true },
  { id: 7, name: 'Slowbro', types: ['Water', 'Psychic'], region: 'Kanto', evolutionStage: 'Final Stage', evolutionTrigger: ['Evolved by Level'] },
  { id: 8, name: 'Slowbro galar', types: ['Poison', 'Psychic'], region: 'Galar', evolutionStage: 'Final Stage', evolutionTrigger: ['Evolved by Item'] },
  { id: 9, name: 'Eevee', types: ['Normal'], region: 'Kanto', evolutionStage: 'First Stage', isBranched: true },
  { id: 10, name: 'Vulpix alola', types: ['Ice'], region: 'Alola', evolutionStage: 'First Stage' },
  { id: 11, name: 'Zoroark hisui', types: ['Normal', 'Ghost'], region: 'Hisui', evolutionStage: 'Final Stage' },
  { id: 12, name: 'Mewtwo', types: ['Psychic'], region: 'Kanto', category: 'Legendary', evolutionStage: 'No Evolution Line' },
  { id: 13, name: 'Mew', types: ['Psychic'], region: 'Kanto', category: 'Mythical', evolutionStage: 'No Evolution Line' },
  { id: 14, name: 'Nihilego', types: ['Rock', 'Poison'], region: 'Alola', category: 'Ultra Beast', evolutionStage: 'No Evolution Line' },
  { id: 15, name: 'Great Tusk', types: ['Ground', 'Fighting'], region: 'Paldea', category: 'Paradox', evolutionStage: 'No Evolution Line' },
  { id: 16, name: 'Omastar', types: ['Rock', 'Water'], region: 'Kanto', category: 'Fossil', evolutionStage: 'Final Stage' },
  { id: 17, name: 'Pichu', types: ['Electric'], region: 'Johto', category: 'Baby', evolutionStage: 'First Stage' },
  { id: 18, name: 'Charizard gmax', types: ['Fire', 'Flying'], region: 'Kanto', specialForm: 'Gigantamax' },
  { id: 19, name: 'Charizard mega x', types: ['Fire', 'Dragon'], region: 'Kanto', specialForm: 'Mega Evolution' },
  { id: 20, name: 'Kadabra', types: ['Psychic'], region: 'Kanto', evolutionStage: 'Middle Stage', evolutionTrigger: ['Evolved by Trade'] },
];

function filterBy(constraint: Constraint | null): Pokemon[] {
  return FIXTURE.filter((p) => matchesConstraint(p, constraint));
}

describe('constraint filtering', () => {
  describe('type constraints', () => {
    it('supports elemental type filters', () => {
      const names = filterBy({ category: 'type', value: 'Ghost' }).map((p) => p.name);
      expect(names).toContain('Zoroark hisui');
      expect(names).not.toContain('Bulbasaur');
    });

    it('supports monotype and dualtype', () => {
      const mono = filterBy({ category: 'type', value: 'Monotype' }).map((p) => p.name);
      const dual = filterBy({ category: 'type', value: 'Dualtype' }).map((p) => p.name);
      expect(mono).toContain('Pikachu');
      expect(mono).not.toContain('Bulbasaur');
      expect(dual).toContain('Bulbasaur');
      expect(dual).toContain('Zoroark hisui');
    });
  });

  describe('evolution triggers', () => {
    it('supports level, item, trade, and friendship triggers', () => {
      expect(filterBy({ category: 'evolution', value: 'Evolved by Level' }).map((p) => p.name)).toContain('Slowbro');
      expect(filterBy({ category: 'evolution', value: 'Evolved by Item' }).map((p) => p.name)).toContain('Slowbro galar');
      expect(filterBy({ category: 'evolution', value: 'Evolved by Trade' }).map((p) => p.name)).toContain('Kadabra');
      expect(filterBy({ category: 'evolution', value: 'Evolved by Friendship' }).map((p) => p.name)).toContain('Pikachu');
    });
  });

  describe('categories', () => {
    it('supports base categories', () => {
      expect(filterBy({ category: 'category', value: 'Legendary' }).map((p) => p.name)).toContain('Mewtwo');
      expect(filterBy({ category: 'category', value: 'Mythical' }).map((p) => p.name)).toContain('Mew');
      expect(filterBy({ category: 'category', value: 'Ultra Beast' }).map((p) => p.name)).toContain('Nihilego');
      expect(filterBy({ category: 'category', value: 'Paradox' }).map((p) => p.name)).toContain('Great Tusk');
      expect(filterBy({ category: 'category', value: 'Fossil' }).map((p) => p.name)).toContain('Omastar');
      expect(filterBy({ category: 'category', value: 'Baby' }).map((p) => p.name)).toContain('Pichu');
    });

    it('maps First Partner to Starter and supports special forms', () => {
      expect(filterBy({ category: 'category', value: 'First Partner' }).map((p) => p.name)).toContain('Bulbasaur');
      expect(filterBy({ category: 'category', value: 'Gigantamax' }).map((p) => p.name)).toContain('Charizard gmax');
      expect(filterBy({ category: 'category', value: 'Mega Evolution' }).map((p) => p.name)).toContain('Charizard mega x');
    });
  });

  describe('regional and evolution-state constraints', () => {
    it('supports region filters', () => {
      expect(filterBy({ category: 'region', value: 'Galar' }).map((p) => p.name)).toContain('Slowbro galar');
      expect(filterBy({ category: 'region', value: 'Alola' }).map((p) => p.name)).toContain('Vulpix alola');
      expect(filterBy({ category: 'region', value: 'Hisui' }).map((p) => p.name)).toContain('Zoroark hisui');
    });

    it('supports stage and branched evolution filters', () => {
      const firstStage = filterBy({ category: 'evolution', value: 'First Stage' }).map((p) => p.name);
      const notFully = filterBy({ category: 'evolution', value: 'Not Fully Evolved' }).map((p) => p.name);
      const branched = filterBy({ category: 'evolution', value: 'Branched evolution' }).map((p) => p.name);
      expect(firstStage).toContain('Bulbasaur');
      expect(notFully).toContain('Bulbasaur');
      expect(notFully).toContain('Ivysaur');
      expect(notFully).not.toContain('Venusaur');
      expect(branched).toContain('Eevee');
      expect(branched).toContain('Slowpoke');
    });
  });

  describe('edge behavior', () => {
    it('returns all pokemon for null constraint and none for unknown value', () => {
      expect(filterBy(null)).toHaveLength(FIXTURE.length);
      expect(filterBy({ category: 'type', value: 'Definitely Not Real' })).toHaveLength(0);
    });
  });
});
