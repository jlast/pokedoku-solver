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
    evolution: {
      to: [10036, 414],
    },
  },
  10035: {
    // Burmy trash
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
      to: [711, 10129, 10130, 10131],
    },
  },
  10126: {
    // Pumpkaboo small
    evolution: {
      to: [711, 10129, 10130, 10131],
    },
  },
  10127: {
    // Pumpkaboo large
    evolution: {
      to: [711, 10129, 10130, 10131],
    },
  },
  10128: {
    // Pumpkaboo super
    evolution: {
      to: [711, 10129, 10130, 10131],
    },
  },
  711: {
    // Gourgeist small
    evolution: {
      from: [710, 10126, 10127, 10128],
    },
  },
  10129: {
    // Gourgeist small
    evolution: {
      from: [710, 10126, 10127, 10128],
    },
  },
  10130: {
    // Gourgeist large
    evolution: {
      from: [710, 10126, 10127, 10128],
    },
  },
  10131: {
    // Gourgeist super
    evolution: {
      from: [710, 10126, 10127, 10128],
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
      to: [521, 100521],
    },
  }
};
