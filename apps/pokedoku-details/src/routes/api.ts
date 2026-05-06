import { Hono } from 'hono';
import {
  getPokemonCacheStatus,
  invalidatePokemonCache,
} from '../core/pokemonCache';

export const api = new Hono();

const isAuthorized = (providedKey: string | undefined): boolean => {
  const expectedKey = process.env.CACHE_INVALIDATE_KEY;
  if (!expectedKey) {
    return false;
  }

  return providedKey === expectedKey;
};

api.post('/cache/pokemon/invalidate', (c) => {
  const expectedKey = process.env.CACHE_INVALIDATE_KEY;
  if (!expectedKey) {
    return c.json({ error: 'CACHE_INVALIDATE_KEY is not configured' }, 503);
  }

  const providedKey = c.req.header('x-cache-key');
  if (!isAuthorized(providedKey)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  invalidatePokemonCache();
  return c.json({ success: true, invalidatedAt: new Date().toISOString() }, 200);
});

api.get('/cache/pokemon/status', (c) => {
  const expectedKey = process.env.CACHE_INVALIDATE_KEY;
  if (!expectedKey) {
    return c.json({ error: 'CACHE_INVALIDATE_KEY is not configured' }, 503);
  }

  const providedKey = c.req.header('x-cache-key');
  if (!isAuthorized(providedKey)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json(getPokemonCacheStatus(), 200);
});
