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

  it.each([
    ['2026-11-03T04:01:43.000Z', '2026-11-02T05:00:00.000Z'],
    ['2026-11-03T05:00:00.000Z', '2026-11-03T05:00:00.000Z'],
    ['2026-11-03T12:00:00.000Z', '2026-11-03T05:00:00.000Z'],
    ['2026-03-08T06:59:59.000Z', '2026-03-08T05:00:00.000Z'],
    ['2026-03-08T07:00:00.000Z', '2026-03-08T05:00:00.000Z'],
    ['2026-03-09T04:00:00.000Z', '2026-03-09T04:00:00.000Z'],
    ['2026-11-01T05:59:59.000Z', '2026-11-01T04:00:00.000Z'],
    ['2026-11-01T06:00:00.000Z', '2026-11-01T04:00:00.000Z'],
    ['2027-01-01T04:59:59.000Z', '2026-12-31T05:00:00.000Z'],
  ])('uses Eastern midnight for %s', (now, rollover) => {
    expect(getLatestPokedokuRolloverTimestamp(Date.parse(now))).toBe(Date.parse(rollover));
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

  it('uses the standard-time rollover when checking freshness', () => {
    const now = Date.parse('2026-11-03T12:00:00.000Z');

    expect(isUserDexStaleForLatestPuzzle('2026-11-03T04:01:43.000Z', now)).toBe(true);
    expect(isUserDexStaleForLatestPuzzle('2026-11-03T05:00:00.000Z', now)).toBe(false);
  });
});
