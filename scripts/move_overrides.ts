import type { PokemonLearnedMove } from '@pokedoku-helper/shared-types';

const SURF_OVERRIDE_FORM_IDS = new Set<number>([
  10280, // Starmie mega
  10281, // Dragonite mega
  10283, // Feraligatr mega
  10294, // Greninja mega
  10298, // Barbaracle mega
  10299, // Dragalge mega
  10302, // Drampa mega
  10304, // Raichu mega x
  10305, // Raichu mega y
  10309, // Garchomp mega z
  10316, // Golisopod mega
  10322, // Tatsugiri curly mega
  10323, // Tatsugiri droopy mega
  10324, // Tatsugiri stretchy mega
]);

export function getMoveOverridesForFormId(formId: number): PokemonLearnedMove[] {
  return SURF_OVERRIDE_FORM_IDS.has(formId) ? ['Surf'] : [];
}
