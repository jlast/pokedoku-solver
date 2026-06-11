import {
  type DexDifficulty,
  type InternalPokemon,
  type Pokemon,
} from '@pokedoku-helper/shared-types';

function getAllCategories(pokemon: InternalPokemon): string[] {
  const categories: string[] = [];

  for (const type of pokemon.types) {
    if (type) categories.push(type);
  }

  const typeCount = pokemon.types.filter((type) => type).length;
  if (typeCount === 1) categories.push('Monotype');
  else if (typeCount === 2) categories.push('Dualtype');

  if (pokemon.region?.length) categories.push(...pokemon.region);
  if (pokemon.evolutionStage) categories.push(pokemon.evolutionStage);
  if (pokemon.evolutionStage === 'First Stage' || pokemon.evolutionStage === 'Middle Stage') {
    categories.push('not fully evolved');
  }
  if (pokemon.evolutionTrigger) categories.push(...pokemon.evolutionTrigger);
  if (pokemon.isBranched) categories.push('branched');
  if (pokemon.categories?.length) categories.push(...pokemon.categories);

  return categories;
}

function getCategoryPairs(categories: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      pairs.push(`${categories[i]}+${categories[j]}`);
    }
  }
  return pairs;
}

function getEvolutionNodeId(pokemon: InternalPokemon): number {
  return pokemon.formId ?? pokemon.id;
}

function getEvolutionLineKeys(pokemonList: InternalPokemon[]): Map<number, string> {
  const adjacency = new Map<number, Set<number>>();

  const ensureNode = (nodeId: number): Set<number> => {
    let neighbors = adjacency.get(nodeId);
    if (!neighbors) {
      neighbors = new Set<number>();
      adjacency.set(nodeId, neighbors);
    }
    return neighbors;
  };

  for (const pokemon of pokemonList) {
    const nodeId = getEvolutionNodeId(pokemon);
    const neighbors = ensureNode(nodeId);
    const relatedIds = [...(pokemon.evolution?.from ?? []), ...(pokemon.evolution?.to ?? [])];

    for (const relatedId of relatedIds) {
      neighbors.add(relatedId);
      ensureNode(relatedId).add(nodeId);
    }
  }

  const lineKeys = new Map<number, string>();
  const visited = new Set<number>();

  for (const nodeId of adjacency.keys()) {
    if (visited.has(nodeId)) continue;

    const component: number[] = [];
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }

    const componentKey =
      component.length === 1 && (adjacency.get(component[0])?.size ?? 0) === 0
        ? `solo:${component[0]}`
        : `line:${Math.min(...component)}`;

    for (const componentNodeId of component) {
      lineKeys.set(componentNodeId, componentKey);
    }
  }

  return lineKeys;
}

export function getValidDexDifficultyCombinationCounts(
  pokemonList: InternalPokemon[],
): Record<string, number> {
  const lineKeys = getEvolutionLineKeys(pokemonList);
  const combinationLines: Record<string, Set<string>> = {};

  for (const pokemon of pokemonList) {
    const categories = getAllCategories(pokemon);
    const pairs = getCategoryPairs(categories);
    const nodeId = getEvolutionNodeId(pokemon);
    const lineKey = lineKeys.get(nodeId) ?? `solo:${nodeId}`;

    for (const pair of pairs) {
      combinationLines[pair] ??= new Set<string>();
      combinationLines[pair].add(lineKey);
    }
  }

  const combinationCounts: Record<string, number> = {};
  for (const [pair, lines] of Object.entries(combinationLines)) {
    if (lines.size > 1) {
      combinationCounts[pair] = lines.size;
    }
  }

  return combinationCounts;
}

export function calculateDexDifficulties(pokemonList: InternalPokemon[]): Pokemon[] {
  const combinationCounts = getValidDexDifficultyCombinationCounts(pokemonList);
  const scores: { pokemon: InternalPokemon; score: number }[] = [];

  for (const pokemon of pokemonList) {
    const categories = getAllCategories(pokemon);
    const pairs = getCategoryPairs(categories);

    let totalCompetition = 0;
    for (const pair of pairs) {
      totalCompetition += combinationCounts[pair] || 0;
    }

    scores.push({ pokemon, score: totalCompetition });
  }

  scores.sort((a, b) => b.score - a.score);

  const total = scores.length;
  const pokemon: Pokemon[] = [];
  for (let i = 0; i < total; i++) {
    const percentile = i / total;
    let grade: DexDifficulty;
    if (percentile < 0.4) grade = 'Easy';
    else if (percentile < 0.7) grade = 'Normal';
    else if (percentile < 0.9) grade = 'Hard';
    else if (percentile < 0.98) grade = 'Expert';
    else grade = 'Nightmare';

    pokemon.push({
      ...scores[i].pokemon,
      dexDifficultyPercentile: Math.round(percentile * 1000) / 1000,
      dexDifficulty: grade,
    });
  }

  return pokemon.sort((a, b) => a.id - b.id);
}
