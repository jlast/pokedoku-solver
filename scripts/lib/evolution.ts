import type { EvolutionNode } from './types';
import type { EvolutionMethod, EvolutionTrigger } from '../../src/utils/types';

export function findNode(node: EvolutionNode, name: string): EvolutionNode | null {
  if (node.species.name === name) return node;
  for (const n of node.evolves_to) {
    const f = findNode(n, name);
    if (f) return f;
  }
  return null;
}

export function getAncestors(node: EvolutionNode, name: string): EvolutionNode[] {
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

export function getTriggerMethods(node: EvolutionNode): EvolutionTrigger[] {
  if (!node.evolution_details || node.evolution_details.length === 0) {
    return [];
  }

  const triggers: EvolutionTrigger[] = [];
  for (const details of node.evolution_details) {
    if (details?.trigger) {
      const triggerName = details.trigger.name;
      if (triggerName === 'level-up') {
        if (details.item || details.held_item) {
          triggers.push('Evolved by Item');
        } else if (details.min_affection !== null || details.min_happiness !== null) {
          triggers.push('Evolved by Friendship');
        } else {
          triggers.push('Evolved by Level');
        }
      } else if (triggerName === 'trade') {
        if (details.held_item) {
          triggers.push('Evolved by Item');
          triggers.push('Evolved by Trade');
        } else {
          triggers.push('Evolved by Trade');
        }
      } else if (triggerName === 'use-item') {
        triggers.push('Evolved by Item');
      } else if (
        triggerName === 'shed' ||
        triggerName === 'recoil-damage' ||
        triggerName === 'use-move' ||
        triggerName === 'three-defeated-bisharp' ||
        triggerName === 'gimmmighoul-coins' ||
        triggerName === 'other'
      ) {
        triggers.push('Evolved by Level');
      } else if (
        triggerName === 'tower-of-darkness' ||
        triggerName === 'tower-of-waters'
      ) {
        triggers.push('Evolved by Item');
      }
    }
  }
  return [...new Set(triggers)];
}

export function getEvolutionStage(
  chain: EvolutionNode,
  speciesName: string,
): { stage: EvolutionMethod; trigger: EvolutionTrigger[]; branched: boolean } {
  const node = findNode(chain, speciesName);
  if (!node) return { stage: 'No Evolution Line', trigger: [], branched: false };
  const hasTo = node.evolves_to.length > 0;
  const ancestors = getAncestors(chain, speciesName);
  const hasFrom = ancestors.length > 0;

  let trigger: EvolutionTrigger[] = [];

  if (hasFrom || hasTo) {
    for (const anc of ancestors) {
      for (const evo of anc.evolves_to) {
        if (evo.species.name === speciesName && evo.evolution_details && evo.evolution_details.length > 0) {
          trigger = getTriggerMethods(evo);
        }
      }
    }
  }

  let stage: EvolutionMethod;
  let branched = false;
  if (!hasFrom && !hasTo) {
    return { stage: 'No Evolution Line', trigger: [], branched: false };
  } else if (!hasFrom && hasTo) {
    if (node.evolves_to.length > 1) branched = true;
    stage = 'First Stage';
  } else if (hasFrom && !hasTo) {
    stage = 'Final Stage';
  } else {
    stage = 'Middle Stage';
    if (node.evolves_to.length > 1) branched = true;
  }

  return { stage, trigger, branched };
}
