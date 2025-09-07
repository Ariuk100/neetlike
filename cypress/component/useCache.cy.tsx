import React from 'react'
import { useCache, useCachedState } from '../../lib/useCache'

const CacheTestComponent = () => {
  const cache = useCache('test_')
  const [value, setValue] = React.useState('')
  const [cachedValue, setCachedValue] = React.useState('')

  React.useEffect(() => {
    const stored = cache.get('test_key')
    if (stored) {
      setCachedValue(stored as string)
    }
  }, [cache])

  const handleSet = () => {
    cache.set('test_key', value)
    setCachedValue(value)
  }

  const handleClear = () => {
    cache.remove('test_key')
    setCachedValue('')
  }

  return (
    <div>
      <input
        data-testid="value-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
      />
      <button data-testid="set-button" onClick={handleSet}>
        Set Cache
      </button>
      <button data-testid="clear-button" onClick={handleClear}>
        Clear Cache
      </button>
      <div data-testid="cached-value">
        Cached: {cachedValue}
      </div>
      <div data-testid="cache-size">
        Size: {cache.size()}
      </div>
    </div>
  )
}

const CachedStateTestComponent = () => {
  const [count, setCount] = useCachedState('counter', 0)

  return (
    <div>
      <div data-testid="count-display">Count: {count}</div>
      <button data-testid="increment" onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button data-testid="decrement" onClick={() => setCount(count - 1)}>
        Decrement
      </button>
      <button data-testid="reset" onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  )
}

describe('useCache Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('should set and get cache values', () => {
    cy.mount(<CacheTestComponent />)

    cy.get('[data-testid="cached-value"]').should('contain', 'Cached:')
    cy.get('[data-testid="cache-size"]').should('contain', 'Size: 0')

    cy.get('[data-testid="value-input"]').type('test value')
    cy.get('[data-testid="set-button"]').click()

    cy.get('[data-testid="cached-value"]').should('contain', 'Cached: test value')
    cy.get('[data-testid="cache-size"]').should('contain', 'Size: 1')
  })

  it('should clear cache values', () => {
    cy.mount(<CacheTestComponent />)

    cy.get('[data-testid="value-input"]').type('test value')
    cy.get('[data-testid="set-button"]').click()
    cy.get('[data-testid="cached-value"]').should('contain', 'Cached: test value')

    cy.get('[data-testid="clear-button"]').click()
    cy.get('[data-testid="cached-value"]').should('contain', 'Cached:')
    cy.get('[data-testid="cache-size"]').should('contain', 'Size: 0')
  })

  it('should persist cache values across component remounts', () => {
    cy.mount(<CacheTestComponent />)

    cy.get('[data-testid="value-input"]').type('persistent value')
    cy.get('[data-testid="set-button"]').click()

    // Remount component
    cy.mount(<CacheTestComponent />)

    cy.get('[data-testid="cached-value"]').should('contain', 'Cached: persistent value')
  })
})

describe('useCachedState Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('should initialize with default value', () => {
    cy.mount(<CachedStateTestComponent />)
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 0')
  })

  it('should increment and decrement values', () => {
    cy.mount(<CachedStateTestComponent />)

    cy.get('[data-testid="increment"]').click()
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 1')

    cy.get('[data-testid="increment"]').click()
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 2')

    cy.get('[data-testid="decrement"]').click()
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 1')
  })

  it('should reset to initial value', () => {
    cy.mount(<CachedStateTestComponent />)

    cy.get('[data-testid="increment"]').click()
    cy.get('[data-testid="increment"]').click()
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 2')

    cy.get('[data-testid="reset"]').click()
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 0')
  })

  it('should persist state across component remounts', () => {
    cy.mount(<CachedStateTestComponent />)

    cy.get('[data-testid="increment"]').click()
    cy.get('[data-testid="increment"]').click()
    cy.get('[data-testid="count-display"]').should('contain', 'Count: 2')

    // Remount component
    cy.mount(<CachedStateTestComponent />)

    cy.get('[data-testid="count-display"]').should('contain', 'Count: 2')
  })
})