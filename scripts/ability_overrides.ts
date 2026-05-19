import type { PokemonAbility } from '@pokedoku-helper/shared-types';

const INTIMIDATE_OVERRIDE_FORM_IDS = new Set<number>([
  10021, // Landorus therian
  10055, // Manectric mega
]);

const LEVITATE_OVERRIDE_FORM_IDS = new Set<number>([
  10007, // Giratina origin
]);

const STURDY_OVERRIDE_FORM_IDS = new Set<number>([
  10275, // Ogerpon cornerstone mask
]);

const SWIFT_SWIM_OVERRIDE_FORM_IDS = new Set<number>([
  10064, // Swampert mega
]);

export function getAbilityOverridesForFormId(formId: number): PokemonAbility[] {
  const abilities = new Set<PokemonAbility>();

  if (INTIMIDATE_OVERRIDE_FORM_IDS.has(formId)) abilities.add('Intimidate');
  if (LEVITATE_OVERRIDE_FORM_IDS.has(formId)) abilities.add('Levitate');
  if (STURDY_OVERRIDE_FORM_IDS.has(formId)) abilities.add('Sturdy');
  if (SWIFT_SWIM_OVERRIDE_FORM_IDS.has(formId)) abilities.add('Swift Swim');

  return [...abilities];
}

const INTIMIDATE_REMOVAL_FORM_IDS = new Set<number>([
  10041, // Gyarados mega
  10052, // Mawile mega
  10089, // Salamence mega
  10289, // Scrafty mega
  10308, // Staraptor mega
]);

const KEEN_EYE_REMOVAL_FORM_IDS = new Set<number>([
  10066, // Sableye mega
  10073, // Pidgeot mega
  10151, // Rockruff own tempo
  10152, // Lycanroc dusk
  10166, // Farfetchd galar
  10284, // Skarmory mega
  10314, // Meowstic mega
]);

const LEVITATE_REMOVAL_FORM_IDS = new Set<number>([
  10290, // Eelektross mega
  10293, // Delphox mega
  10306, // Chimecho mega
]);

const STURDY_REMOVAL_FORM_IDS = new Set<number>([
  10053, // Aggron mega
  10072, // Steelix mega
  10284, // Skarmory mega
]);

const SWIFT_SWIM_REMOVAL_FORM_IDS = new Set<number>([
  10214, // Drednaw gmax
]);

export function getAbilityRemovalsForFormId(formId: number): PokemonAbility[] {
  const abilities = new Set<PokemonAbility>();

  if (INTIMIDATE_REMOVAL_FORM_IDS.has(formId)) abilities.add('Intimidate');
  if (KEEN_EYE_REMOVAL_FORM_IDS.has(formId)) abilities.add('Keen Eye');
  if (LEVITATE_REMOVAL_FORM_IDS.has(formId)) abilities.add('Levitate');
  if (STURDY_REMOVAL_FORM_IDS.has(formId)) abilities.add('Sturdy');
  if (SWIFT_SWIM_REMOVAL_FORM_IDS.has(formId)) abilities.add('Swift Swim');

  return [...abilities];
}
