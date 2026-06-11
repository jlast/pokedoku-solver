import type { InternalPokemon } from "@pokedoku-helper/shared-types";

export const CUSTOM_POKEMON: InternalPokemon[] = [
  {
    id: 10,
    name: "Caterpie cowboy hat",
    types: [
      "Bug"
    ],
    region: ["Kanto"],
    sprite: "/images/sprites/99901.png",
    evolutionStage: "First Stage",
    formId: 99901,
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
    region: ["Sinnoh"],
    sprite: "/images/sprites/90449.png",
    evolutionStage: "First Stage",
    formId: 90449,
    learnedMoves: [
      "Crunch",
      "Earthquake",
      "Protect"
    ],
    evolution: {
      to: [90450],
    }
  },
  {
    id: 450,
    name: "Hippowdon female",
    types: [
      "Ground"
    ],
    region: ["Sinnoh"],
    sprite: "/images/sprites/90450.png",
    evolutionStage: "Final Stage",
    evolutionTrigger: [
      "Evolved by Level"
    ],
    learnedMoves: [
      "Crunch",
      "Earthquake",
      "Protect"
    ],
    formId: 90450,
    evolution: {
      from: [90449],
    }
  },
  {
    id: 521,
    name: "Unfezant female",
    types: [
      "Normal",
      "Flying"
    ],
    region: ["Unova"],
    sprite: "/images/sprites/90521.png",
    evolutionStage: "Final Stage",
    evolutionTrigger: [
      "Evolved by Level"
    ],
    learnedMoves: [
      "Fly",
      "Protect"
    ],
    formId: 90521,
    evolution: {
      from: [520],
    }
  },
]
