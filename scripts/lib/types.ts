export interface PokeAPIType {
  slot: number;
  type: { name: string; url: string };
}

export interface PokeAPIPokemon {
  species: {
    url: string;
    name: string;
  };
  id: number;
  name: string;
  types: PokeAPIType[];
}

export interface PokeAPIForm {
  form_name: string;
  pokemon: {
    url: string;
    name: string;
  };
  sprites: {
    front_default: string | null;
  };
  id: number;
  name: string;
  is_mega: boolean;
}

export interface PokeAPISpecies {
  id: number;
  name: string;
  is_baby: boolean;
  is_mythical: boolean;
  is_legendary: boolean;
  is_mega: boolean;
  evolution_chain?: { url: string } | null;
}

export type TriggerName = 'level-up' | 'trade' | 'use-item' | 'shed' | 'spin' | 'tower-of-darkness' | 'tower-of-waters' | 'three-critical-hits' | 'take-damage' | 'other' | 'agile-style-move' | 'strong-style-move' | 'recoil-damage' | 'use-move' | 'three-defeated-bisharp' | 'gimmmighoul-coins';
export interface EvolutionDetail {
  trigger: { name: TriggerName; url: string };
  item?: { name: string; url: string } | null;
  held_item?: { name: string; url: string } | null;
  min_level?: number | null;
  min_affection?: number | null;
  min_happiness?: number | null;
  gender?: number | null;
}

export interface EvolutionNode {
  species: { name: string; url: string };
  evolves_to: EvolutionNode[];
  evolution_details?: EvolutionDetail[];
}
