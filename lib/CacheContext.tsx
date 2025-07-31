// lib/CacheContext.tsx (Persistent Cache through Context)
'use client';

import React, { createContext, useContext } from 'react';
import { useCache } from './useCache'; // useCache hook-ийг импортлосон

// useCache hook-ийн буцаах төрлийг ашиглана
interface CacheContextType {
  get: <T>(key: string, options?: { expiryMs?: number; storage?: 'local' | 'session' }) => T | null;
  set: (key: string, data: unknown, options?: { expiryMs?: number; storage?: 'local' | 'session'; maxSize?: number }) => void;
  remove: (key: string, storage?: 'local' | 'session') => void;
  clearAll: (storage?: 'local' | 'session') => void; // Нэр нь useCache-тэй ижил болгосон
  size: (storage?: 'local' | 'session') => number;
  getAllKeys: (storage?: 'local' | 'session') => string[];
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // useCache hook-ийг ашиглан бүх кэшийн функцуудыг авна
  const cache = useCache('app_cache_prefix_'); // Та энд өөрийн апп-ын кэшийн префиксийг өгч болно

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