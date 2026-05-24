import type { PokemonLearnedMove } from '@pokedoku-helper/shared-types';

const SURF_OVERRIDE_FORM_IDS = new Set<number>([
  10505, // Starmie mega
  10506, // Dragonite mega
  10508, // Feraligatr mega
  10519, // Greninja mega
  10523, // Barbaracle mega
  10524, // Dragalge mega
  10527, // Drampa mega
  10529, // Raichu mega x
  10530, // Raichu mega y
  10534, // Garchomp mega z
  10541, // Golisopod mega
  10547, // Tatsugiri curly mega
  10548, // Tatsugiri droopy mega
  10549, // Tatsugiri stretchy mega
]);

const ACROBATICS_OVERRIDE_FORM_IDS = new Set<number>([
  10534, // Garchomp mega z
  10544, // Zeraora mega
]);

const BRICK_BREAK_OVERRIDE_FORM_IDS = new Set<number>([
  10506, // Dragonite mega
  10508, // Feraligatr mega
  10511, // Emboar mega
  10512, // Excadrill mega
  10514, // Scrafty mega
  10517, // Chesnaught mega
  10519, // Greninja mega
  10523, // Barbaracle mega
  10525, // Hawlucha mega
  10526, // Zygarde mega
  10528, // Falinks mega
  10529, // Raichu mega x
  10530, // Raichu mega y
  10533, // Staraptor mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10537, // Darkrai mega
  10538, // Golurk mega
  10540, // Crabominable mega
  10541, // Golisopod mega
  10542, // Magearna mega
  10543, // Magearna original mega
  10544, // Zeraora mega
  10550, // Baxcalibur mega
]);

const CALM_MIND_OVERRIDE_FORM_IDS = new Set<number>([
  357, // Tropius
  10503, // Clefable mega
  10516, // Chandelure mega
  10518, // Delphox mega
  10521, // Floette mega
  10522, // Malamar mega
  10527, // Drampa mega
  10529, // Raichu mega x
  10530, // Raichu mega y
  10531, // Chimecho mega
  10532, // Absol mega z
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10537, // Darkrai mega
  10539, // Meowstic mega
  10542, // Magearna mega
  10543, // Magearna original mega
  10544, // Zeraora mega
  10547, // Tatsugiri curly mega
  10548, // Tatsugiri droopy mega
  10549, // Tatsugiri stretchy mega
]);

const CLOSE_COMBAT_OVERRIDE_FORM_IDS = new Set<number>([
  10190, // Lopunny mega
  10511, // Emboar mega
  10514, // Scrafty mega
  10515, // Eelektross mega
  10517, // Chesnaught mega
  10525, // Hawlucha mega
  10528, // Falinks mega
  10532, // Absol mega z
  10533, // Staraptor mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10538, // Golurk mega
  10540, // Crabominable mega
  10541, // Golisopod mega
  10544, // Zeraora mega
]);

const CRUNCH_OVERRIDE_FORM_IDS = new Set<number>([
  10155, // Manectric mega
  10508, // Feraligatr mega
  10514, // Scrafty mega
  10515, // Eelektross mega
  10517, // Chesnaught mega
  10520, // Pyroar mega
  10526, // Zygarde mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10536, // Heatran mega
  10545, // Scovillain mega
  10550, // Baxcalibur mega
  90449, // Hippopotas female
  90450, // Hippowdon female
]);

const DAZZLING_GLEAM_OVERRIDE_FORM_IDS = new Set<number>([
  10503, // Clefable mega
  10505, // Starmie mega
  10518, // Delphox mega
  10521, // Floette mega
  10531, // Chimecho mega
  10534, // Garchomp mega z
  10542, // Magearna mega
  10543, // Magearna original mega
  10546, // Glimmora mega
]);

