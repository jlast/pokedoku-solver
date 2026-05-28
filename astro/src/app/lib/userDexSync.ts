const POKEDOKU_ROLLOVER_HOUR_UTC = 4;

export function getLatestPokedokuRolloverTimestamp(now = Date.now()): number {
  const current = new Date(now);
  const rollover = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate(),
    POKEDOKU_ROLLOVER_HOUR_UTC,
    0,
    0,
    0,
  );

  if (now >= rollover) return rollover;
  return rollover - 24 * 60 * 60 * 1000;
}

export function isUserDexStaleForLatestPuzzle(updatedAt: string | null, now = Date.now()): boolean {
  if (!updatedAt) return true;

  const updatedAtTimestamp = Date.parse(updatedAt);
  if (Number.isNaN(updatedAtTimestamp)) return true;

  return updatedAtTimestamp < getLatestPokedokuRolloverTimestamp(now);
}
