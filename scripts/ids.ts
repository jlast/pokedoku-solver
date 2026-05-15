import type {
  EvolutionMethod,
  EvolutionTrigger,
  PokemonType,
  PokemonRegion,
  PokemonCategory,
} from "@pokedoku-helper/shared-types";

export const REGION_BY_ID: Record<number, PokemonRegion> = {};
export const regions: { name: PokemonRegion; start: number; end: number }[] = [
  { name: "Kanto", start: 1, end: 151 },
  { name: "Johto", start: 152, end: 251 },
  { name: "Hoenn", start: 252, end: 386 },
  { name: "Sinnoh", start: 387, end: 493 },
  { name: "Unova", start: 494, end: 649 },
  { name: "Kalos", start: 650, end: 721 },
  { name: "Alola", start: 722, end: 807 },
  { name: "Galar", start: 810, end: 898 },
  { name: "Hisui", start: 899, end: 905 },
  { name: "Paldea", start: 906, end: 1025 },
];

for (const r of regions) {
  for (let i = r.start; i <= r.end; i++) {
    REGION_BY_ID[i] = r.name;
  }
}

export const STARTER_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10318, 10317, 152, 153, 154, 155, 156, 157, 158,
  159, 160, 252, 253, 254, 255, 256, 257, 258, 259, 260, 387, 388, 389, 390,
  391, 392, 393, 394, 395, 495, 496, 497, 498, 499, 500, 501, 502, 503, 650,
  651, 652, 653, 654, 655, 656, 657, 658, 722, 723, 724, 725, 726, 727, 728,
  729, 730, 810, 811, 812, 813, 814, 815, 816, 817, 818, 906, 907, 908, 909,
  910, 911, 912, 913, 914, 10402, 10405, 10413,
]);

export const CANT_EVOLVE_FORMS = new Set(["starter"]);

export const IGNORE_EVOLVE_FORMS = new Set([
  "gmax",
  "eternamax",
  "mega",
  "mega-x",
  "mega-y",
  "mega-z",
  "ash"
]);

export const ULTRA_BEASTS = new Set([
  793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806,
]);

export const PARADOX_POKEMON = new Set([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1007,
  1008, 1009, 1010, 1020, 1021, 1022, 1023,
]);

export const FOSSIL_IDS = new Set([
  138, 139, 140, 141, 142, 345, 346, 347, 348, 408, 409, 410, 411, 564, 565,
  566, 567, 696, 697, 698, 699, 880, 881, 882, 883, 10042,
]);

export const IGNORED_FORM_IDS = new Set([
  10433,
  10434,
  10435,
  10436, // Koraidon
  10437,
  10438,
  10439,
  10440, // Miraidon
  10182,
  10183,
  10184,
  10185,
  10186,
  10187,
  10196,
  10197,
  10198,
  10199,
  10200,
  10201,
  10267,
  10319, // All pikachu costumes
  10103,
  10104,
  10105,
  10106,
  10107,
  10108,
  10109,
  10110,
  10111,
  10112,
  10113,
  10114, // Flabebe, Floette and Florges special forms
  10249,
  10250,
  10251,
  10252,
  10253,
  10254, // Minior meteor
  10341,
  10342, // Cramorant
  10220,
  10221, // Zygarde 10% and 50% power constructs
  10218, // Greninja battle bond
  10065, // Pichu spiky eared
  10346,
  10347,
  10348,
  10349,
  10350,
  10351,
  10352,
  10353,
  10449,
  10450,
  10451,
  10452,
  10453,
  10454,
  10455,
  10456,
  10457,
  10458,
  10459,
  10460,
  10461,
  10462,
  10463,
  10464,
  10465,
  10466,
  10467,
  10468,
  10469,
  10470,
  10471,
  10472,
  10473,
  10474,
  10475,
  10476,
  10477,
  10478,
  10479,
  10480,
  10481,
  10482,
  10483,
  10484,
  10485,
  10486,
  10487,
  10488,
  10489,
  10490,
  10491,
  10492,
  10493,
  10494,
  10495,
  10496,
  10497,
  10498,
  10499,
  10500,
  10501,
  10502, // Alcremie special forms
]);

