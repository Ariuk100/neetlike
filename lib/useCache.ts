// /lib/useCache.ts
'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { openDB, DBSchema } from 'idb';

// === Interfaces ===
interface CacheOptions {
  expiryMs?: number;
  storage?: 'local' | 'session' | 'indexedDB';
  maxSize?: number;
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

async function getDb() {
  return openDB<CacheDBSchema>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
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
        raw = await (await getDb()).get(STORE_NAME, prefixedKey);
      } else {
        const store = storage === 'local' ? localStorage : sessionStorage;
        raw = store.getItem(prefixedKey);
      }

      if (!raw) return null;

      try {
        const parsed: CacheItem<T> = typeof raw === 'string' ? JSON.parse(raw) : raw;
        
        if (parsed.expiry < now()) {
          if (storage === 'indexedDB') {
            await (await getDb()).delete(STORE_NAME, prefixedKey);
          } else {
            const store = storage === 'local' ? localStorage : sessionStorage;
            store.removeItem(prefixedKey);
          }
          publishChange(key, null);
          return null;
        }

        // Update lastAccessed timestamp for LRU
        parsed.lastAccessed = now();
        const valueToStore = storage === 'indexedDB' ? parsed : JSON.stringify(parsed);

        if (storage === 'indexedDB') {
            await (await getDb()).put(STORE_NAME, parsed, prefixedKey);
        } else {
            const store = storage === 'local' ? localStorage : sessionStorage;
            store.setItem(prefixedKey, valueToStore as string);
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
        await (await getDb()).put(STORE_NAME, item, prefixedKey);
      } else {
        const store = storage === 'local' ? localStorage : sessionStorage;
        store.setItem(prefixedKey, JSON.stringify(item));
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
        await (await getDb()).delete(STORE_NAME, prefixedKey);
      } else {
        const store = storage === 'local' ? localStorage : sessionStorage;
        store.removeItem(prefixedKey);
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
        await (await getDb()).clear(STORE_NAME);
      } else {
        const store = storage === 'local' ? localStorage : sessionStorage;
        const keysToRemove: string[] = [];
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          if (key && key.startsWith(storageKeyPrefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => store.removeItem(key));
      }
      changeListeners.current.forEach(listeners => listeners.forEach(listener => listener('', null)));
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

  // LRU limit зэрэг бусад функцуудыг энд нэмж шинэчилж болно
  return { get, set, remove, clearAll, subscribe };
}


// === Reactive State Hook ===
export function useCachedState<T>(
  key: string,
  defaultValue: T,
  options?: CacheOptions
): [T, (data: T) => Promise<void>, boolean] {
  const cache = useCache('app_cache_prefix_'); // Prefix-г CacheProvider-тайгаа адилхан болгох
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
    const unsubscribe = cache.subscribe(key, (subscriptionKey, data) => {
      if (subscriptionKey === key) {
        setState(data !== null ? (data as T) : defaultValue);
      }
    });
    return unsubscribe;
  }, [key, cache, defaultValue]);

  const setCachedState = useCallback(
    async (data: T) => {
      await cache.set(key, data, options);
      // publish/subscribe механизмаар state автоматаар шинэчлэгдэх тул энд setState дуудах шаардлагагүй
    },
    [key, cache, options]
  );

  return [state, setCachedState, loading];
}