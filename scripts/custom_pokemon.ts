import type { InternalPokemon } from "@pokedoku-helper/shared-types";

export const CUSTOM_POKEMON: InternalPokemon[] = [
  {
    id: 10,
    name: "Caterpie cowboy hat",
    types: [
      "Bug"
    ],
    region: "Kanto",
    evolutionStage: "First Stage",
    formId: 100010,
    evolution: {
      to: [11],
    }
  }, 
  {
    id: 449,
    name: "Hippopotas female",
    types: [
      "Ground"
    ],
    region: "Sinnoh",
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/449.png",
    evolutionStage: "First Stage",
    formId: 100449,
    evolution: {
      to: [100450],
    }
  },
  {
    id: 450,
    name: "Hippowdon female",
    types: [
      "Ground"
    ],
    region: "Sinnoh",
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/450.png",
    evolutionStage: "Final Stage",
    evolutionTrigger: [
      "Evolved by Level"
    ],
    formId: 100450,
    evolution: {
      from: [100449],
    }
  },
  {
    id: 521,
    name: "Unfezant female",
    types: [
      "Normal",
      "Flying"
    ],
    region: "Unova",
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/521.png",
    evolutionStage: "Final Stage",
    evolutionTrigger: [
      "Evolved by Level"
    ],
    formId: 100521,
    evolution: {
      from: [520],
    }
  },
]
