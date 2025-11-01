// /lib/useCache.ts
'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// === Interfaces ===
interface CacheOptions {
  expiryMs?: number;
  storage?: 'local' | 'session' | 'indexedDB';
  maxSize?: number; // (одоогоор хэрэглэхгүй; LRU өргөтгөлд бэлэн)
}

interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
}

type ChangeListener = (key: string, data: unknown) => void;

// === IndexedDB Setup ===
const DB_NAME = 'app-cache-db';
const STORE_NAME = 'key-value-store';

interface CacheDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: CacheItem<unknown>;
  };
}

// Нэг удаа нээгээд дахин ашиглах
let dbPromise: Promise<IDBPDatabase<CacheDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<CacheDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<CacheDBSchema>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

async function safeDbGet(key: string) {
  try {
    const db = await getDb();
    return await db.get(STORE_NAME, key);
  } catch {
    return null;
  }
}
async function safeDbPut(key: string, value: CacheItem<unknown>) {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, value, key);
  } catch {
    /* ignore */
  }
}
async function safeDbDelete(key: string) {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, key);
  } catch {
    /* ignore */
  }
}
async function safeDbClear() {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
  } catch {
    /* ignore */
  }
}

// === Main Hook ===
export function useCache(storageKeyPrefix: string = '', defaultOptions?: CacheOptions) {
  const isBrowser = typeof window !== 'undefined';
  const changeListeners = useRef(new Map<string, Set<ChangeListener>>());

  useEffect(() => {
    const listeners = changeListeners.current;
    return () => {
      listeners.clear();
    };
  }, []);

  const now = () => Date.now();

  const publishChange = useCallback((key: string, data: unknown) => {
    const listeners = changeListeners.current.get(key);
    if (listeners) {
      listeners.forEach(listener => listener(key, data));
    }
  }, []);

  const get = useCallback(
    async <T>(key: string, options?: CacheOptions): Promise<T | null> => {
      if (!isBrowser) return null;
      const { storage = 'session' } = { ...defaultOptions, ...options };
      const prefixedKey = `${storageKeyPrefix}${key}`;

      let raw: string | CacheItem<unknown> | null | undefined;

      if (storage === 'indexedDB') {
        raw = await safeDbGet(prefixedKey);
      } else {
        try {
          const store = storage === 'local' ? window.localStorage : window.sessionStorage;
          raw = store.getItem(prefixedKey);
        } catch {
          raw = null;
        }
      }

      if (!raw) return null;

      try {
        const parsed: CacheItem<T> = typeof raw === 'string' ? JSON.parse(raw) : (raw as CacheItem<T>);

        // Хугацаа дууссан бол устгаад дуусгана
        if (parsed.expiry < now()) {
          if (storage === 'indexedDB') {
            await safeDbDelete(prefixedKey);
          } else {
            try {
              const store = storage === 'local' ? window.localStorage : window.sessionStorage;
              store.removeItem(prefixedKey);
            } catch { /* ignore */ }
          }
          publishChange(key, null);
          return null;
        }

        // lastAccessed шинэчлэх
        const updated: CacheItem<T> = {
          data: parsed.data,
          expiry: parsed.expiry,
          lastAccessed: now(),
        };

        if (storage === 'indexedDB') {
          await safeDbPut(prefixedKey, updated);
        } else {
          try {
            const store = storage === 'local' ? window.localStorage : window.sessionStorage;
            store.setItem(prefixedKey, JSON.stringify(updated));
          } catch { /* ignore */ }
        }

        return parsed.data;
      } catch {
        return null;
      }
    },
    [storageKeyPrefix, defaultOptions, isBrowser, publishChange]
  );

  const set = useCallback(
    async (key: string, data: unknown, options?: CacheOptions) => {
      if (!isBrowser) return;
      const { storage = 'session', expiryMs = 5 * 60 * 1000 } = { ...defaultOptions, ...options };

      const item: CacheItem<unknown> = {
        data,
        expiry: now() + expiryMs,
        lastAccessed: now(),
      };

      const prefixedKey = `${storageKeyPrefix}${key}`;

      if (storage === 'indexedDB') {
        await safeDbPut(prefixedKey, item);
      } else {
        try {
          const store = storage === 'local' ? window.localStorage : window.sessionStorage;
          store.setItem(prefixedKey, JSON.stringify(item));
        } catch { /* ignore */ }
      }

      publishChange(key, data);
    },
    [storageKeyPrefix, defaultOptions, isBrowser, publishChange]
  );

  const remove = useCallback(
    async (key: string, options?: Pick<CacheOptions, 'storage'>) => {
      if (!isBrowser) return;
      const { storage = 'session' } = { ...defaultOptions, ...options };
      const prefixedKey = `${storageKeyPrefix}${key}`;

      if (storage === 'indexedDB') {
        await safeDbDelete(prefixedKey);
      } else {
        try {
          const store = storage === 'local' ? window.localStorage : window.sessionStorage;
          store.removeItem(prefixedKey);
        } catch { /* ignore */ }
      }

      publishChange(key, null);
    },
    [storageKeyPrefix, defaultOptions, isBrowser, publishChange]
  );

  const clearAll = useCallback(
    async (options?: Pick<CacheOptions, 'storage'>) => {
      if (!isBrowser) return;
      const { storage = 'session' } = { ...defaultOptions, ...options };

      if (storage === 'indexedDB') {
        await safeDbClear();
      } else {
        try {
          const store = storage === 'local' ? window.localStorage : window.sessionStorage;
          const keysToRemove: string[] = [];
          for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (key && key.startsWith(storageKeyPrefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => store.removeItem(key));
        } catch { /* ignore */ }
      }

      // БҮХ бүртгэлтэй сонсогчдод өөрийн түлхүүрээр нь “clear” мэдэгдэл илгээнэ
      changeListeners.current.forEach((listeners, logicalKey) => {
        listeners.forEach(listener => listener(logicalKey, null));
      });
    },
    [storageKeyPrefix, defaultOptions, isBrowser]
  );

  const subscribe = useCallback((key: string, listener: ChangeListener) => {
    if (!changeListeners.current.has(key)) {
      changeListeners.current.set(key, new Set());
    }
    changeListeners.current.get(key)!.add(listener);

    return () => {
      const keyListeners = changeListeners.current.get(key);
      if (keyListeners) {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) {
          changeListeners.current.delete(key);
        }
      }
    };
  }, []);

  // LRU maxSize г.м өргөтгөлүүдийг эндээс үргэлжлүүлж болно
  return { get, set, remove, clearAll, subscribe };
}

