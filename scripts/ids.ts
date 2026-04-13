import type { PokemonRegion } from "../src/types";


export const REGION_BY_ID: Record<number, PokemonRegion> = {};
export const regions: { name: PokemonRegion; start: number; end: number }[] = [
  { name: 'Kanto', start: 1, end: 151 },
  { name: 'Johto', start: 152, end: 251 },
  { name: 'Hoenn', start: 252, end: 386 },
  { name: 'Sinnoh', start: 387, end: 493 },
  { name: 'Unova', start: 494, end: 649 },
  { name: 'Kalos', start: 650, end: 721 },
  { name: 'Alola', start: 722, end: 807 },
  { name: 'Galar', start: 810, end: 898 },
  { name: 'Hisui', start: 899, end: 905 },
  { name: 'Paldea', start: 906, end: 1025 },
];

for (const r of regions) {
  for (let i = r.start; i <= r.end; i++) {
    REGION_BY_ID[i] = r.name;
  }
}

export const STARTER_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 133, 
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  252, 253, 254, 255, 256, 257, 258, 259, 260,
  387, 388, 389, 390, 391, 392, 393, 394, 395,
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  650, 651, 652, 653, 654, 655, 656, 657, 658, 
  722, 723, 724, 725, 726, 727, 728, 729, 730,
  810, 811, 812, 813, 814, 815, 816, 817, 818,
  906, 907, 908, 909, 910, 911, 912, 913, 914,
]);

export const ULTRA_BEASTS = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);

export const PARADOX_POKEMON = new Set([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1007, 1008, 1009, 1010, 1020, 1021, 1022, 1023
]);

export const FOSSIL_IDS = new Set([
  138, 139, 140, 141, 142,
  345, 346, 347, 348,
  408, 409, 410, 411,
  564, 565, 566, 567,
  696, 697, 698, 699,
  880, 881, 882, 883,
]);

export const IGNORED_FORM_IDS = new Set([
  10433, 10434, 10435, 10436,  // Koraidon
  10437, 10438, 10439, 10440  // Miraidon
])

export const IGNORED_FORMS = new Set([
  'totem'
]);