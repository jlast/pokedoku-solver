import type { Pokemon } from "../src/types";

export const CUSTOM_POKEMON: Pokemon[] = [
  {
    "id": 10,
    "name": "Caterpie cowboy hat",
    "types": [
      "Bug"
    ],
    "region": "Kanto",
    "evolutionStage": "First Stage"
  }, 
  {
    "id": 449,
    "name": "Hippopotas female",
    "types": [
      "Ground"
    ],
    "region": "Sinnoh",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/449.png",
    "evolutionStage": "First Stage"
  },
  {
    "id": 450,
    "name": "Hippowdon female",
    "types": [
      "Ground"
    ],
    "region": "Sinnoh",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/450.png",
    "evolutionStage": "Final Stage",
    "evolutionTrigger": [
      "Evolved by Level"
    ]
  },
  {
    "id": 521,
    "name": "Unfezant female",
    "types": [
      "Normal",
      "Flying"
    ],
    "region": "Unova",
    "sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/521.png",
    "evolutionStage": "Final Stage",
    "evolutionTrigger": [
      "Evolved by Level"
    ]
  },
]