// === Reactive State Hook ===
export function useCachedState<T>(
  key: string,
  defaultValue: T,
  options?: CacheOptions
): [T, (data: T) => Promise<void>, boolean] {
  // NB: Prefix-ээ CacheProvider-тайгаа адилхан байлгаарай
  const cache = useCache('app_cache_prefix_');
  const [state, setState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  // Анхны утгыг кэшээс асинхроноор авах
  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async () => {
      const cachedData = await cache.get<T>(key, options);
      if (isMounted) {
        setState(cachedData !== null ? cachedData : defaultValue);
        setLoading(false);
      }
    };

    loadInitialState();

    return () => { isMounted = false; };
  }, [key, cache, defaultValue, options]);

  // Кэшийн өөрчлөлтийг сонсож state-г шинэчлэх
  useEffect(() => {
    const unsubscribe = cache.subscribe(key, (_subscriptionKey, data) => {
      setState(data !== null ? (data as T) : defaultValue);
    });
    return unsubscribe;
  }, [key, cache, defaultValue]);

  const setCachedState = useCallback(
    async (data: T) => {
      await cache.set(key, data, options);
      // subscribe механизмаар state автоматаар шинэчлэгдэнэ
    },
    [key, cache, options]
  );

  return [state, setCachedState, loading];
}