export const IGNORED_FORMS = new Set([
  "totem",
  "totem-alola",
  "totem-disguised",
  "totem-busted",
]);

export const IGNORE_SPECIAL_FORMS = new Set([
  "unown",
  "arceus",
  "genesect",
  "scatterbug",
  "spewpa",
  "vivillon",
  "furfrou",
  "xerneas",
  "silvally",
  "koraidon",
  "miraidon",
  "sinistea",
  "polteageist",
  "poltchageist",
  "sinistcha",
  "mothim",
]);

export const NAME_REPLACEMENTS: Record<string, string> = {
  "Flabebe red": "Flabebe",
  "Floette red": "Floette",
  "Florges red": "Florges",
  "Minior red meteor": "Minior meteor",
  "Zygarde 10": "Zygarde 10%",
  "Zygarde 50": "Zygarde 50%",
  "Alcremie vanilla cream strawberry sweet": "Alcremie",
  "Pikachu starter": "Pikachu Partner",
  "Eevee starter": "Eevee Partner",
};

export interface PokemonOverride {
  formId?: number,
  types?: [PokemonType, PokemonType] | [PokemonType];
  region?: PokemonRegion;
  evolution?: {
    from?: number[];
    to?: number[];
  };
  evolutionStage?: EvolutionMethod;
  evolutionTrigger?: EvolutionTrigger[];
  isBranched?: boolean;
  categories?: PokemonCategory[];
  sprite?: string;
}

