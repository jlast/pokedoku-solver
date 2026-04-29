export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function makePairSlug(leftSlug: string, rightSlug: string): string {
  return `${leftSlug}-x-${rightSlug}`;
}

export function parsePairSlug(pairSlug: string): { left: string; right: string } | null {
  const parts = pairSlug.split("-x-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { left: parts[0], right: parts[1] };
}
