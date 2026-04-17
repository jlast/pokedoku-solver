import { describe, it, expect } from 'vitest';
import { findNode, getAncestors, getTriggerMethods, getEvolutionStage } from './evolution';
import type { EvolutionNode } from './types';

const mockChain: EvolutionNode = {
  species: { name: 'bulbasaur', url: '' },
  evolves_to: [
    {
      species: { name: 'ivysaur', url: '' },
      evolves_to: [
        {
          species: { name: 'venusaur', url: '' },
          evolves_to: [],
          evolution_details: [],
        },
      ],
      evolution_details: [
        { trigger: { name: 'level-up', url: '' }, min_level: 16, min_affection: null, min_happiness: null },
      ],
    },
  ],
  evolution_details: [],
};

const mockBranchedChain: EvolutionNode = {
  species: { name: 'eevee', url: '' },
  evolves_to: [
    { species: { name: 'vaporeon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'water-stone', url: '' } }] },
    { species: { name: 'jolteon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'thunder-stone', url: '' } }] },
    { species: { name: 'flareon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'fire-stone', url: '' } }] },
    { species: { name: 'espeon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'level-up', url: '' }, min_happiness: 160 }] },
    { species: { name: 'umbreon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'level-up', url: '' }, min_happiness: 160 }] },
    { species: { name: 'leafeon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'leaf-stone', url: '' } }] },
    { species: { name: 'glaceon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'ice-stone', url: '' } }] },
    { species: { name: 'sylveon', url: '' }, evolves_to: [], evolution_details: [{ trigger: { name: 'level-up', url: '' }, min_affection: 2 }] },
  ],
  evolution_details: [],
};

const mockTradeChain: EvolutionNode = {
  species: { name: 'abra', url: '' },
  evolves_to: [
    {
      species: { name: 'kadabra', url: '' },
      evolves_to: [
        {
          species: { name: 'alakazam', url: '' },
          evolves_to: [],
          evolution_details: [
            { trigger: { name: 'trade', url: '' }, held_item: null, min_level: null, min_affection: null, min_happiness: null },
          ],
        },
      ],
      evolution_details: [
        { trigger: { name: 'level-up', url: '' }, min_level: 16, held_item: null, min_affection: null, min_happiness: null },
      ],
    },
  ],
  evolution_details: [],
};

const mockNoEvolutionChain: EvolutionNode = {
  species: { name: 'ditto', url: '' },
  evolves_to: [],
  evolution_details: [],
};

describe('evolution', () => {
  describe('findNode', () => {
    it('should find the root node', () => {
      const result = findNode(mockChain, 'bulbasaur');
      expect(result).not.toBeNull();
      expect(result?.species.name).toBe('bulbasaur');
    });

    it('should find a middle evolution', () => {
      const result = findNode(mockChain, 'ivysaur');
      expect(result).not.toBeNull();
      expect(result?.species.name).toBe('ivysaur');
    });

    it('should find a final evolution', () => {
      const result = findNode(mockChain, 'venusaur');
      expect(result).not.toBeNull();
      expect(result?.species.name).toBe('venusaur');
    });

    it('should return null for non-existent species', () => {
      const result = findNode(mockChain, 'pikachu');
      expect(result).toBeNull();
    });
  });

  describe('getAncestors', () => {
    it('should return empty array for root node', () => {
      const result = getAncestors(mockChain, 'bulbasaur');
      expect(result).toHaveLength(0);
    });

    it('should return ancestors for middle evolution', () => {
      const result = getAncestors(mockChain, 'ivysaur');
      expect(result).toHaveLength(1);
      expect(result[0].species.name).toBe('bulbasaur');
    });

    it('should return all ancestors for final evolution', () => {
      const result = getAncestors(mockChain, 'venusaur');
      expect(result).toHaveLength(2);
      expect(result.map(a => a.species.name)).toContain('bulbasaur');
      expect(result.map(a => a.species.name)).toContain('ivysaur');
    });
  });

  describe('getTriggerMethods', () => {
    it('should return empty for node without details', () => {
      const node: EvolutionNode = { species: { name: 'test', url: '' }, evolves_to: [] };
      const result = getTriggerMethods(node);
      expect(result).toEqual([]);
    });

    it('should return Evolved by Level for level-up without item', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [{ trigger: { name: 'level-up', url: '' }, min_level: 16, min_affection: null, min_happiness: null }],
      };
      const result = getTriggerMethods(node);
      expect(result).toContain('Evolved by Level');
    });

    it('should return Evolved by Item for level-up with item', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [{ trigger: { name: 'level-up', url: '' }, item: { name: 'water-stone', url: '' } }],
      };
      const result = getTriggerMethods(node);
      expect(result).toContain('Evolved by Item');
    });

    it('should return Evolved by Friendship for level-up with happiness', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [{ trigger: { name: 'level-up', url: '' }, min_happiness: 160 }],
      };
      const result = getTriggerMethods(node);
      expect(result).toContain('Evolved by Friendship');
    });

    it('should return Evolved by Trade for trade without held item', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [{ trigger: { name: 'trade', url: '' } }],
      };
      const result = getTriggerMethods(node);
      expect(result).toContain('Evolved by Trade');
    });

    it('should return both Evolved by Item and Evolved by Trade for trade with held item', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [{ trigger: { name: 'trade', url: '' }, held_item: { name: 'metal-coat', url: '' } }],
      };
      const result = getTriggerMethods(node);
      expect(result).toContain('Evolved by Item');
      expect(result).toContain('Evolved by Trade');
    });

    it('should return Evolved by Item for use-item trigger', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'water-stone', url: '' } }],
      };
      const result = getTriggerMethods(node);
      expect(result).toContain('Evolved by Item');
    });

    it('should return unique triggers only', () => {
      const node: EvolutionNode = {
        species: { name: 'test', url: '' },
        evolves_to: [],
        evolution_details: [
          { trigger: { name: 'level-up', url: '' }, item: { name: 'water-stone', url: '' } },
          { trigger: { name: 'use-item', url: '' }, item: { name: 'water-stone', url: '' } },
        ],
      };
      const result = getTriggerMethods(node);
      expect(result).toEqual(['Evolved by Item']);
    });
  });

  describe('getEvolutionStage', () => {
    it('should identify first stage Pokemon', () => {
      const result = getEvolutionStage(mockChain, 'bulbasaur');
      expect(result.stage).toBe('First Stage');
      expect(result.branched).toBe(false);
    });

    it('should identify middle stage Pokemon', () => {
      const result = getEvolutionStage(mockChain, 'ivysaur');
      expect(result.stage).toBe('Middle Stage');
      expect(result.branched).toBe(false);
    });

    it('should identify final stage Pokemon', () => {
      const result = getEvolutionStage(mockChain, 'venusaur');
      expect(result.stage).toBe('Final Stage');
      expect(result.branched).toBe(false);
    });

    it('should identify branched first stage (Eevee)', () => {
      const result = getEvolutionStage(mockBranchedChain, 'eevee');
      expect(result.stage).toBe('First Stage');
      expect(result.branched).toBe(true);
    });

    it('should return No Evolution Line for Pokemon with no evolutions', () => {
      const result = getEvolutionStage(mockNoEvolutionChain, 'ditto');
      expect(result.stage).toBe('No Evolution Line');
      expect(result.trigger).toEqual([]);
      expect(result.branched).toBe(false);
    });

    it('should return No Evolution Line for non-existent species', () => {
      const result = getEvolutionStage(mockChain, 'pikachu');
      expect(result.stage).toBe('No Evolution Line');
    });

    it('should get evolution triggers for middle stage', () => {
      const result = getEvolutionStage(mockChain, 'ivysaur');
      expect(result.trigger).toContain('Evolved by Level');
    });

    it('should get evolution triggers for final stage', () => {
      const result = getEvolutionStage(mockChain, 'venusaur');
      expect(result.trigger).toEqual([]);
    });

    it('should identify trade evolution chain stages', () => {
      const abraResult = getEvolutionStage(mockTradeChain, 'abra');
      expect(abraResult.stage).toBe('First Stage');

      const kadabraResult = getEvolutionStage(mockTradeChain, 'kadabra');
      expect(kadabraResult.stage).toBe('Middle Stage');
      expect(kadabraResult.trigger).toContain('Evolved by Level');

      const alakazamResult = getEvolutionStage(mockTradeChain, 'alakazam');
      expect(alakazamResult.stage).toBe('Final Stage');
      expect(alakazamResult.trigger).toContain('Evolved by Trade');
    });
  });
});
