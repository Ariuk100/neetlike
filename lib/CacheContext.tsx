'use client';

import React, { createContext, useContext, useRef } from 'react';

type CacheValue = {
  [key: string]: unknown;
};

interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cacheRef = useRef<CacheValue>({});

  const get = <T,>(key: string): T | null => {
    return (cacheRef.current[key] as T) ?? null;
  };

  const set = (key: string, value: unknown) => {
    cacheRef.current[key] = value;
  };

  const remove = (key: string) => {
    delete cacheRef.current[key];
  };

  const clear = () => {
    cacheRef.current = {};
  };

  return (
    <CacheContext.Provider value={{ get, set, remove, clear }}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCacheContext = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (!context) throw new Error('useCacheContext must be used within a CacheProvider');
  return context;
};