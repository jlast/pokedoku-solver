import { describe, it, expect } from 'vitest';
import { matchesConstraint, parseConstraintFromParam, findConstraintOption, formatDate } from './utils';
import type { EvolutionMethod, Pokemon } from './types';

const mockPokemon: Pokemon = {
  id: 6,
  name: 'Charizard',
  types: ['Fire', 'Flying'],
  region: 'Kanto',
  category: 'Legendary',
  evolutionStage: 'Final Stage',
  evolutionTrigger: ['Evolved by Level'],
  isBranched: false,
  sprite: 'https://example.com/charizard.png',
};

const mockMonotypePokemon: Pokemon = {
  id: 9,
  name: 'Blastoise',
  types: ['Water'],
  region: 'Kanto',
  category: 'Starter',
  evolutionStage: 'Final Stage',
  evolutionTrigger: ['Evolved by Level'],
  isBranched: false,
};

const mockBranchedPokemon: Pokemon = {
  id: 133,
  name: 'Eevee',
  types: ['Normal'],
  region: 'Kanto',
  category: 'Starter',
  evolutionStage: 'First Stage',
  evolutionTrigger: ['Evolved by Level'],
  isBranched: true,
};

const mockMegaPokemon: Pokemon = {
  id: 10071,
  name: 'Charizard mega x',
  types: ['Fire', 'Dragon'],
  region: 'Kanto',
  specialForm: 'Mega Evolution',
};

