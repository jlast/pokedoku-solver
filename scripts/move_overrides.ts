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

const ACROBATICS_OVERRIDE_FORM_IDS = new Set<number>([
  10309, // Garchomp mega z
  10319, // Zeraora mega
]);

const BRICK_BREAK_OVERRIDE_FORM_IDS = new Set<number>([
  10281, // Dragonite mega
  10283, // Feraligatr mega
  10286, // Emboar mega
  10287, // Excadrill mega
  10289, // Scrafty mega
  10292, // Chesnaught mega
  10294, // Greninja mega
  10298, // Barbaracle mega
  10300, // Hawlucha mega
  10301, // Zygarde mega
  10303, // Falinks mega
  10304, // Raichu mega x
  10305, // Raichu mega y
  10308, // Staraptor mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10312, // Darkrai mega
  10313, // Golurk mega
  10315, // Crabominable mega
  10316, // Golisopod mega
  10317, // Magearna mega
  10318, // Magearna original mega
  10319, // Zeraora mega
  10325, // Baxcalibur mega
]);

const CALM_MIND_OVERRIDE_FORM_IDS = new Set<number>([
  357, // Tropius
  10278, // Clefable mega
  10291, // Chandelure mega
  10293, // Delphox mega
  10296, // Floette mega
  10297, // Malamar mega
  10302, // Drampa mega
  10304, // Raichu mega x
  10305, // Raichu mega y
  10306, // Chimecho mega
  10307, // Absol mega z
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10312, // Darkrai mega
  10314, // Meowstic mega
  10317, // Magearna mega
  10318, // Magearna original mega
  10319, // Zeraora mega
  10322, // Tatsugiri curly mega
  10323, // Tatsugiri droopy mega
  10324, // Tatsugiri stretchy mega
]);

const CLOSE_COMBAT_OVERRIDE_FORM_IDS = new Set<number>([
  10088, // Lopunny mega
  10286, // Emboar mega
  10289, // Scrafty mega
  10290, // Eelektross mega
  10292, // Chesnaught mega
  10300, // Hawlucha mega
  10303, // Falinks mega
  10307, // Absol mega z
  10308, // Staraptor mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10313, // Golurk mega
  10315, // Crabominable mega
  10316, // Golisopod mega
  10319, // Zeraora mega
]);

const CRUNCH_OVERRIDE_FORM_IDS = new Set<number>([
  10055, // Manectric mega
  10283, // Feraligatr mega
  10289, // Scrafty mega
  10290, // Eelektross mega
  10292, // Chesnaught mega
  10295, // Pyroar mega
  10301, // Zygarde mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10311, // Heatran mega
  10320, // Scovillain mega
  10325, // Baxcalibur mega
  90449, // Hippopotas female
  90450, // Hippowdon female
]);

const DAZZLING_GLEAM_OVERRIDE_FORM_IDS = new Set<number>([
  10278, // Clefable mega
  10280, // Starmie mega
  10293, // Delphox mega
  10296, // Floette mega
  10306, // Chimecho mega
  10309, // Garchomp mega z
  10317, // Magearna mega
  10318, // Magearna original mega
  10321, // Glimmora mega
]);

const EARTHQUAKE_OVERRIDE_FORM_IDS = new Set<number>([
  10281, // Dragonite mega
  10282, // Meganium mega
  10283, // Feraligatr mega
  10286, // Emboar mega
  10287, // Excadrill mega
  10288, // Scolipede mega
  10292, // Chesnaught mega
  10298, // Barbaracle mega
  10301, // Zygarde mega
  10302, // Drampa mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10311, // Heatran mega
  10313, // Golurk mega
  10315, // Crabominable mega
  10325, // Baxcalibur mega
  90449, // Hippopotas female
  90450, // Hippowdon female
]);

