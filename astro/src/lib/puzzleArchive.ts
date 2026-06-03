import type { Constraint } from "../../../lib/shared/filters";

export interface ArchiveFeaturedPick {
  id: number;
  formId?: number;
  name: string;
  sprite?: string;
  dexDifficulty: string;
  dexDifficultyPercentile: number;
  globalCategoryCombinationCount: number;
}

export interface ArchivePuzzle {
  date: string;
  type: string;
  bonus?: boolean;
  size?: number;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
  featuredPick?: ArchiveFeaturedPick;
  slug: string;
}

export interface PuzzleArchiveIndexFile {
  generatedAt: string;
  dateRange: {
    from: string;
    to: string;
  };
  items: ArchivePuzzle[];
}

function isConstraint(value: unknown): value is Constraint {
  return (
    typeof value === "object" &&
    value !== null &&
    "category" in value &&
    "value" in value &&
    typeof (value as Constraint).category === "string" &&
    typeof (value as Constraint).value === "string"
  );
}

export function isArchivePuzzle(value: unknown): value is ArchivePuzzle {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ArchivePuzzle).date === "string" &&
    typeof (value as ArchivePuzzle).type === "string" &&
    Array.isArray((value as ArchivePuzzle).rowConstraints) &&
    Array.isArray((value as ArchivePuzzle).colConstraints) &&
    (value as ArchivePuzzle).rowConstraints.every(isConstraint) &&
    (value as ArchivePuzzle).colConstraints.every(isConstraint) &&
    typeof (value as ArchivePuzzle).slug === "string"
  );
}

export function isBonusPuzzle(puzzle: Pick<ArchivePuzzle, "type" | "bonus">): boolean {
  return puzzle.type === "BONUS" || puzzle.bonus === true;
}

export function getPuzzleArchiveSlug(puzzle: Pick<ArchivePuzzle, "date" | "type" | "bonus">): string {
  return isBonusPuzzle(puzzle) ? `${puzzle.date}-bonus` : puzzle.date;
}

export function getPuzzleArchiveHref(puzzle: Pick<ArchivePuzzle, "date" | "type" | "bonus">): string {
  const params = new URLSearchParams({ date: puzzle.date });
  if (isBonusPuzzle(puzzle)) {
    params.set("bonus", "1");
  }

  return `/tools/historic-answers/board/?${params.toString()}`;
}

export function sortArchiveItems(items: ArchivePuzzle[]): ArchivePuzzle[] {
  const dedupedItems = Array.from(
    [...items].reduce((map, item) => {
      if (!map.has(item.slug)) {
        map.set(item.slug, item);
      }
      return map;
    }, new Map<string, ArchivePuzzle>()).values(),
  );

  return dedupedItems.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (isBonusPuzzle(a) === isBonusPuzzle(b)) return a.slug.localeCompare(b.slug);
    return isBonusPuzzle(a) ? 1 : -1;
  });
}
