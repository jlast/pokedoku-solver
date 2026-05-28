import { describe, expect, it } from 'vitest';
import { getLatestPokedokuRolloverTimestamp, isUserDexStaleForLatestPuzzle } from './userDexSync';

describe('getLatestPokedokuRolloverTimestamp', () => {
  it('uses the current day rollover after 04:00 UTC', () => {
    expect(getLatestPokedokuRolloverTimestamp(Date.parse('2026-05-27T08:30:00.000Z'))).toBe(
      Date.parse('2026-05-27T04:00:00.000Z'),
    );
  });

  it('uses the previous day rollover before 04:00 UTC', () => {
    expect(getLatestPokedokuRolloverTimestamp(Date.parse('2026-05-27T03:59:59.000Z'))).toBe(
      Date.parse('2026-05-26T04:00:00.000Z'),
    );
  });
});

describe('isUserDexStaleForLatestPuzzle', () => {
  it('treats missing and invalid timestamps as stale', () => {
    const now = Date.parse('2026-05-27T12:00:00.000Z');

    expect(isUserDexStaleForLatestPuzzle(null, now)).toBe(true);
    expect(isUserDexStaleForLatestPuzzle('not-a-date', now)).toBe(true);
  });

  it('treats timestamps before the latest rollover as stale', () => {
    const now = Date.parse('2026-05-27T12:00:00.000Z');

    expect(isUserDexStaleForLatestPuzzle('2026-05-27T03:59:59.000Z', now)).toBe(true);
    expect(isUserDexStaleForLatestPuzzle('2026-05-27T04:00:00.000Z', now)).toBe(false);
    expect(isUserDexStaleForLatestPuzzle('2026-05-27T08:00:00.000Z', now)).toBe(false);
  });
});
