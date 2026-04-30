export function parseCategoryId(categoryId: string): { type: string; value: string } {
  const separatorIndex = categoryId.indexOf(":");
  if (separatorIndex === -1) {
    return { type: "", value: categoryId };
  }

  return {
    type: categoryId.slice(0, separatorIndex),
    value: categoryId.slice(separatorIndex + 1),
  };
}

export function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "category";
}

export function buildCategoryOutputFileNames(categoryIds: string[]): Map<string, string> {
  const names = new Map<string, string>();
  const usedCounts = new Map<string, number>();

  const sortedCategoryIds = [...categoryIds].sort((a, b) => a.localeCompare(b));

  for (const categoryId of sortedCategoryIds) {
    const { value } = parseCategoryId(categoryId);
    const base = slugify(value);
    const seenCount = usedCounts.get(base) ?? 0;
    const nextCount = seenCount + 1;
    usedCounts.set(base, nextCount);
    const filename = nextCount === 1 ? `${base}-stats.json` : `${base}-${nextCount}-stats.json`;
    names.set(categoryId, filename);
  }

  return names;
}