const EARTHQUAKE_OVERRIDE_FORM_IDS = new Set<number>([
  10506, // Dragonite mega
  10507, // Meganium mega
  10508, // Feraligatr mega
  10511, // Emboar mega
  10512, // Excadrill mega
  10513, // Scolipede mega
  10517, // Chesnaught mega
  10523, // Barbaracle mega
  10526, // Zygarde mega
  10527, // Drampa mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10536, // Heatran mega
  10538, // Golurk mega
  10540, // Crabominable mega
  10550, // Baxcalibur mega
  90449, // Hippopotas female
  90450, // Hippowdon female
]);

const FLAMETHROWER_OVERRIDE_FORM_IDS = new Set<number>([
  10503, // Clefable mega
  10506, // Dragonite mega
  10511, // Emboar mega
  10515, // Eelektross mega
  10516, // Chandelure mega
  10518, // Delphox mega
  10520, // Pyroar mega
  10522, // Malamar mega
  10527, // Drampa mega
  10532, // Absol mega z
  10534, // Garchomp mega z
  10536, // Heatran mega
  10545, // Scovillain mega
]);

const FLY_OVERRIDE_FORM_IDS = new Set<number>([
  10506, // Dragonite mega
  10509, // Skarmory mega
  10525, // Hawlucha mega
  10527, // Drampa mega
  10533, // Staraptor mega
  10534, // Garchomp mega z
  10538, // Golurk mega
  90521, // Unfezant female
]);

const HYDRO_PUMP_OVERRIDE_FORM_IDS = new Set<number>([
  516, // Simipour
  10166, // Swampert mega
  10172, // Sharpedo mega
  10505, // Starmie mega
  10506, // Dragonite mega
  10508, // Feraligatr mega
  10519, // Greninja mega
  10524, // Dragalge mega
  10527, // Drampa mega
  10534, // Garchomp mega z
  10547, // Tatsugiri curly mega
  10548, // Tatsugiri droopy mega
  10549, // Tatsugiri stretchy mega
]);

const ICE_BEAM_OVERRIDE_FORM_IDS = new Set<number>([
  280, // Ralts
  281, // Kirlia
  282, // Gardevoir
  475, // Gallade
  10151, // Gardevoir mega
  10170, // Gallade mega
  10503, // Clefable mega
  10505, // Starmie mega
  10506, // Dragonite mega
  10508, // Feraligatr mega
  10510, // Froslass mega
  10519, // Greninja mega
  10523, // Barbaracle mega
  10527, // Drampa mega
  10532, // Absol mega z
  10534, // Garchomp mega z
  10537, // Darkrai mega
  10538, // Golurk mega
  10540, // Crabominable mega
  10541, // Golisopod mega
  10542, // Magearna mega
  10543, // Magearna original mega
  10547, // Tatsugiri curly mega
  10548, // Tatsugiri droopy mega
  10549, // Tatsugiri stretchy mega
  10550, // Baxcalibur mega
]);

const ICE_PUNCH_OVERRIDE_FORM_IDS = new Set<number>([
  10503, // Clefable mega
  10506, // Dragonite mega
  10510, // Froslass mega
  10514, // Scrafty mega
  10519, // Greninja mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10538, // Golurk mega
  10540, // Crabominable mega
]);

const METRONOME_OVERRIDE_FORM_IDS = new Set<number>([
  475, // Gallade
  10137, // Alakazam mega
  10156, // Banette mega
  10168, // Sableye mega
  10503, // Clefable mega
  10506, // Dragonite mega
  10514, // Scrafty mega
  10518, // Delphox mega
  10521, // Floette mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
]);

