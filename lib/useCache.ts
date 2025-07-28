// lib/useCache.ts
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
  // Хөтчийн орчныг шалгана
  const isBrowser = typeof window !== 'undefined';

  const getStorage = (type: 'local' | 'session') => {
    if (isBrowser) {
      return type === 'local' ? localStorage : sessionStorage;
    }
    // Хэрэв сервер тал дээр ажиллаж байвал null эсвэл mock объект буцаана
    // Mock объект нь getItem, setItem, removeItem гэх мэт функцуудыг хоосон хийнэ
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}, // clear функц нэмсэн
      length: 0,
      key: () => null
    };
  };

  const now = () => Date.now();

  const getAllKeys = useCallback(
    (storage: 'local' | 'session' = 'session'): string[] => {
      const store = getStorage(storage);
      // isBrowser шалгалтыг энд мөн хийнэ, учир нь store нь mock объект байж болно
      return isBrowser ? Object.keys(store).filter(k => k.startsWith(storageKeyPrefix)) : [];
    },
    [storageKeyPrefix, isBrowser]
  );

  const size = useCallback(
    (storage: 'local' | 'session' = 'session') => isBrowser ? getAllKeys(storage).length : 0,
    [getAllKeys, isBrowser]
  );

  const clearAll = useCallback(
    (storage: 'local' | 'session' = 'session') => {
      if (!isBrowser) return; // Сервер дээр бол юу ч хийхгүй
      const store = getStorage(storage);
      getAllKeys(storage).forEach(key => store.removeItem(key));
    },
    [getAllKeys, isBrowser]
  );

  const enforceLRULimit = useCallback(
    (storage: 'local' | 'session', maxSize: number) => {
      if (!isBrowser) return; // Сервер дээр бол юу ч хийхгүй
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
    [getAllKeys, isBrowser]
  );

  const get = useCallback(
    <T>(key: string, options?: CacheOptions): T | null => {
      if (!isBrowser) return null; // Сервер дээр бол null буцаана
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
    [storageKeyPrefix, defaultOptions, isBrowser]
  );

  const set = useCallback(
    (key: string, data: unknown, options?: CacheOptions) => {
      if (!isBrowser) return; // Сервер дээр бол юу ч хийхгүй
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
    [storageKeyPrefix, defaultOptions, enforceLRULimit, isBrowser]
  );

  const remove = useCallback(
    (key: string, storage: 'local' | 'session' = 'session') => {
      if (!isBrowser) return; // Сервер дээр бол юу ч хийхгүй
      getStorage(storage).removeItem(`${storageKeyPrefix}${key}`);
    },
    [storageKeyPrefix, isBrowser]
  );

  return { get, set, remove, clearAll, size, getAllKeys };
}