import type { PokemonAbility } from '@pokedoku-helper/shared-types';

const INTIMIDATE_OVERRIDE_FORM_IDS = new Set<number>([
  10081, // Landorus therian
  10155, // Manectric mega
]);

const LEVITATE_OVERRIDE_FORM_IDS = new Set<number>([
  10063, // Giratina origin
]);

const STURDY_OVERRIDE_FORM_IDS = new Set<number>([
  10444, // Ogerpon cornerstone mask
]);

const SWIFT_SWIM_OVERRIDE_FORM_IDS = new Set<number>([
  10166, // Swampert mega
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
  10141, // Gyarados mega
  10152, // Mawile mega
  10191, // Salamence mega
  10514, // Scrafty mega
  10533, // Staraptor mega
]);

const KEEN_EYE_REMOVAL_FORM_IDS = new Set<number>([
  10168, // Sableye mega
  10175, // Pidgeot mega
  10310, // Rockruff own tempo
  10311, // Lycanroc dusk
  10325, // Farfetchd galar
  10509, // Skarmory mega
  10539, // Meowstic mega
]);

const LEVITATE_REMOVAL_FORM_IDS = new Set<number>([
  10515, // Eelektross mega
]);

const STURDY_REMOVAL_FORM_IDS = new Set<number>([
  10153, // Aggron mega
  10174, // Steelix mega
  10509, // Skarmory mega
]);

const SWIFT_SWIM_REMOVAL_FORM_IDS = new Set<number>([
  10383, // Drednaw gmax
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