const PROTECT_OVERRIDE_FORM_IDS = new Set<number>([
  10503, // Clefable mega
  10504, // Victreebel mega
  10505, // Starmie mega
  10506, // Dragonite mega
  10507, // Meganium mega
  10508, // Feraligatr mega
  10509, // Skarmory mega
  10510, // Froslass mega
  10511, // Emboar mega
  10512, // Excadrill mega
  10513, // Scolipede mega
  10514, // Scrafty mega
  10515, // Eelektross mega
  10516, // Chandelure mega
  10517, // Chesnaught mega
  10518, // Delphox mega
  10519, // Greninja mega
  10520, // Pyroar mega
  10521, // Floette mega
  10522, // Malamar mega
  10523, // Barbaracle mega
  10524, // Dragalge mega
  10525, // Hawlucha mega
  10526, // Zygarde mega
  10527, // Drampa mega
  10528, // Falinks mega
  10529, // Raichu mega x
  10530, // Raichu mega y
  10531, // Chimecho mega
  10532, // Absol mega z
  10533, // Staraptor mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10536, // Heatran mega
  10537, // Darkrai mega
  10538, // Golurk mega
  10539, // Meowstic mega
  10540, // Crabominable mega
  10541, // Golisopod mega
  10542, // Magearna mega
  10543, // Magearna original mega
  10544, // Zeraora mega
  10545, // Scovillain mega
  10546, // Glimmora mega
  10547, // Tatsugiri curly mega
  10548, // Tatsugiri droopy mega
  10549, // Tatsugiri stretchy mega
  10550, // Baxcalibur mega
  90449, // Hippopotas female
  90450, // Hippowdon female
  90521, // Unfezant female
]);

const PSYCHIC_OVERRIDE_FORM_IDS = new Set<number>([
  902, // Basculegion male
  10417, // Basculegion female
  10503, // Clefable mega
  10505, // Starmie mega
  10510, // Froslass mega
  10516, // Chandelure mega
  10518, // Delphox mega
  10521, // Floette mega
  10522, // Malamar mega
  10531, // Chimecho mega
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10537, // Darkrai mega
  10538, // Golurk mega
  10539, // Meowstic mega
  10542, // Magearna mega
  10543, // Magearna original mega
]);

const RAZOR_LEAF_OVERRIDE_FORM_IDS = new Set<number>([
  407, // Roserade
  421, // Cherrim overcast
  10504, // Victreebel mega
  10507, // Meganium mega
  10521, // Floette mega
  10545, // Scovillain mega
  10038, // Cherrim sunshine
]);

const SHADOW_BALL_OVERRIDE_FORM_IDS = new Set<number>([
  10503, // Clefable mega
  10510, // Froslass mega
  10516, // Chandelure mega
  10518, // Delphox mega
  10524, // Dragalge mega
  10527, // Drampa mega
  10531, // Chimecho mega
  10532, // Absol mega z
  10534, // Garchomp mega z
  10535, // Lucario mega z
  10537, // Darkrai mega
  10538, // Golurk mega
  10539, // Meowstic mega
  10542, // Magearna mega
  10543, // Magearna original mega
]);

const SLUDGE_BOMB_OVERRIDE_FORM_IDS = new Set<number>([
  10504, // Victreebel mega
  10512, // Excadrill mega
  10513, // Scolipede mega
  10514, // Scrafty mega
  10523, // Barbaracle mega
  10524, // Dragalge mega
  10534, // Garchomp mega z
  10537, // Darkrai mega
  10541, // Golisopod mega
  10546, // Glimmora mega
]);

const TAIL_SLAP_OVERRIDE_FORM_IDS = new Set<number>([
  419, // Floatzel
  424, // Ambipom
  10534, // Garchomp mega z
]);

const THUNDERBOLT_OVERRIDE_FORM_IDS = new Set<number>([
  10503, // Clefable mega
  10505, // Starmie mega
  10506, // Dragonite mega
  10510, // Froslass mega
  10515, // Eelektross mega
  10522, // Malamar mega
  10524, // Dragalge mega
  10527, // Drampa mega
  10529, // Raichu mega x
  10530, // Raichu mega y
  10532, // Absol mega z
  10534, // Garchomp mega z
  10537, // Darkrai mega
  10538, // Golurk mega
  10539, // Meowstic mega
  10542, // Magearna mega
  10543, // Magearna original mega
  10544, // Zeraora mega
]);

