import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDualTypeRuntimeStats } from './categoryRuntimeStats';

describe('categoryRuntimeStats', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses canonical dual-type pair ordering for runtime stats URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lastAppeared: { daysAgo: 12, date: '2026-05-01' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getDualTypeRuntimeStats('Flying', 'Dualtype');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.pokedoku-helper.com/data/runtime/category-pairs/dualtype-x-flying-stats.json'
    );
  });
});
