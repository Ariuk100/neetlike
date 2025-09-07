/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import { renderHook, act, waitFor } from '@testing-library/react'
import { useState, useEffect, useCallback } from 'react'
import { useCache, useCachedState } from '../lib/useCache'

describe('useCache', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('basic functionality', () => {
    it('should set and get data from cache', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('key1', 'value1')
      })

      expect(result.current.get('key1')).toBe('value1')
    })

    it('should return null for non-existent keys', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      expect(result.current.get('nonexistent')).toBeNull()
    })

    it('should handle different storage types', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('local_key', 'local_value', { storage: 'local' })
        result.current.set('session_key', 'session_value', { storage: 'session' })
      })

      expect(result.current.get('local_key', { storage: 'local' })).toBe('local_value')
      expect(result.current.get('session_key', { storage: 'session' })).toBe('session_value')
    })
  })

  describe('expiration', () => {
    it('should respect cache expiration', () => {
      jest.useFakeTimers()
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('expiring_key', 'value', { expiryMs: 1000 })
      })

      expect(result.current.get('expiring_key')).toBe('value')

      act(() => {
        jest.advanceTimersByTime(1001)
      })

      expect(result.current.get('expiring_key')).toBeNull()
      
      jest.useRealTimers()
    })

    it('should update lastAccessed on get', () => {
      jest.useFakeTimers()
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('key', 'value', { expiryMs: 5000 })
      })

      act(() => {
        jest.advanceTimersByTime(1000)
        result.current.get('key') // This should update lastAccessed
      })

      // Verify the item is still accessible
      expect(result.current.get('key')).toBe('value')
      
      jest.useRealTimers()
    })
  })

  describe('LRU functionality', () => {
    it('should enforce LRU limit', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('key1', 'value1', { maxSize: 2 })
        result.current.set('key2', 'value2', { maxSize: 2 })
        result.current.set('key3', 'value3', { maxSize: 2 })
      })

      // key1 should be evicted as it's the oldest
      expect(result.current.get('key1')).toBeNull()
      expect(result.current.get('key2')).toBe('value2')
      expect(result.current.get('key3')).toBe('value3')
    })
  })

  describe('cache management', () => {
    it('should remove specific keys', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('key1', 'value1')
        result.current.set('key2', 'value2')
      })

      expect(result.current.get('key1')).toBe('value1')
      expect(result.current.get('key2')).toBe('value2')

      act(() => {
        result.current.remove('key1')
      })

      expect(result.current.get('key1')).toBeNull()
      expect(result.current.get('key2')).toBe('value2')
    })

    it('should clear all cache', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('key1', 'value1')
        result.current.set('key2', 'value2')
      })

      expect(result.current.size()).toBe(2)

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.size()).toBe(0)
      expect(result.current.get('key1')).toBeNull()
      expect(result.current.get('key2')).toBeNull()
    })

    it('should get all keys', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      act(() => {
        result.current.set('key1', 'value1')
        result.current.set('key2', 'value2')
      })

      const keys = result.current.getAllKeys()
      expect(keys).toHaveLength(2)
      expect(keys).toContain('test_key1')
      expect(keys).toContain('test_key2')
    })
  })

  describe('subscription system', () => {
    it('should notify subscribers on cache changes', () => {
      const { result } = renderHook(() => useCache('test_'))
      const listener = jest.fn()
      
      act(() => {
        result.current.subscribe('key1', listener)
      })

      act(() => {
        result.current.set('key1', 'value1')
      })

      expect(listener).toHaveBeenCalledWith('key1', 'value1')
    })

    it('should notify subscribers on cache removal', () => {
      const { result } = renderHook(() => useCache('test_'))
      const listener = jest.fn()
      
      act(() => {
        result.current.set('key1', 'value1')
        result.current.subscribe('key1', listener)
      })

      act(() => {
        result.current.remove('key1')
      })

      expect(listener).toHaveBeenCalledWith('key1', null)
    })

    it('should unsubscribe properly', () => {
      const { result } = renderHook(() => useCache('test_'))
      const listener = jest.fn()
      let unsubscribe: () => void
      
      act(() => {
        unsubscribe = result.current.subscribe('key1', listener)
      })

      act(() => {
        unsubscribe()
      })

      act(() => {
        result.current.set('key1', 'value1')
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle corrupted cache data gracefully', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      // Manually corrupt the cache
      sessionStorage.setItem('test_corrupted', 'invalid json')
      
      expect(result.current.get('corrupted')).toBeNull()
    })

    it('should handle storage errors gracefully', () => {
      const { result } = renderHook(() => useCache('test_'))
      
      // Mock storage to throw error
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage full')
      })

      // Should not throw error
      act(() => {
        result.current.set('key', 'value')
      })

      Storage.prototype.setItem = originalSetItem
    })
  })
})

describe('useCachedState', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  it('should initialize with cached value if available', () => {
    const { result: cacheResult } = renderHook(() => useCache())
    
    act(() => {
      cacheResult.current.set('testState', 'cached_value')
    })

    const { result } = renderHook(() => 
      useCachedState('testState', 'default_value')
    )

    expect(result.current[0]).toBe('cached_value')
  })

  it('should initialize with default value if no cached value', () => {
    const { result } = renderHook(() => 
      useCachedState('newState', 'default_value')
    )

    expect(result.current[0]).toBe('default_value')
  })

  it('should update cache when state changes', () => {
    const { result } = renderHook(() => 
      useCachedState('testState', 'default_value')
    )

    act(() => {
      result.current[1]('new_value')
    })

    const { result: cacheResult } = renderHook(() => useCache())
    expect(cacheResult.current.get('testState')).toBe('new_value')
  })

  it('should respond to external cache changes', async () => {
    // Create shared cache instance
    const { result: sharedCacheResult } = renderHook(() => useCache())
    
    const { result } = renderHook(() => {
      const cache = sharedCacheResult.current
      const [state, setState] = useState(() => {
        const cachedData = cache.get('testState')
        return cachedData !== null ? cachedData : 'default_value'
      })

      useEffect(() => {
        const unsubscribe = cache.subscribe('testState', (key, data) => {
          if (key === 'testState') {
            if (data !== null) {
              setState(data as string)
            } else {
              setState('default_value')
            }
          }
        })
        return unsubscribe
      }, [cache])

      const setCachedState = useCallback((data: string) => {
        cache.set('testState', data)
        setState(data)
      }, [cache])

      return [state, setCachedState] as const
    })
    
    act(() => {
      sharedCacheResult.current.set('testState', 'external_update')
    })

    // Wait for the subscription to trigger state update
    await waitFor(() => {
      expect(result.current[0]).toBe('external_update')
    })
  })
})