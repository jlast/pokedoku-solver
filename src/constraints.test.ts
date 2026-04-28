import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POKEMON_DATA = path.join(__dirname, '..', 'public', 'pokemon.json');

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  region?: string;
  category?: string;
  evolutionStage?: string;
  evolutionTrigger?: string[];
  isBranched?: boolean;
  specialForm?: string;
}

let data: Pokemon[];

beforeAll(() => {
  const json = fs.readFileSync(POKEMON_DATA, 'utf-8');
  data = JSON.parse(json);
});

describe('constraint filtering', () => {
  describe('type constraints', () => {
    it('should get a big list for ghost type and dual type', () => { 
      const expected = ['Absol Mega Z', 'Aegislash Blade', 'Aegislash Shield', 'Annihilape', 'Basculegion Female', 'Basculegion Male', 'Blacephalon', 'Brambleghast', 'Bramblin', 'Calyrex Shadow', 'Ceruledge', 'Chandelure', 'Chandelure Mega', 'Decidueye', 'Dhelmise', 'Doublade', 'Dragapult', 'Drakloak', 'Dreepy', 'Drifblim', 'Drifloon', 'Flutter Mane', 'Frillish Female', 'Frillish Male', 'Froslass', 'Froslass Mega', 'Gastly', 'Gengar', 'Gengar Gmax', 'Gengar Mega', 'Gholdengo', 'Giratina Altered', 'Giratina Origin', 'Golett', 'Golurk', 'Golurk Mega', 'Gourgeist Average', 'Gourgeist Large', 'Gourgeist Small', 'Gourgeist Super', 'Haunter', 'Honedge', 'Hoopa', 'Jellicent Female', 'Jellicent Male', 'Lampent', 'Litwick', 'Lunala', 'Marowak Alola', 'Marshadow', 'Mimikyu Busted', 'Mimikyu Disguised', 'Necrozma Dawn', 'Oricorio Sensu', 'Palossand', 'Pecharunt', 'Phantump', 'Poltchageist', 'Pumpkaboo Average', 'Pumpkaboo Large', 'Pumpkaboo Small', 'Pumpkaboo Super', 'Rotom', 'Runerigus', 'Sableye', 'Sableye Mega', 'Sandygast', 'Shedinja', 'Sinistcha', 'Skeledirge', 'Spiritomb', 'Trevenant', 'Typhlosion Hisui', 'Yamask Galar', 'Zoroark Hisui', 'Zorua Hisui'];
      const received = data.filter(p => p.types.includes('Ghost') && p.types.length > 1).map(p => p.name);
      expect(received.sort().map((name) => name.toLowerCase())).toEqual(expected.sort().map((name) => name.toLowerCase()));
    });

    it('should get a big list for legendary and dual type', () => {
      const expected = ['Koraidon', 'Lugia', 'Rayquaza', 'Ho Oh', 'Zapdos', 'Groudon Primal', 'Miraidon', 'Mewtwo Mega X', 'Dialga', 'Zapdos Galar', 'Yveltal', 'Articuno Galar', 'Articuno', 'Zekrom', 'Palkia', 'Rayquaza Mega', 'Moltres Galar', 'Moltres', 'Reshiram', 'Lunala', 'Giratina Origin', 'Calyrex Ice', 'Ogerpon Cornerstone Mask', 'Thundurus Therian', 'Palkia Origin', 'Heatran Mega', 'Giratina Altered', 'Thundurus Incarnate', 'Solgaleo', 'Dialga Origin', 'Kyurem White', 'Heatran', 'Ogerpon Hearthflame Mask', 'Zygarde Complete', 'Zacian Crowned', 'Zygarde 10%', 'Zamazenta Crowned', 'Virizion', 'Chien Pao', 'Kyurem Black', 'Ogerpon Wellspring Mask', 'Necrozma Ultra', 'Eternatus Eternamax', 'Necrozma Dusk', 'Cobalion', 'Chi Yu', 'Necrozma Dawn', 'Ting Lu', 'Fezandipiti', 'Kyurem', 'Calyrex Shadow', 'Urshifu Rapid Strike Gmax', 'Terrakion', 'Eternatus', 'Munkidori', 'Landorus Therian', 'Latias', 'Wo Chien', 'Okidogi', 'Latias Mega', 'Latios Mega', 'Calyrex', 'Latios', 'Tapu Lele', 'Tapu Bulu', 'Urshifu Single Strike Gmax', 'Zygarde Mega', 'Zygarde 50%', 'Urshifu Rapid Strike', 'Enamorus Therian', 'Tapu Fini', 'Enamorus Incarnate', 'Landorus Incarnate', 'Tapu Koko', 'Urshifu Single Strike'];
      const received = data.filter(p => p.category === 'Legendary' && p.types.length > 1).map(p => p.name);
      expect(received.sort().map((name) => name.toLowerCase())).toEqual(expected.sort().map((name) => name.toLowerCase()));
    });

    it('should return a big list for ice and evolved by item', () => {
      const expectedList = ['Crabominable', 'Cloyster', 'Darmanitan galar zen', 'Sandslash alola', 'Weavile', 'Cetitan', 'Darmanitan galar standard', 'Ninetales alola', 'Froslass', 'Glaceon'];
      const byItem = data.filter(p => p.evolutionTrigger?.includes('Evolved by Item') && p.types.includes('Ice')).map(p => p.name);
      expect(byItem.sort()).toEqual(expectedList.sort());
    });

    it('water type + evolved by item should return only galarian slowbro', () => {
      const byItem = data.filter(p => 
        p.evolutionTrigger?.includes('Evolved by Item')
      );
      
      const slowbroGalar = byItem.find(p => p.name === 'Slowbro galar');
      const slowbro = byItem.find(p => p.name === 'Slowbro');
      
      expect(slowbroGalar).toBeDefined();
      expect(slowbro).toBeUndefined();
    });
  });

  describe('evolution triggers', () => {
    it('should have Pokemon with Evolved by Level', () => {
      const byLevel = data.filter(p => p.evolutionTrigger?.includes('Evolved by Level'));
      expect(byLevel.length).toBeGreaterThan(0);
    });

    it('should have Pokemon with Evolved by Item', () => {
      const byItem = data.filter(p => p.evolutionTrigger?.includes('Evolved by Item'));
      expect(byItem.length).toBeGreaterThan(0);
    });

    it('should have Pokemon with Evolved by Trade', () => {
      const byTrade = data.filter(p => p.evolutionTrigger?.includes('Evolved by Trade'));
      expect(byTrade.length).toBeGreaterThan(0);
    });

    it('should have Pokemon with Evolved by Friendship', () => {
      const byFriend = data.filter(p => p.evolutionTrigger?.includes('Evolved by Friendship'));
      expect(byFriend.length).toBeGreaterThan(0);
    });
  });

  describe('categories', () => {
    it('should have Legendaries', () => {
      const legendaries = data.filter(p => p.category === 'Legendary');
      expect(legendaries.length).toBeGreaterThan(0);
    });

    it('should have Mythicals', () => {
      const mythicals = data.filter(p => p.category === 'Mythical');
      expect(mythicals.length).toBeGreaterThan(0);
    });

    it('should have Ultra Beasts', () => {
      const ultraBeasts = data.filter(p => p.category === 'Ultra Beast');
      expect(ultraBeasts.length).toBeGreaterThan(0);
    });

    it('should have Paradox', () => {
      const paradox = data.filter(p => p.category === 'Paradox');
      expect(paradox.length).toBeGreaterThan(0);
    });

    it('should have Fossils', () => {
      const fossils = data.filter(p => p.category === 'Fossil');
      expect(fossils.length).toBeGreaterThan(0);
    });
  });

  describe('special Pokemon', () => {
    it('Eevee should be First Stage and branched', () => {
      const eevee = data.find(p => p.name === 'Eevee');
      expect(eevee).toBeDefined();
      expect(eevee!.evolutionStage).toBe('First Stage');
      expect(eevee!.isBranched).toBe(true);
    });

    it('Kirlia should be Middle stage and branched', () => {
      const kirlia = data.find(p => p.name === 'Kirlia');
      expect(kirlia).toBeDefined();
      expect(kirlia!.evolutionStage).toBe('Middle Stage');
      expect(kirlia!.isBranched).toBe(true);
    });

    it('Meowth should NOT be branched (regional evolution)', () => {
      const meowth = data.find(p => p.name === 'Meowth');
      expect(meowth).toBeDefined();
      expect(meowth!.isBranched).toBe(false);
    });

    it('Bulbasaur should be Starter', () => {
      const bulbasaur = data.find(p => p.name === 'Bulbasaur');
      expect(bulbasaur).toBeDefined();
      expect(bulbasaur!.category).toBe('Starter');
    });

    it('Mewtwo should be Legendary', () => {
      const mewtwo = data.find(p => p.name === 'Mewtwo');
      expect(mewtwo).toBeDefined();
      expect(mewtwo!.category).toBe('Legendary');
    });

    it('Mew should be Mythical', () => {
      const mew = data.find(p => p.name === 'Mew');
      expect(mew).toBeDefined();
      expect(mew!.category).toBe('Mythical');
    });

    it('Shellos west and east should exist', () => {
      const shellos = data.filter(p => p.name.includes('Shellos'));
      expect(shellos.length).toBe(2);
      expect(shellos.some(p => p.name === 'Shellos west')).toBe(true);
      expect(shellos.some(p => p.name === 'Shellos east')).toBe(true);
    });

    it('Gastrodon west and east should exist', () => {
      const gastrodon = data.filter(p => p.name.includes('Gastrodon'));
      expect(gastrodon.length).toBe(2);
      expect(gastrodon.some(p => p.name === 'Gastrodon west')).toBe(true);
      expect(gastrodon.some(p => p.name === 'Gastrodon east')).toBe(true);
    });

    it('has Mega Evolution forms', () => {
      const megas = data.filter(p => p.specialForm === 'Mega Evolution');
      expect(megas.length).toBeGreaterThan(0);
    });

    it('has Gigantamax forms', () => {
      const gmax = data.filter(p => p.specialForm === 'Gigantamax');
      expect(gmax.length).toBeGreaterThan(0);
    });
  });
});
