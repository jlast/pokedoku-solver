import type {
  EvolutionMethod,
  EvolutionTrigger,
  PokemonType,
  PokemonRegion,
  SpecialForm,
  PokemonCategory,
} from "../src/utils/types";

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
  "sinistea",
  "polteageist",
  "koraidon",
  "miraidon",
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
};

export interface PokemonOverride {
  types?: [PokemonType, PokemonType?] | [PokemonType];
  region?: PokemonRegion;
  evolutionStage?: EvolutionMethod;
  evolutionTrigger?: EvolutionTrigger[];
  isBranched?: boolean;
  specialForm?: SpecialForm;
  category?: PokemonCategory;
  sprite?: string;
}

export const POKEMON_OVERRIDES: Record<string, PokemonOverride> = {
  52: {
    // Meowth, kantonian form, evolution line is not branched
    isBranched: false,
  },
  10209: {
    // Meowth, alolan form, evolution line is not branched
    isBranched: false,
  },
  10320: {
    // Meowth, galarian form, evolution line is not branched
    isBranched: false,
  },
  194: {
    // Wooper, johto form, evolution line is not branched
    isBranched: false,
  },
  10422: {
    // Wooper, paldean form, evolution line is not branched
    isBranched: false,
  },
  215: {
    // Sneasel, johto form, evolution line is not branched
    isBranched: false,
  },
  10404: {
    // Sneasel, hisuian form, evolution line is not branched
    isBranched: false,
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
    // Slowbro, galarian form evolution trigger fix
    evolutionTrigger: ["Evolved by Level"],
  },
  94: {
    // Gengar, linking cord fix
    evolutionTrigger: ["Evolved by Trade", "Evolved by Item"],
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
  },
  10220: {
    // Zygarde 10%
    region: 'Alola'
  },
  10222: {
    // Zygarde complete
    region: 'Alola'
  }, 

};
