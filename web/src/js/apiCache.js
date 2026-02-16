/**
 * Simple sessionStorage cache for API GET responses.
 * Eliminates loading spinners when navigating between pages.
 *
 * Usage:
 *   import { getFromCache, saveToCache, clearCache } from '../../js/apiCache.js';
 *
 *   // After mutations: clear cache so next load fetches fresh
 *   clearCache();
 */

const CACHE_PREFIX = 'api_cache_';
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes cache time

export function getFromCache(url, ttl = DEFAULT_TTL) {
  const key = CACHE_PREFIX + url;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveToCache(url, data) {
  const key = CACHE_PREFIX + url;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage full — silently ignore
  }
}

export function clearCache() {
  const toRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key.startsWith(CACHE_PREFIX)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(k => sessionStorage.removeItem(k));
}