export function getMoveOverridesForFormId(formId: number): PokemonLearnedMove[] {
  const moves = new Set<PokemonLearnedMove>();

  if (SURF_OVERRIDE_FORM_IDS.has(formId)) moves.add('Surf');
  if (ACROBATICS_OVERRIDE_FORM_IDS.has(formId)) moves.add('Acrobatics');
  if (BRICK_BREAK_OVERRIDE_FORM_IDS.has(formId)) moves.add('Brick Break');
  if (CALM_MIND_OVERRIDE_FORM_IDS.has(formId)) moves.add('Calm Mind');
  if (CLOSE_COMBAT_OVERRIDE_FORM_IDS.has(formId)) moves.add('Close Combat');
  if (CRUNCH_OVERRIDE_FORM_IDS.has(formId)) moves.add('Crunch');
  if (DAZZLING_GLEAM_OVERRIDE_FORM_IDS.has(formId)) moves.add('Dazzling Gleam');
  if (EARTHQUAKE_OVERRIDE_FORM_IDS.has(formId)) moves.add('Earthquake');
  if (FLAMETHROWER_OVERRIDE_FORM_IDS.has(formId)) moves.add('Flamethrower');
  if (FLY_OVERRIDE_FORM_IDS.has(formId)) moves.add('Fly');
  if (HYDRO_PUMP_OVERRIDE_FORM_IDS.has(formId)) moves.add('Hydro Pump');
  if (ICE_BEAM_OVERRIDE_FORM_IDS.has(formId)) moves.add('Ice Beam');
  if (ICE_PUNCH_OVERRIDE_FORM_IDS.has(formId)) moves.add('Ice Punch');
  if (METRONOME_OVERRIDE_FORM_IDS.has(formId)) moves.add('Metronome');
  if (PROTECT_OVERRIDE_FORM_IDS.has(formId)) moves.add('Protect');
  if (PSYCHIC_OVERRIDE_FORM_IDS.has(formId)) moves.add('Psychic');
  if (RAZOR_LEAF_OVERRIDE_FORM_IDS.has(formId)) moves.add('Razor Leaf');
  if (SHADOW_BALL_OVERRIDE_FORM_IDS.has(formId)) moves.add('Shadow Ball');
  if (SLUDGE_BOMB_OVERRIDE_FORM_IDS.has(formId)) moves.add('Sludge Bomb');
  if (TAIL_SLAP_OVERRIDE_FORM_IDS.has(formId)) moves.add('Tail Slap');
  if (THUNDERBOLT_OVERRIDE_FORM_IDS.has(formId)) moves.add('Thunderbolt');

  return [...moves];
}

const FLAMETHROWER_REMOVAL_FORM_IDS = new Set<number>([
  10359, // Eternatus eternamax
]);

const FLY_REMOVAL_FORM_IDS = new Set<number>([
  10359, // Eternatus eternamax
]);

const PROTECT_REMOVAL_FORM_IDS = new Set<number>([
  10359, // Eternatus eternamax
]);

const SHADOW_BALL_REMOVAL_FORM_IDS = new Set<number>([
  10359, // Eternatus eternamax
]);

const SLUDGE_BOMB_REMOVAL_FORM_IDS = new Set<number>([
  10359, // Eternatus eternamax
]);

export function getMoveRemovalsForFormId(formId: number): PokemonLearnedMove[] {
  const moves = new Set<PokemonLearnedMove>();

  if (FLAMETHROWER_REMOVAL_FORM_IDS.has(formId)) moves.add('Flamethrower');
  if (FLY_REMOVAL_FORM_IDS.has(formId)) moves.add('Fly');
  if (PROTECT_REMOVAL_FORM_IDS.has(formId)) moves.add('Protect');
  if (SHADOW_BALL_REMOVAL_FORM_IDS.has(formId)) moves.add('Shadow Ball');
  if (SLUDGE_BOMB_REMOVAL_FORM_IDS.has(formId)) moves.add('Sludge Bomb');

  return [...moves];
}
