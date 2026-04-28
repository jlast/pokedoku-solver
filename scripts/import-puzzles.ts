import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Constraint {
  category: string;
  value: string;
}

interface Puzzle {
  date: string;
  type: string;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, '..', 'import-data.csv');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'puzzles');
const DRY_RUN = process.argv.includes('--dry-run');

const POKEMON_TYPES = new Set([
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
]);

const REGIONS = new Set([
  'Kanto',
  'Johto',
  'Hoenn',
  'Sinnoh',
  'Unova',
  'Kalos',
  'Alola',
  'Galar',
  'Hisui',
  'Paldea',
]);

const CONSTRAINT_MAP: Record<string, Constraint> = {
  'No Evo': { category: 'evolution', value: 'No Evolution Line' },
  'Not Fully Evo': { category: 'evolution', value: 'Not Fully Evolved' },
  'First Evo': { category: 'evolution', value: 'First Stage' },
  'Middle Evo': { category: 'evolution', value: 'Middle Stage' },
  'Last Evo': { category: 'evolution', value: 'Final Stage' },
  'Item Evo': { category: 'evolution', value: 'Evolved by Item' },
  'Level Evo': { category: 'evolution', value: 'Evolved by Level' },
  'Trade Evo': { category: 'evolution', value: 'Evolved by Trade' },
  'Friend Evo': { category: 'evolution', value: 'Evolved by Friendship' },
  'Mono Type': { category: 'types', value: 'Monotype' },
  'Dual Type': { category: 'types', value: 'Dualtype' },
  Legendary: { category: 'category', value: 'Legendary' },
  Gmax: { category: 'category', value: 'Gigantamax' },
  Mega: { category: 'category', value: 'Mega Evolution' },
  Mythical: { category: 'category', value: 'Mythical' },
  Ultra: { category: 'category', value: 'Ultra Beast' },
  Partner: { category: 'category', value: 'Starter' },
  Baby: { category: 'category', value: 'Baby' },
  Paradox: { category: 'category', value: 'Paradox' },
  'Branched Evo': { category: 'category', value: 'Is Branched' },
  Fossil: { category: 'category', value: 'Fossil' },
  Levitate: { category: 'ability', value: 'Levitate' },
  Flamethrower: { category: 'move', value: 'Flamethrower' },
  Thunderbolt: { category: 'move', value: 'Thunderbolt' },
  'Ice Beam': { category: 'move', value: 'Ice Beam' },
  'Shadow Ball': { category: 'move', value: 'Shadow Ball' },
  Earthquake: { category: 'move', value: 'Earthquake' },
  'Razor Leaf': { category: 'move', value: 'Razor Leaf' },
  'Psychic Move': { category: 'move', value: 'Psychic Move' },
  'Calm Mind': { category: 'move', value: 'Calm Mind' },
};

function mapPuzzleType(sourceType: string): string {
  if (sourceType === 'Sponsored') {
    return 'SOCIAL_CREATOR';
  }

  if (sourceType === 'Normal') {
    return 'AUTOMATIC';
  }

  if (sourceType === 'Bonus') {
    return 'BONUS';
  }

  return sourceType.toUpperCase().replace(/\s+/g, '_');
}

function mapConstraint(rawValue: string): Constraint {
  if (POKEMON_TYPES.has(rawValue)) {
    return { category: 'types', value: rawValue };
  }

  if (REGIONS.has(rawValue)) {
    return { category: 'regions', value: rawValue };
  }

  const mapped = CONSTRAINT_MAP[rawValue];
  if (mapped) {
    return mapped;
  }

  return { category: 'category', value: rawValue };
}

function run() {
  const csv = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (!DRY_RUN) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let writtenCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    const parts = line.split(',').map((part) => part.trim());

    if (parts.length < 8) {
      skippedCount += 1;
      continue;
    }

    const [date, sourceType, y1, y2, y3, x1, x2, x3] = parts;
    const constraintValues = [y1, y2, y3, x1, x2, x3];

    if (constraintValues.some((value) => value.length === 0)) {
      skippedCount += 1;
      continue;
    }

    const puzzle: Puzzle = {
      date,
      type: mapPuzzleType(sourceType),
      rowConstraints: [y1, y2, y3].map(mapConstraint),
      colConstraints: [x1, x2, x3].map(mapConstraint),
    };

    if (!DRY_RUN) {
      const outFile = path.join(OUTPUT_DIR, `${date}.json`);
      fs.writeFileSync(outFile, JSON.stringify(puzzle, null, 2));
    }

    writtenCount += 1;
  }

  console.log(`${DRY_RUN ? 'Dry run complete' : 'Import complete'}: ${writtenCount} puzzle files${DRY_RUN ? ' would be written' : ' written'}, ${skippedCount} rows skipped.`);
}

run();
