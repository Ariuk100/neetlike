// lib/useCache.ts (with LRU, size, clearAll, Context)
import { useCallback } from 'react';

interface CacheOptions {
  expiryMs?: number; // default: 5 минут
  storage?: 'local' | 'session';
  maxSize?: number; // optional LRU limit
}

interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
}

export function useCache(storageKeyPrefix: string = '', defaultOptions?: CacheOptions) {
  const getStorage = (type: 'local' | 'session') =>
    type === 'local' ? localStorage : sessionStorage;

  const now = () => Date.now();

  const getAllKeys = useCallback(
    (storage: 'local' | 'session' = 'session'): string[] => {
      const store = getStorage(storage);
      return Object.keys(store).filter(k => k.startsWith(storageKeyPrefix));
    },
    [storageKeyPrefix]
  );

  const size = useCallback(
    (storage: 'local' | 'session' = 'session') => getAllKeys(storage).length,
    [getAllKeys]
  );

  const clearAll = useCallback(
    (storage: 'local' | 'session' = 'session') => {
      const store = getStorage(storage);
      getAllKeys(storage).forEach(key => store.removeItem(key));
    },
    [getAllKeys]
  );

  const enforceLRULimit = useCallback(
    (storage: 'local' | 'session', maxSize: number) => {
      const store = getStorage(storage);
      const keys = getAllKeys(storage);
      if (keys.length <= maxSize) return;

      const items: { key: string; lastAccessed: number }[] = keys.map(key => {
        try {
          const { lastAccessed } = JSON.parse(store.getItem(key) || '{}');
          return { key, lastAccessed };
        } catch {
          return { key, lastAccessed: 0 };
        }
      });
      items.sort((a, b) => a.lastAccessed - b.lastAccessed);
      items.slice(0, keys.length - maxSize).forEach(item => store.removeItem(item.key));
    },
    [getAllKeys]
  );

  const get = useCallback(
    <T>(key: string, options?: CacheOptions): T | null => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { storage = 'session', expiryMs = 5 * 60 * 1000 } = {
        ...defaultOptions,
        ...options,
      };
      const store = getStorage(storage);
      const raw = store.getItem(`${storageKeyPrefix}${key}`);
      if (!raw) return null;

      try {
        const parsed: CacheItem<T> = JSON.parse(raw);
        if (parsed.expiry < now()) {
          store.removeItem(`${storageKeyPrefix}${key}`);
          return null;
        }
        parsed.lastAccessed = now();
        store.setItem(`${storageKeyPrefix}${key}`, JSON.stringify(parsed));
        return parsed.data;
      } catch {
        return null;
      }
    },
    [storageKeyPrefix, defaultOptions]
  );

  const set = useCallback(
    (key: string, data: unknown, options?: CacheOptions) => {
      const { storage = 'session', expiryMs = 5 * 60 * 1000, maxSize } = {
        ...defaultOptions,
        ...options,
      };
      const store = getStorage(storage);
      const item: CacheItem<unknown> = {
        data,
        expiry: now() + expiryMs,
        lastAccessed: now(),
      };
      store.setItem(`${storageKeyPrefix}${key}`, JSON.stringify(item));
      if (maxSize) enforceLRULimit(storage, maxSize);
    },
    [storageKeyPrefix, defaultOptions, enforceLRULimit]
  );

  const remove = useCallback(
    (key: string, storage: 'local' | 'session' = 'session') => {
      getStorage(storage).removeItem(`${storageKeyPrefix}${key}`);
    },
    [storageKeyPrefix]
  );

  return { get, set, remove, clearAll, size, getAllKeys };
}