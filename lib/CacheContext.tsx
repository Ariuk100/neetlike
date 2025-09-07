// lib/CacheContext.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { useCache } from './useCache';

interface CacheContextType {
  get: <T>(key: string, options?: { expiryMs?: number; storage?: 'local' | 'session' }) => T | null;
  set: (key: string, data: unknown, options?: { expiryMs?: number; storage?: 'local' | 'session'; maxSize?: number }) => void;
  remove: (key: string, storage?: 'local' | 'session') => void;
  clearAll: (storage?: 'local' | 'session') => void;
  size: (storage?: 'local' | 'session') => number;
  getAllKeys: (storage?: 'local' | 'session') => string[];
  subscribe: (key: string, listener: (key: string, data: unknown) => void) => () => void; // Шинээр нэмэгдсэн
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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