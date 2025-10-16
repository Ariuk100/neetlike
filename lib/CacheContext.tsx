// /lib/CacheContext.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { useCache } from './useCache';

// *** ЗАСВАР: ЭНЭ ХЭСГИЙГ ШИНЭЧИЛСЭН ***
// Функцуудын буцаах утгыг Promise болгож өөрчилсөн
interface CacheContextType {
  get: <T>(key: string, options?: { storage?: 'local' | 'session' | 'indexedDB' }) => Promise<T | null>;
  set: (key: string, data: unknown, options?: { expiryMs?: number; storage?: 'local' | 'session' | 'indexedDB' }) => Promise<void>;
  remove: (key: string, options?: { storage?: 'local' | 'session' | 'indexedDB' }) => Promise<void>;
  clearAll: (options?: { storage?: 'local' | 'session' | 'indexedDB' }) => Promise<void>;
  // size болон getAllKeys зэргийг шаардлагатай бол Promise болгож нэмж болно.
  // Одоогоор үндсэн функцуудыг шинэчиллээ.
  subscribe: (key: string, listener: (key: string, data: unknown) => void) => () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useCache-г дуудахад ямар ч өөрчлөлт орохгүй
  const cache = useCache('app_cache_prefix_');

  return (
    <CacheContext.Provider value={cache}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCacheContext = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCacheContext must be used within a CacheProvider');
  }
  return context;
};