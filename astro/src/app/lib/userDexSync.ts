const pokedokuDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

export function getLatestPokedokuRolloverTimestamp(now = Date.now()): number {
  const parts = Object.fromEntries(
    pokedokuDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const standardTimeMidnight = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 5);
  const midnightParts = Object.fromEntries(
    pokedokuDateFormatter.formatToParts(standardTimeMidnight).map(({ type, value }) => [type, value]),
  );

  // At 05:00 UTC it is either midnight EST or 01:00 EDT, including transition days.
  return standardTimeMidnight - Number(midnightParts.hour) * 60 * 60 * 1000;
}

export function isUserDexStaleForLatestPuzzle(updatedAt: string | null, now = Date.now()): boolean {
  if (!updatedAt) return true;

  const updatedAtTimestamp = Date.parse(updatedAt);
  if (Number.isNaN(updatedAtTimestamp)) return true;

  return updatedAtTimestamp < getLatestPokedokuRolloverTimestamp(now);
}