const FLAMETHROWER_OVERRIDE_FORM_IDS = new Set<number>([
  10278, // Clefable mega
  10281, // Dragonite mega
  10286, // Emboar mega
  10290, // Eelektross mega
  10291, // Chandelure mega
  10293, // Delphox mega
  10295, // Pyroar mega
  10297, // Malamar mega
  10302, // Drampa mega
  10307, // Absol mega z
  10309, // Garchomp mega z
  10311, // Heatran mega
  10320, // Scovillain mega
]);

const FLY_OVERRIDE_FORM_IDS = new Set<number>([
  10281, // Dragonite mega
  10284, // Skarmory mega
  10300, // Hawlucha mega
  10302, // Drampa mega
  10308, // Staraptor mega
  10309, // Garchomp mega z
  10313, // Golurk mega
  90521, // Unfezant female
]);

const HYDRO_PUMP_OVERRIDE_FORM_IDS = new Set<number>([
  516, // Simipour
  10064, // Swampert mega
  10070, // Sharpedo mega
  10280, // Starmie mega
  10281, // Dragonite mega
  10283, // Feraligatr mega
  10294, // Greninja mega
  10299, // Dragalge mega
  10302, // Drampa mega
  10309, // Garchomp mega z
  10322, // Tatsugiri curly mega
  10323, // Tatsugiri droopy mega
  10324, // Tatsugiri stretchy mega
]);

const ICE_BEAM_OVERRIDE_FORM_IDS = new Set<number>([
  280, // Ralts
  281, // Kirlia
  282, // Gardevoir
  475, // Gallade
  10051, // Gardevoir mega
  10068, // Gallade mega
  10278, // Clefable mega
  10280, // Starmie mega
  10281, // Dragonite mega
  10283, // Feraligatr mega
  10285, // Froslass mega
  10294, // Greninja mega
  10298, // Barbaracle mega
  10302, // Drampa mega
  10307, // Absol mega z
  10309, // Garchomp mega z
  10312, // Darkrai mega
  10313, // Golurk mega
  10315, // Crabominable mega
  10316, // Golisopod mega
  10317, // Magearna mega
  10318, // Magearna original mega
  10322, // Tatsugiri curly mega
  10323, // Tatsugiri droopy mega
  10324, // Tatsugiri stretchy mega
  10325, // Baxcalibur mega
]);

const ICE_PUNCH_OVERRIDE_FORM_IDS = new Set<number>([
  10278, // Clefable mega
  10281, // Dragonite mega
  10285, // Froslass mega
  10289, // Scrafty mega
  10294, // Greninja mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10313, // Golurk mega
  10315, // Crabominable mega
]);

const METRONOME_OVERRIDE_FORM_IDS = new Set<number>([
  475, // Gallade
  10037, // Alakazam mega
  10056, // Banette mega
  10066, // Sableye mega
  10278, // Clefable mega
  10281, // Dragonite mega
  10289, // Scrafty mega
  10293, // Delphox mega
  10296, // Floette mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
]);

const PROTECT_OVERRIDE_FORM_IDS = new Set<number>([
  10278, // Clefable mega
  10279, // Victreebel mega
  10280, // Starmie mega
  10281, // Dragonite mega
  10282, // Meganium mega
  10283, // Feraligatr mega
  10284, // Skarmory mega
  10285, // Froslass mega
  10286, // Emboar mega
  10287, // Excadrill mega
  10288, // Scolipede mega
  10289, // Scrafty mega
  10290, // Eelektross mega
  10291, // Chandelure mega
  10292, // Chesnaught mega
  10293, // Delphox mega
  10294, // Greninja mega
  10295, // Pyroar mega
  10296, // Floette mega
  10297, // Malamar mega
  10298, // Barbaracle mega
  10299, // Dragalge mega
  10300, // Hawlucha mega
  10301, // Zygarde mega
  10302, // Drampa mega
  10303, // Falinks mega
  10304, // Raichu mega x
  10305, // Raichu mega y
  10306, // Chimecho mega
  10307, // Absol mega z
  10308, // Staraptor mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10311, // Heatran mega
  10312, // Darkrai mega
  10313, // Golurk mega
  10314, // Meowstic mega
  10315, // Crabominable mega
  10316, // Golisopod mega
  10317, // Magearna mega
  10318, // Magearna original mega
  10319, // Zeraora mega
  10320, // Scovillain mega
  10321, // Glimmora mega
  10322, // Tatsugiri curly mega
  10323, // Tatsugiri droopy mega
  10324, // Tatsugiri stretchy mega
  10325, // Baxcalibur mega
  90449, // Hippopotas female
  90450, // Hippowdon female
  90521, // Unfezant female
]);