export const FORM_ID_OVERRIDES: Record<number, number> = {
  718: 10119, // Zygarde 50%
  10028: 10013, // Castform sunny
  10029: 10014, // Castform rainy
  10030: 10015, // Castform snowy
  10031: 10001, // Deoxys attack
  10032: 10002, // Deoxys defense
  10033: 10003, // Deoxys speed
  10036: 10004, // Wormadam sandy
  10037: 10005, // Wormadam trash
  10038: 90421, // Cherrim sunshine
  10039: 90422, // Shellos east
  10040: 90423, // Gastrodon east
  10058: 10008, // Rotom heat
  10059: 10009, // Rotom wash
  10060: 10010, // Rotom frost
  10061: 10011, // Rotom fan
  10062: 10012, // Rotom mow
  10063: 10007, // Giratina origin
  10064: 10006, // Shaymin sky
  10066: 10016, // Basculin blue striped
  10067: 10017, // Darmanitan zen
  10068: 91585, // Deerling summer
  10069: 90585, // Deerling autumn
  10070: 92585, // Deerling winter
  10071: 91586, // Sawsbuck summer
  10072: 90586, // Sawsbuck autumn
  10073: 92586, // Sawsbuck winter
  10074: 10018, // Meloetta pirouette
  10079: 10019, // Tornadus therian
  10080: 10020, // Thundurus therian
  10081: 10021, // Landorus therian
  10082: 10022, // Kyurem black
  10083: 10023, // Kyurem white
  10084: 10024, // Keldeo resolute
  10124: 10025, // Meowstic female
  10125: 10026, // Aegislash blade
  10126: 10027, // Pumpkaboo small
  10127: 10028, // Pumpkaboo large
  10128: 10029, // Pumpkaboo super
  10129: 10030, // Gourgeist small
  10130: 10031, // Gourgeist large
  10131: 10032, // Gourgeist super
  10133: 10033, // Venusaur mega
  10134: 10034, // Charizard mega x
  10135: 10035, // Charizard mega y
  10136: 10036, // Blastoise mega
  10137: 10037, // Alakazam mega
  10138: 10038, // Gengar mega
  10139: 10039, // Kangaskhan mega
  10140: 10040, // Pinsir mega
  10141: 10041, // Gyarados mega
  10142: 10042, // Aerodactyl mega
  10143: 10043, // Mewtwo mega x
  10144: 10044, // Mewtwo mega y
  10145: 10045, // Ampharos mega
  10146: 10046, // Scizor mega
  10147: 10047, // Heracross mega
  10148: 10048, // Houndoom mega
  10149: 10049, // Tyranitar mega
  10150: 10050, // Blaziken mega
  10151: 10051, // Gardevoir mega
  10152: 10052, // Mawile mega
  10153: 10053, // Aggron mega
  10154: 10054, // Medicham mega
  10155: 10055, // Manectric mega
  10156: 10056, // Banette mega
  10157: 10057, // Absol mega
  10158: 10058, // Garchomp mega
  10159: 10059, // Lucario mega
  10160: 10060, // Abomasnow mega
  10163: 10061, // Floette eternal
  10164: 10062, // Latias mega
  10165: 10063, // Latios mega
  10166: 10064, // Swampert mega
  10167: 10065, // Sceptile mega
  10168: 10066, // Sableye mega
  10169: 10067, // Altaria mega
  10170: 10068, // Gallade mega
  10171: 10069, // Audino mega
  10172: 10070, // Sharpedo mega
  10173: 10071, // Slowbro mega
  10174: 10072, // Steelix mega
  10175: 10073, // Pidgeot mega
  10176: 10074, // Glalie mega
  10177: 10075, // Diancie mega
  10178: 10076, // Metagross mega
  10179: 10077, // Kyogre primal
  10180: 10078, // Groudon primal
  10181: 10079, // Rayquaza mega
  10188: 10086, // Hoopa unbound
  10189: 10087, // Camerupt mega
  10190: 10088, // Lopunny mega
  10191: 10089, // Salamence mega
  10192: 10090, // Beedrill mega
  10193: 10091, // Rattata alola
  10194: 10092, // Raticate alola
  10202: 10100, // Raichu alola
  10203: 10101, // Sandshrew alola
  10204: 10102, // Sandslash alola
  10205: 10103, // Vulpix alola
  10206: 10104, // Ninetales alola
  10207: 10105, // Diglett alola
  10208: 10106, // Dugtrio alola
  10209: 10107, // Meowth alola
  10210: 10108, // Persian alola
  10211: 10109, // Geodude alola
  10212: 10110, // Graveler alola
  10213: 10111, // Golem alola
  10214: 10112, // Grimer alola
  10215: 10113, // Muk alola
  10216: 10114, // Exeggutor alola
  10217: 10115, // Marowak alola
  10219: 10117, // Greninja ash
  10222: 10120, // Zygarde complete
  10225: 10123, // Oricorio pom pom
  10226: 10124, // Oricorio pau
  10227: 10125, // Oricorio sensu
  10228: 10126, // Lycanroc midnight
  10229: 10127, // Wishiwashi school
  10255: 10136, // Minior red
  10256: 10137, // Minior orange
  10257: 10138, // Minior yellow
  10258: 10139, // Minior green
  10259: 10140, // Minior blue
  10260: 10141, // Minior indigo
  10261: 10142, // Minior violet
  10262: 10143, // Mimikyu busted
  10266: 10147, // Magearna original
  10310: 10151, // Rockruff own tempo
  10311: 10152, // Lycanroc dusk
  10314: 10155, // Necrozma dusk
  10315: 10156, // Necrozma dawn
  10316: 10157, // Necrozma ultra
  10317: 10158, // Pikachu Partner
  10318: 10159, // Eevee Partner
  10320: 10161, // Meowth galar
  10321: 10162, // Ponyta galar
  10322: 10163, // Rapidash galar
  10323: 10164, // Slowpoke galar
  10324: 10165, // Slowbro galar
  10325: 10166, // Farfetchd galar
  10326: 10167, // Weezing galar
  10327: 10168, // Mr mime galar
  10328: 10169, // Articuno galar
  10329: 10170, // Zapdos galar
  10330: 10171, // Moltres galar
  10331: 10172, // Slowking galar
  10332: 10173, // Corsola galar
  10333: 10174, // Zigzagoon galar
  10334: 10175, // Linoone galar
  10335: 10176, // Darumaka galar
  10336: 10177, // Darmanitan galar standard
  10337: 10178, // Darmanitan galar zen
  10338: 10179, // Yamask galar
  10339: 10180, // Stunfisk galar
  10340: 10118, // Zygarde 10%
  10343: 10184, // Toxtricity low key
  10354: 10185, // Eiscue noice
  10355: 10186, // Indeedee female
  10356: 10187, // Morpeko hangry
  10357: 10188, // Zacian crowned
  10358: 10189, // Zamazenta crowned
  10359: 10190, // Eternatus eternamax
  10360: 10191, // Urshifu rapid strike
  10361: 10192, // Zarude dada
  10362: 10193, // Calyrex ice
  10363: 10194, // Calyrex shadow
  10364: 10195, // Venusaur gmax
  10365: 10196, // Charizard gmax
  10366: 10197, // Blastoise gmax
  10367: 10198, // Butterfree gmax
  10368: 10199, // Pikachu gmax
  10369: 10200, // Meowth gmax
  10370: 10201, // Machamp gmax
  10371: 10202, // Gengar gmax
  10372: 10203, // Kingler gmax
  10373: 10204, // Lapras gmax
  10374: 10205, // Eevee gmax
  10375: 10206, // Snorlax gmax
  10376: 10207, // Garbodor gmax
  10377: 10208, // Melmetal gmax
  10378: 10209, // Rillaboom gmax
  10379: 10210, // Cinderace gmax
  10380: 10211, // Inteleon gmax
  10381: 10212, // Corviknight gmax
  10382: 10213, // Orbeetle gmax
  10383: 10214, // Drednaw gmax
  10384: 10215, // Coalossal gmax
  10385: 10216, // Flapple gmax
  10386: 10217, // Appletun gmax
  10387: 10218, // Sandaconda gmax
  10388: 10219, // Toxtricity amped gmax
  10389: 10220, // Centiskorch gmax
  10390: 10221, // Hatterene gmax
  10391: 10222, // Grimmsnarl gmax
  10392: 10223, // Alcremie gmax
  10393: 10224, // Copperajah gmax
  10394: 10225, // Duraludon gmax
  10395: 10226, // Urshifu single strike gmax
  10396: 10227, // Urshifu rapid strike gmax
  10397: 10228, // Toxtricity low key gmax
  10398: 10229, // Growlithe hisui
  10399: 10230, // Arcanine hisui
  10400: 10231, // Voltorb hisui
  10401: 10232, // Electrode hisui
  10402: 10233, // Typhlosion hisui
  10403: 10234, // Qwilfish hisui
  10404: 10235, // Sneasel hisui
  10405: 10236, // Samurott hisui
  10406: 10237, // Lilligant hisui
  10407: 10238, // Zorua hisui
  10408: 10239, // Zoroark hisui
  10409: 10240, // Braviary hisui
  10410: 10241, // Sliggoo hisui
  10411: 10242, // Goodra hisui
  10412: 10243, // Avalugg hisui
  10413: 10244, // Decidueye hisui
  10414: 10245, // Dialga origin
  10415: 10246, // Palkia origin
  10416: 10247, // Basculin white striped
  10417: 10248, // Basculegion female
  10418: 10249, // Enamorus therian
  10419: 10250, // Tauros paldea combat breed
  10420: 10251, // Tauros paldea blaze breed
  10421: 10252, // Tauros paldea aqua breed
  10422: 10253, // Wooper paldea
  10423: 10254, // Oinkologne female
  10424: 10255, // Dudunsparce three segment
  10425: 10256, // Palafin hero
  10426: 10257, // Maushold family of three
  10427: 10258, // Tatsugiri droopy
  10428: 10259, // Tatsugiri stretchy
  10429: 10260, // Squawkabilly blue plumage
  10430: 10261, // Squawkabilly yellow plumage
  10431: 10262, // Squawkabilly white plumage
  10432: 10263, // Gimmighoul roaming
  10441: 10272, // Ursaluna bloodmoon
  10442: 10273, // Ogerpon wellspring mask
  10443: 10274, // Ogerpon hearthflame mask
  10444: 10275, // Ogerpon cornerstone mask
  10445: 10276, // Terapagos terastal
  10446: 10277, // Terapagos stellar
  10503: 10278, // Clefable mega
  10504: 10279, // Victreebel mega
  10505: 10280, // Starmie mega
  10506: 10281, // Dragonite mega
  10507: 10282, // Meganium mega
  10508: 10283, // Feraligatr mega
  10509: 10284, // Skarmory mega
  10510: 10285, // Froslass mega
  10511: 10286, // Emboar mega
  10512: 10287, // Excadrill mega
  10513: 10288, // Scolipede mega
  10514: 10289, // Scrafty mega
  10515: 10290, // Eelektross mega
  10516: 10291, // Chandelure mega
  10517: 10292, // Chesnaught mega
  10518: 10293, // Delphox mega
  10519: 10294, // Greninja mega
  10520: 10295, // Pyroar mega
  10521: 10296, // Floette mega
  10522: 10297, // Malamar mega
  10523: 10298, // Barbaracle mega
  10524: 10299, // Dragalge mega
  10525: 10300, // Hawlucha mega
  10526: 10301, // Zygarde mega
  10527: 10302, // Drampa mega
  10528: 10303, // Falinks mega
  10529: 10304, // Raichu mega x
  10530: 10305, // Raichu mega y
  10531: 10306, // Chimecho mega
  10532: 10307, // Absol mega z
  10533: 10308, // Staraptor mega
  10534: 10309, // Garchomp mega z
  10535: 10310, // Lucario mega z
  10536: 10311, // Heatran mega
  10537: 10312, // Darkrai mega
  10538: 10313, // Golurk mega
  10539: 10314, // Meowstic mega
  10540: 10315, // Crabominable mega
  10541: 10316, // Golisopod mega
  10542: 10317, // Magearna mega
  10543: 10318, // Magearna original mega
  10544: 10319, // Zeraora mega
  10545: 10320, // Scovillain mega
  10546: 10321, // Glimmora mega
  10547: 10322, // Tatsugiri curly mega
  10548: 10323, // Tatsugiri droopy mega
  10549: 10324, // Tatsugiri stretchy mega
  10550: 10325, // Baxcalibur mega
  10551: 90668, // Pyroar female
  10552: 90592, // Frillish female
  10553: 90593, // Jellicent female
};