describe('matchesConstraint', () => {
  describe('type constraints', () => {
    it('should match Fire type', () => {
      const constraint = { value: 'Fire', category: 'type' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should not match non-existing type', () => {
      const constraint = { value: 'Water', category: 'type' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });

    it('should match secondary type', () => {
      const constraint = { value: 'Flying', category: 'type' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });
  });

  describe('typeline constraints', () => {
    it('should match Monotype constraint for single type Pokemon', () => {
      const constraint = { value: 'Monotype', category: 'typeline' as const };
      expect(matchesConstraint(mockMonotypePokemon, constraint)).toBe(true);
    });

    it('should not match Monotype constraint for dual type Pokemon', () => {
      const constraint = { value: 'Monotype', category: 'typeline' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });

    it('should match Dualtype constraint for dual type Pokemon', () => {
      const constraint = { value: 'Dualtype', category: 'typeline' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should not match Dualtype constraint for single type Pokemon', () => {
      const constraint = { value: 'Dualtype', category: 'typeline' as const };
      expect(matchesConstraint(mockMonotypePokemon, constraint)).toBe(false);
    });
  });

  describe('region constraints', () => {
    it('should match Kanto region', () => {
      const constraint = { value: 'Kanto', category: 'region' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should not match different region', () => {
      const constraint = { value: 'Johto', category: 'region' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });
  });

  describe('evolution constraints', () => {
    it('should match Final Stage', () => {
      const constraint = { value: 'Final Stage', category: 'evolution' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should not match First Stage for Final Stage Pokemon', () => {
      const constraint = { value: 'First Stage', category: 'evolution' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });

    it('should match First Stage for branched Pokemon', () => {
      const constraint = { value: 'First Stage', category: 'evolution' as const };
      expect(matchesConstraint(mockBranchedPokemon, constraint)).toBe(true);
    });

    it('should match Not Fully Evolved for First Stage Pokemon', () => {
      const constraint = { value: 'Not Fully Evolved', category: 'evolution' as const };
      expect(matchesConstraint(mockBranchedPokemon, constraint)).toBe(true);
    });

    it('should match Not Fully Evolved for Middle Stage Pokemon', () => {
      const middleStagePokemon = { ...mockPokemon, evolutionStage: 'Middle Stage' as EvolutionMethod };
      const constraint = { value: 'Not Fully Evolved', category: 'evolution' as const };
      expect(matchesConstraint(middleStagePokemon, constraint)).toBe(true);
    });

    it('should not match Not Fully Evolved for Final Stage Pokemon', () => {
      const constraint = { value: 'Not Fully Evolved', category: 'evolution' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });

    it('should not match Not Fully Evolved for Pokemon with No Evolution Line', () => {
      const noEvolutionPokemon = { ...mockPokemon, evolutionStage: 'No Evolution Line' as EvolutionMethod };
      const constraint = { value: 'Not Fully Evolved', category: 'evolution' as const };
      expect(matchesConstraint(noEvolutionPokemon, constraint)).toBe(false);
    });
  });

  describe('trigger constraints', () => {
    it('should match Evolved by Level', () => {
      const constraint = { value: 'Evolved by Level', category: 'trigger' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should not match Evolved by Item when not in triggers', () => {
      const constraint = { value: 'Evolved by Item', category: 'trigger' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });

    it('should return false for Pokemon without evolutionTrigger', () => {
      const noTriggerPokemon = { ...mockPokemon, evolutionTrigger: undefined };
      const constraint = { value: 'Evolved by Level', category: 'trigger' as const };
      expect(matchesConstraint(noTriggerPokemon, constraint)).toBe(false);
    });
  });

  describe('branched constraints', () => {
    it('should match Yes for branched Pokemon', () => {
      const constraint = { value: 'Yes', category: 'branched' as const };
      expect(matchesConstraint(mockBranchedPokemon, constraint)).toBe(true);
    });

    it('should not match Yes for non-branched Pokemon', () => {
      const constraint = { value: 'Yes', category: 'branched' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });

    it('should match No for non-branched Pokemon', () => {
      const constraint = { value: 'No', category: 'branched' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should match No for branched Pokemon', () => {
      const constraint = { value: 'No', category: 'branched' as const };
      expect(matchesConstraint(mockBranchedPokemon, constraint)).toBe(false);
    });

    it('should treat undefined isBranched as false', () => {
      const pokemonNoBranched = { ...mockPokemon, isBranched: undefined };
      const constraintYes = { value: 'Yes', category: 'branched' as const };
      const constraintNo = { value: 'No', category: 'branched' as const };
      expect(matchesConstraint(pokemonNoBranched, constraintYes)).toBe(false);
      expect(matchesConstraint(pokemonNoBranched, constraintNo)).toBe(true);
    });
  });

  describe('form constraints', () => {
    it('should match Mega Evolution form', () => {
      const constraint = { value: 'Mega Evolution', category: 'form' as const };
      expect(matchesConstraint(mockMegaPokemon, constraint)).toBe(true);
    });

    it('should not match Gigantamax for Mega Pokemon', () => {
      const constraint = { value: 'Gigantamax', category: 'form' as const };
      expect(matchesConstraint(mockMegaPokemon, constraint)).toBe(false);
    });
  });

  describe('category constraints', () => {
    it('should match Legendary category', () => {
      const constraint = { value: 'Legendary', category: 'category' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(true);
    });

    it('should match Starter category', () => {
      const constraint = { value: 'Starter', category: 'category' as const };
      expect(matchesConstraint(mockMonotypePokemon, constraint)).toBe(true);
    });

    it('should not match different category', () => {
      const constraint = { value: 'Mythical', category: 'category' as const };
      expect(matchesConstraint(mockPokemon, constraint)).toBe(false);
    });
  });

  describe('null constraint', () => {
    it('should return true for null constraint', () => {
      expect(matchesConstraint(mockPokemon, null)).toBe(true);
    });
  });
});

describe('parseConstraintFromParam', () => {
  it('should parse valid constraint value', () => {
    const result = parseConstraintFromParam('Fire');
    expect(result).not.toBeNull();
    expect(result?.value).toBe('Fire');
    expect(result?.category).toBe('type');
  });

  it('should parse constraint by label (case insensitive)', () => {
    const result = parseConstraintFromParam('fire');
    expect(result).not.toBeNull();
    expect(result?.value).toBe('Fire');
  });

  it('should return null for invalid constraint', () => {
    const result = parseConstraintFromParam('InvalidConstraint');
    expect(result).toBeNull();
  });

  it('should parse typeline constraint', () => {
    const result = parseConstraintFromParam('Monotype');
    expect(result).not.toBeNull();
    expect(result?.category).toBe('typeline');
  });

  it('should parse region constraint', () => {
    const result = parseConstraintFromParam('Kanto');
    expect(result).not.toBeNull();
    expect(result?.category).toBe('region');
  });

  it('should parse evolution constraint', () => {
    const result = parseConstraintFromParam('First Stage');
    expect(result).not.toBeNull();
    expect(result?.category).toBe('evolution');
  });
});

describe('findConstraintOption', () => {
  it('should find constraint option by value', () => {
    const result = findConstraintOption('Fire');
    expect(result).not.toBeNull();
    expect(result?.value).toBe('Fire');
  });

  it('should return null for non-existent option', () => {
    const result = findConstraintOption('NonExistent');
    expect(result).toBeNull();
  });

  it('should find evolution option', () => {
    const result = findConstraintOption('First Stage');
    expect(result).not.toBeNull();
  });

  it('should find category option', () => {
    const result = findConstraintOption('Legendary');
    expect(result).not.toBeNull();
  });
});

describe('formatDate', () => {
  it('should format date as short month and day', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('Jan 15');
  });

  it('should handle different months', () => {
    expect(formatDate('2024-06-01')).toBe('Jun 1');
    expect(formatDate('2024-12-25')).toBe('Dec 25');
  });

  it('should handle single digit days', () => {
    const result = formatDate('2024-03-05');
    expect(result).toBe('Mar 5');
  });
});