const PSYCHIC_OVERRIDE_FORM_IDS = new Set<number>([
  902, // Basculegion male
  10248, // Basculegion female
  10278, // Clefable mega
  10280, // Starmie mega
  10285, // Froslass mega
  10291, // Chandelure mega
  10293, // Delphox mega
  10296, // Floette mega
  10297, // Malamar mega
  10306, // Chimecho mega
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10312, // Darkrai mega
  10313, // Golurk mega
  10314, // Meowstic mega
  10317, // Magearna mega
  10318, // Magearna original mega
]);

const RAZOR_LEAF_OVERRIDE_FORM_IDS = new Set<number>([
  407, // Roserade
  421, // Cherrim overcast
  10279, // Victreebel mega
  10282, // Meganium mega
  10296, // Floette mega
  10309, // Garchomp mega z
  10320, // Scovillain mega
  90421, // Cherrim sunshine
]);

const SHADOW_BALL_OVERRIDE_FORM_IDS = new Set<number>([
  10278, // Clefable mega
  10285, // Froslass mega
  10291, // Chandelure mega
  10293, // Delphox mega
  10299, // Dragalge mega
  10302, // Drampa mega
  10306, // Chimecho mega
  10307, // Absol mega z
  10309, // Garchomp mega z
  10310, // Lucario mega z
  10312, // Darkrai mega
  10313, // Golurk mega
  10314, // Meowstic mega
  10317, // Magearna mega
  10318, // Magearna original mega
]);

const SLUDGE_BOMB_OVERRIDE_FORM_IDS = new Set<number>([
  10279, // Victreebel mega
  10287, // Excadrill mega
  10288, // Scolipede mega
  10289, // Scrafty mega
  10298, // Barbaracle mega
  10299, // Dragalge mega
  10309, // Garchomp mega z
  10312, // Darkrai mega
  10316, // Golisopod mega
  10321, // Glimmora mega
]);

const TAIL_SLAP_OVERRIDE_FORM_IDS = new Set<number>([
  419, // Floatzel
  424, // Ambipom
  10309, // Garchomp mega z
]);

const THUNDERBOLT_OVERRIDE_FORM_IDS = new Set<number>([
  10278, // Clefable mega
  10280, // Starmie mega
  10281, // Dragonite mega
  10285, // Froslass mega
  10290, // Eelektross mega
  10297, // Malamar mega
  10299, // Dragalge mega
  10302, // Drampa mega
  10304, // Raichu mega x
  10305, // Raichu mega y
  10307, // Absol mega z
  10309, // Garchomp mega z
  10312, // Darkrai mega
  10313, // Golurk mega
  10314, // Meowstic mega
  10317, // Magearna mega
  10318, // Magearna original mega
  10319, // Zeraora mega
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
  10190, // Eternatus eternamax
]);

const FLY_REMOVAL_FORM_IDS = new Set<number>([
  10190, // Eternatus eternamax
]);

const PROTECT_REMOVAL_FORM_IDS = new Set<number>([
  10190, // Eternatus eternamax
]);

const SHADOW_BALL_REMOVAL_FORM_IDS = new Set<number>([
  10190, // Eternatus eternamax
]);

const SLUDGE_BOMB_REMOVAL_FORM_IDS = new Set<number>([
  10190, // Eternatus eternamax
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