export const POKEMON_OVERRIDES: Record<string, PokemonOverride> = {
  52: {
    // Meowth, kantonian form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [53],
    }
  },
  10209: {
    // Meowth, alolan form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [10210],
    },
  },
  10320: {
    // Meowth, galarian form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [863],
    },
  },
  194: {
    // Wooper, johto form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [195],
    },
  },
  10422: {
    // Wooper, paldean form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [980],
    },
  },
  980: {
    // Clodsire
    evolution: {
      from: [10422]
    }
  },
  866: {
    // Mr Rime
    evolution: {
      from: [10327],
    }
  },
  215: {
    // Sneasel, johto form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [461],
    },
  },
  10404: {
    // Sneasel, hisuian form, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [903],
    },
  },
  903: {
    // Sneasler
    evolution: {
      from: [10404],
    },
  },
  562: {
    // Yamask, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [563],
    },
  },
  10338: {
    // Yamask Galar, evolution line is not branched
    isBranched: false,
    evolution: {
      to: [867],
    },
  },
  867: {
    // Runerigus    
    evolution: {
      from: [10338],
    },
  },
  65: {
    // Alakazam, linking cord fix
    evolutionTrigger: ["Evolved by Trade", "Evolved by Item"],
  },
  68: {
    // Machamp, linking cord fix
    evolutionTrigger: ["Evolved by Trade", "Evolved by Item"],
  },
  76: {
    // Golem, linking cord fix
    evolutionTrigger: ["Evolved by Trade", "Evolved by Item"],
  },
  80: {
    // Slowbro, kantonian form evolution trigger fix
    evolutionTrigger: ["Evolved by Level"],
    evolution: {
      from: [79],
    },
  },
  94: {
    // Gengar, linking cord fix
    evolutionTrigger: ["Evolved by Trade", "Evolved by Item"],
  },
  211: {
    // Qwilfish   
    evolutionStage: 'No Evolution Line',
    evolution: {
      to: []
    }
  },
  904: {
    // Overqwil
    evolution: {
      from: [10403]
    }
  },
  222: {
    // Corsola   
    evolutionStage: 'No Evolution Line',
    evolution: {
      to: []
    }
  },
  122: {
    // Mr mime evolution fix
    evolutionStage: 'Final Stage',
    evolution: {
      to: []
    }
  },
  264: {
    // Linoone evolution fix
    evolutionStage: 'Final Stage',
    evolution: {
      to: [],
    }
  },
  489: {
    // Phione
    evolutionStage: 'No Evolution Line',
    evolution: {
      to: []
    }
  },
  490: {
    // Manaphy
    evolutionStage: 'No Evolution Line',
    evolution: {
      from: []
    }
  },
  550: {
    // Basculin
    evolutionStage: 'No Evolution Line',
    evolution: {
      to: []
    },
  },
  10066: {
    // Basculin
    evolutionStage: 'No Evolution Line',
    evolution: {
      to: [],
    },
  },
  808: {
    // Meltan evolution fix
    evolutionStage: 'First Stage',
    evolution: {
      to: [809],
    }
  },
  809: {
    // Malmetal evolution fix
    evolutionStage: 'Final Stage',
    evolution: {
      from: [808],
    }
  },
  869: {
    // Alcremie, evolved by sweet item fix
    evolutionTrigger: ["Evolved by Item"],
  },
  1013: {
    // sinistcha
    evolutionTrigger: ["Evolved by Item"],
  },
  1018: {
    // archaludon
    evolutionTrigger: ["Evolved by Item"],
  },
  1019: {
    // hydrapple
    evolutionTrigger: ["Evolved by Level"],
  },
  10324: {
    // Slowbro, galarian form evolution trigger fix
    evolutionTrigger: ["Evolved by Item"],
    evolution: {
      from: [10323],
    },
  },
  10414: {
    // palkia origin
    region: "Hisui",
  },
  10415: {
    // dialga origin
    region: "Hisui",
  },
  10416: {
    // basculin white striped
    region: "Hisui",
    evolution: {
      to: [902, 10417],
    },
  },
  10340: {
    // Zygarde 10%
    region: 'Alola'
  },
  10222: {
    // Zygarde complete
    region: 'Alola'
  }, 
  10441: {
    // Ursaluna bloodmoon
    region: 'Paldea',
    evolutionStage: 'No Evolution Line',
    evolutionTrigger: [],
    evolution: {
      from: []
    }
  },
  28:{
    // Sandslash
    evolutionTrigger: ["Evolved by Level"]
  },
  555: {
    // Darmanitan
    evolutionTrigger: ["Evolved by Level"]
  },
  10336: {
    // Darmanitan Galar
    evolutionTrigger: ["Evolved by Item"],
    evolution: {
      from: [10335],
    },
  },
  10067: {
    // Darmanitan zen
    evolutionTrigger: ["Evolved by Level"]
  },
  10337: {
    // Darmanitan Galar zen
    evolutionTrigger: ["Evolved by Item"],
    evolution: {
      from: [10335],
    },
  },
  83: {
    // Farfetch'd
    evolutionStage: 'No Evolution Line',
    evolution: {
      to: [],
    },
  },
  10163: {
    // Floette Eternal
    evolutionStage: 'No Evolution Line',
    evolutionTrigger: [],
    evolution: {
      from: [],
      to: []
    }
  },
  10331: { 
    // Galarian Slowking
    evolutionTrigger: ["Evolved by Item"],
    evolution: {
      from: [10323],
    },
  },
  10332: {
    // Corsola galar
    evolution: {
      to: [864],
    },
  },
  10333: {
    // Zigzagoon galar
    evolution: {
      to: [10334],
    },
  },
  10334: {
    // Linoone galar
    evolution: {
      from: [10333],
      to: [862],
    },
  },
  862: {
    // Obstagoon galar
    evolution: {
      from: [10334],
    },
  },
  554: {
    // Darumaka
    evolution: {
      to: [555, 10067],
    },
  },
  10335: {
    // Darumaka galar
    evolution: {
      to: [10336, 10337],
    },
  },
  10204: { 
    // Alolan Sandslash
    evolutionTrigger: ["Evolved by Item"],
    evolution: {
      from: [10203],
    },
  },
  1011: {
    // Dipplin
    evolutionTrigger: ["Evolved by Item"]
  },
  10401: {
    // Electrode Hisui
    evolutionTrigger: ["Evolved by Item"],
    evolution: {
      from: [10400],
    },
  },
  412: {
    // Burmy plant
    evolution: {
      to: [413, 414],
    },
  },
  10034: {
    // Burmy sandy
    formId: 90412,
    evolution: {
      to: [10036, 414],
    },
  },
  10035: {
    // Burmy trash
    formId: 91412,
    evolution: {
      to: [10037],
    },
  },
  413: {
    // Wormadam plant
    evolution: {
      from: [412],
    },
  },
  10036: {
    // Wormadam sandy
    evolution: {
      from: [10034],
    },
  },
  10037: {
    // Wormadam trash
    evolution: {
      from: [10035],
    },
  },
  414: {
    // Mothim
    evolution: {
      from: [412, 10034, 10035],
    }
  },
  420: {
    // Cherubi
    evolution: {
      to: [421, 10038],
    }
  },
  10038: {
    // Cherrim sunshine
    evolution: {
      from: [420],
    },
  },
  10039: {
    // Shellos east
    evolution: {
      to: [10040],
    },
  },
  10040: {
    // Gastrodon east
    evolution: {
      from: [10039],
    },
  },
  585: {
    // Deerling spring
    evolution: {
      to: [586],
    },
  },
  10068: {
    // Deerling summer
    evolution: {
      to: [10071],
    },
  },
  10069: {
    // Deerling autumn
    evolution: {
      to: [10072],
    },
  },
  10070: {
    // Deerling winter
    evolution: {
      to: [10073],
    },
  },
  586: {
    // Sawsbuck spring
    evolution: {
      from: [585],
    },
  },
  10071: {
    // Sawsbuck summer
    evolution: {
      from: [10068],
    },
  },
  10072: {
    // Sawsbuck autumn
    evolution: {
      from: [10069],
    },
  },
  10073: {
    // Sawsbuck winter
    evolution: {
      from: [10070],
    },
  },
  677: {
    // Espurr
    evolution: {
      to: [678, 10124],
    },
  },
  680: {
    // Aegislash blade
    evolution: {
      to: [681, 10125],
    },
  },
  10125: {
    // Aegislash blade
    evolution: {
      from: [680],
    },
  },
  710: {
    // Pumpkaboo average
    evolution: {
      to: [711],
    },
  },
  10126: {
    // Pumpkaboo small
    evolution: {
      to: [10129],
    },
  },
  10127: {
    // Pumpkaboo large
    evolution: {
      to: [10130],
    },
  },
  10128: {
    // Pumpkaboo super
    evolution: {
      to: [10131],
    },
  },
  711: {
    // Gourgeist average
    evolution: {
      from: [710],
    },
  },
  10129: {
    // Gourgeist small
    evolution: {
      from: [10126],
    },
  },
  10130: {
    // Gourgeist large
    evolution: {
      from: [10127],
    },
  },
  10131: {
    // Gourgeist super
    evolution: {
      from: [10128],
    },
  },
  10193: {
    // Rattata alola
    evolution: {
      to: [10194],
    },
  },
  10194: {
    // Raticate alola
    evolution: {
      from: [10193],
    },
  },
  25: {
    // Pikachu
    evolution: {
      to: [26, 10202],
    },
  },
  10203: {
    // Sandshrew alola
    evolution: {
      to: [10204],
    },
  },
  10205: {
    // Vulpix alola
    evolution: {
      to: [10206],
    },
  },
  10206: {
    // Ninetales alola
    evolution: {
      from: [10205],
    },
  },
  10207: {
    // Diglett alola
    evolution: {
      to: [10208],
    },
  },
  10208: {
    // Dugtrio alola
    evolution: {
      from: [10207],
    },
  },
  10210: {
    // Persian alola
    evolution: {
      from: [10209],
    },
  },
  10211: {
    // Geodude alola
    evolution: {
      to: [10212],
    },
  },
  10212: {
    // Graveler alola
    evolution: {
      from: [10211],
      to: [10213],
    },
  },
  10213: {
    // Golem alola
    evolution: {
      from: [10212],
    },
  },
  10214: {
    // Grimer alola
    evolution: {
      to: [10215],
    },
  },
  10215: {
    // Muk alola
    evolution: {
      from: [10214],
    },
  },
  102: {
    // Exeggcute
    evolution: {
      to: [103, 10216],
    },
  },
  104: {
    // Cubone
    evolution: {
      to: [105, 10217],
    },
  },
  744: {
    // Rockruff
    evolution: {
      to: [745, 10228],
    },
  },
  10310: {
    // Rockruff own tempo
    evolution: {
      to: [10311],
    },
  },
  10311: {
    // Lycanroc dusk
    evolution: {
      from: [10310],
    },
  },
  10321: {
    // Ponyta galar
    evolution: {
      to: [10322],
    },
  },
  10322: {
    // Rapidash galar
    evolution: {
      from: [10321],
    },
  },
  10323: {
    // Slowpoke galar
    evolution: {
      to: [10324, 10331],
    },
  },
  109: {
    // Koffing
    evolution: {
      to: [110, 10326],
    },
  },
  439: {
    // Mime jr
    evolution: {
      to: [122, 10327],
    },
  },
  848: {
    // Toxel
    evolution: {
      to: [849, 10343],
    },
  },
  891: {
    // Kubfu
    evolution: {
      to: [892, 10360],
    },
  },
  10398: {
    // Growlithe hisui
    evolution: {
      to: [10399],
    },
  },
  10399: {
    // Arcanine hisui
    evolution: {
      from: [10398],
    },
  },
  10400: {
    // Voltorb hisui
    evolution: {
      to: [10401],
    },
  },
  156: {
    // Quilava
    evolution: {
      to: [157, 10402],
    },
  },
  502: {
    // Dewott
    evolution: {
      to: [503, 10405],
    },
  },
  548: {
    // Petilil
    evolution: {
      to: [549, 10406],
    },
  },
  10407: {
    // Zorua hisui
    evolution: {
      to: [10408],
    },
  },
  10408: {
    // Zoroark hisui
    evolution: {
      from: [10407],
    },
  },
  627: {
    // Rufflet
    evolution: {
      to: [628, 10409],
    },
  },
  704: {
    // Goomy
    evolution: {
      to: [705, 10410],
    },
  },
  10410: {
    // Sliggoo hisui
    evolution: {
      from: [704],
      to: [10411],
    },
  },
  10411: {
    // Goodra hisui
    evolution: {
      from: [10410],
    },
  },
  712: {
    // Bergmite
    evolution: {
      to: [713, 10412],
    },
  },
  723: {
    // Dartrix
    evolution: {
      to: [724, 10413],
    },
  },
  902: {
    // Basculegion male
    evolution: {
      from: [10416],
    },
  },
  10417: {
    // Basculegion female
    evolution: {
      from: [10416],
    },
  },
  915: {
    // Lechonk
    evolution: {
      to: [916, 10423],
    },
  },
  206: {
    // Dunsparce
    evolution: {
      to: [982, 10424],
    },
  },
  963: {
    // Finizen
    evolution: {
      to: [964, 10425],
    },
  },
  924: {
    // Tandemaus
    evolution: {
      to: [925, 10426],
    },
  },
  1000: {
    // Gholdengo
    evolution: {
      from: [999, 10432],
    },
  },
  667: {
    // Litten
    evolution: {
      to: [668, 10551],
    },
  },
  10552: {
    // Frillish female
    evolution: {
      to: [10553],
    },
  },
  10553: {
    // Jellicent female
    evolution: {
      from: [10552],
    },
  },
  863: {
    // Perrserker
    evolution: {
      from: [10320],
    },
  },
  864: {
    // Cursola
    evolution: {
      from: [10332],
    },
  },
  865: {
    // Sirfetch'd
    evolution: {
      from: [10325],
    },
  },
  520: {
    // Tranquill
    evolution: {
      to: [521, 90521],
    },
  },
  11: {
    // Metapod
    evolution: {
      from: [10, 99901],
    }
  }
};

for (const [sourceFormId, overriddenFormId] of Object.entries(FORM_ID_OVERRIDES)) {
  const existingOverride = POKEMON_OVERRIDES[sourceFormId] ?? {};
  POKEMON_OVERRIDES[sourceFormId] = {
    ...existingOverride,
    formId: overriddenFormId,
  };
}
