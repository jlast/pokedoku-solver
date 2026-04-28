import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ConstraintCategory } from '../src/utils/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'today-puzzle.json');

const GENERATION_MAP: Record<string, string> = {
  'generation-i': 'Kanto',
  'generation-ii': 'Johto',
  'generation-iii': 'Hoenn',
  'generation-iv': 'Sinnoh',
  'generation-v': 'Unova',
  'generation-vi': 'Kalos',
  'generation-vii': 'Alola',
  'generation-viii': 'Galar',
  'generation-ix': 'Paldea',
};

const EVOLUTION_MAP: Record<string, string> = {
  'none': 'No Evolution Line',
  'premature': 'Not Fully Evolved'
};

interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

interface RawConstraint {
  type: string;
  obj: string | boolean;
  excludedForms?: unknown[];
}

function mapConstraintType(type: string, obj: string | boolean): ConstraintMapping | null {
  switch (type) {
    case 'GENERATION':
      if (typeof obj === 'string' && GENERATION_MAP[obj]) {
        return { category: 'region', value: GENERATION_MAP[obj] };
      }
      return null;

    case 'POKEMON_TYPE':
      if (typeof obj === 'string') {
        const typeName = obj.charAt(0).toUpperCase() + obj.slice(1);
        return { category: 'type', value: typeName };
      }
      return null;
      
    case 'EVOLUTION_POSITION':
      if (typeof obj === 'string' && EVOLUTION_MAP[obj]) {
        return { category: 'evolution', value: EVOLUTION_MAP[obj] };
      }
      return null;

    case 'MONOTYPE':
      return { category: 'typeline', value: 'Monotype' };

    case 'DUAL_TYPE':
      return { category: 'typeline', value: 'Dualtype' };

    case 'LEGENDARY':
      return { category: 'category', value: 'Legendary' };

    case 'MEGA':
      return { category: 'category', value: 'Mega' };

    case 'MYTHICAL':
      return { category: 'category', value: 'Mythical' };

    case 'FIRST_STAGE':
      return { category: 'evolution', value: 'First Stage' };

    case 'MIDDLE_STAGE':
      return { category: 'evolution', value: 'Middle Stage' };

    case 'FINAL_STAGE':
      return { category: 'evolution', value: 'Final Stage' };

    case 'ULTRA_BEAST':
      return { category: 'category', value: 'Ultra Beast' };

    case 'STARTER':
      return { category: 'category', value: 'Starter' };

    case 'BABY':
      return { category: 'category', value: 'Baby' };

    case 'PARADOX':
      return { category: 'category', value: 'Paradox' };

    case 'BRANCHED':
      if (obj === true) {
        return { category: 'branched', value: 'Yes' };
      }
      return null;

    default:
      console.warn(`Unknown constraint type: ${type}, value: ${obj}`);
      return null;
  }
}

function extractPuzzleFromPush(pushContent: string): {
  type: string;
  date: string;
  x1: RawConstraint;
  x2: RawConstraint;
  x3: RawConstraint;
  y1: RawConstraint;
  y2: RawConstraint;
  y3: RawConstraint;
} | null {
  const puzzleMatch = pushContent.match(/\\"puzzle\\":\s*\{(.+?)\}(?=,\s*\\"isCurrentPuzzle\\")/s);
  if (!puzzleMatch) {
    console.error('Could not find puzzle object');
    return null;
  }

  const puzzleStr = '{' + puzzleMatch[1] + '}';
  const unescapedStr = puzzleStr.replace(/\\"/g, '"');

  try {
    const puzzle = JSON.parse(unescapedStr);
    return puzzle;
  } catch (e) {
    console.error('Failed to parse puzzle JSON:', e);
    return null;
  }
}

async function fetchPuzzle(): Promise<void> {
  console.log("Fetching today's puzzle from pokedoku.com...");

  const response = await fetch('https://pokedoku.com/');
  if (!response.ok) {
    throw new Error(`Failed to fetch puzzle: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  console.log('HTML received, parsing puzzle data...');

  let pushStart = html.indexOf('__next_f');
  let puzzlePush = '';

  while (pushStart !== -1) {
    const pushEnd = html.indexOf('])</script>', pushStart);
    if (pushEnd !== -1) {
      const push = html.slice(pushStart, pushEnd + 18);
      if (push.includes('\\"puzzle\\"')) {
        puzzlePush = push;
        break;
      }
    }
    pushStart = html.indexOf('__next_f', pushStart + 1);
  }

  if (!puzzlePush) {
    throw new Error('Could not find puzzle data in page');
  }

  const puzzle = extractPuzzleFromPush(puzzlePush);
  if (!puzzle) {
    throw new Error('Failed to extract puzzle data from HTML');
  }

  console.log(`Found puzzle: ${puzzle.type} - ${puzzle.date}`);

  const mapConstraint = (c: RawConstraint) => mapConstraintType(c.type, c.obj);

  const rowConstraints = [puzzle.y1, puzzle.y2, puzzle.y3].map(mapConstraint);
  const colConstraints = [puzzle.x1, puzzle.x2, puzzle.x3].map(mapConstraint);

  if (rowConstraints.some(c => c === null) || colConstraints.some(c => c === null)) {
    throw new Error('Some constraints could not be mapped');
  }

  const output = {
    date: puzzle.date,
    type: puzzle.type,
    rowConstraints,
    colConstraints,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Puzzle saved to ${OUTPUT_FILE}`);

  console.log(`Row constraints: ${rowConstraints.map(c => `${c!.category}:${c!.value}`).join(', ')}`);
  console.log(`Col constraints: ${colConstraints.map(c => `${c!.category}:${c!.value}`).join(', ')}`);
}

fetchPuzzle().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
