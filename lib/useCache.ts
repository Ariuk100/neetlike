// lib/useCache.ts
import { useCallback, useRef, useEffect, useState } from 'react';

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

// Кэшийн өөрчлөлтийг сонсох callback функцийн төрөл
type ChangeListener = (key: string, data: unknown) => void;

export function useCache(storageKeyPrefix: string = '', defaultOptions?: CacheOptions) {
  const isBrowser = typeof window !== 'undefined';
  
  // Кэшийн өөрчлөлтийг мэдээлэх Event Emitter
  const changeListeners = useRef(new Map<string, Set<ChangeListener>>());

  const getStorage = useCallback((type: 'local' | 'session') => {
    if (isBrowser) {
      return type === 'local' ? localStorage : sessionStorage;
    }
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
  }, [isBrowser]);

  const now = () => Date.now();

  const getAllKeys = useCallback(
    (storage: 'local' | 'session' = 'session'): string[] => {
      const store = getStorage(storage);
      return isBrowser ? Object.keys(store).filter(k => k.startsWith(storageKeyPrefix)) : [];
    },
    [storageKeyPrefix, isBrowser, getStorage]
  );

  const size = useCallback(
    (storage: 'local' | 'session' = 'session') => isBrowser ? getAllKeys(storage).length : 0,
    [getAllKeys, isBrowser]
  );

  const clearAll = useCallback(
    (storage: 'local' | 'session' = 'session') => {
      if (!isBrowser) return;
      const store = getStorage(storage);
      getAllKeys(storage).forEach(key => store.removeItem(key));
      // Бүх кэш цэвэрлэгдсэн тул бүх сонсогчдод мэдээлнэ
      changeListeners.current.forEach(listeners => listeners.forEach(listener => listener('', null)));
    },
    [getAllKeys, isBrowser, getStorage]
  );

  const enforceLRULimit = useCallback(
    (storage: 'local' | 'session', maxSize: number) => {
      if (!isBrowser) return;
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
    [getAllKeys, isBrowser, getStorage]
  );
  
  const publishChange = useCallback((key: string, data: unknown) => {
    const listeners = changeListeners.current.get(key);
    if (listeners) {
      listeners.forEach(listener => listener(key, data));
    }
  }, []);

  const get = useCallback(
    <T>(key: string, options?: CacheOptions): T | null => {
      if (!isBrowser) return null;
      const { storage = 'session'} = {
        ...defaultOptions,
        ...options,
      };
      const store = getStorage(storage);
      const prefixedKey = `${storageKeyPrefix}${key}`;
      const raw = store.getItem(prefixedKey);
      if (!raw) return null;

      try {
        const parsed: CacheItem<T> = JSON.parse(raw);
        if (parsed.expiry < now()) {
          store.removeItem(prefixedKey);
          publishChange(key, null); // Кэшээс устсан тул мэдээлнэ
          return null;
        }
        parsed.lastAccessed = now();
        store.setItem(prefixedKey, JSON.stringify(parsed));
        return parsed.data;
      } catch {
        return null;
      }
    },
    [storageKeyPrefix, defaultOptions, isBrowser, getStorage, publishChange]
  );

  const set = useCallback(
    (key: string, data: unknown, options?: CacheOptions) => {
      if (!isBrowser) return;
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
      const prefixedKey = `${storageKeyPrefix}${key}`;
      store.setItem(prefixedKey, JSON.stringify(item));
      if (maxSize) enforceLRULimit(storage, maxSize);
      publishChange(key, data); // Кэш шинэчлэгдсэн тул мэдээлнэ
    },
    [storageKeyPrefix, defaultOptions, enforceLRULimit, isBrowser, getStorage, publishChange]
  );

  const remove = useCallback(
    (key: string, storage: 'local' | 'session' = 'session') => {
      if (!isBrowser) return;
      const prefixedKey = `${storageKeyPrefix}${key}`;
      getStorage(storage).removeItem(prefixedKey);
      publishChange(key, null); // Устгагдсан тул мэдээлнэ
    },
    [storageKeyPrefix, isBrowser, getStorage, publishChange]
  );
  
  const subscribe = useCallback((key: string, listener: ChangeListener) => {
    if (!changeListeners.current.has(key)) {
      changeListeners.current.set(key, new Set());
    }
    changeListeners.current.get(key)!.add(listener);
    return () => {
      changeListeners.current.get(key)!.delete(listener);
      if (changeListeners.current.get(key)?.size === 0) {
        changeListeners.current.delete(key);
      }
    };
  }, []);

  return { get, set, remove, clearAll, size, getAllKeys, subscribe };
}

// Кэшийн реактив төлөв үүсгэх тусгай hook
export function useCachedState<T>(key: string, defaultValue: T, options?: CacheOptions): [T, (data: T) => void] {
  const cache = useCache();
  const [state, setState] = useState<T>(() => {
    const cachedData = cache.get<T>(key, options);
    return cachedData !== null ? cachedData : defaultValue;
  });

  // Кэшийн өөрчлөлтийг сонсож төлөвийг шинэчлэх
  useEffect(() => {
    const unsubscribe = cache.subscribe(key, (_, data) => {
      if (data !== null) {
        setState(data as T);
      } else {
        setState(defaultValue);
      }
    });
    return () => unsubscribe();
  }, [key, cache, defaultValue]);

  const setCachedState = useCallback((data: T) => {
    cache.set(key, data, options);
  }, [key, cache, options]);

  return [state, setCachedState];
}