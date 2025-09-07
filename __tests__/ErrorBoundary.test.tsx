/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldError }: { shouldError: boolean }) => {
  if (shouldError) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Component that throws error in async operation
const AsyncError = ({ shouldError }: { shouldError: boolean }) => {
  React.useEffect(() => {
    if (shouldError) {
      throw new Error('Async error')
    }
  }, [shouldError])
  return <div>Async component</div>
}

describe('ErrorBoundary', () => {
  let originalError: typeof console.error
  
  beforeAll(() => {
    // Suppress console.error for these tests
    originalError = console.error
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = originalError
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Алдаа гарлаа')).toBeInTheDocument()
    expect(screen.getByText('Хуудас ачаалахад алдаа гарлаа')).toBeInTheDocument()
  })

  it('shows retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /дахин ачаалах/i })).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    // Use Object.defineProperty to override the read-only property
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
      writable: true
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test error message')).toBeInTheDocument()

    // Restore original value
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
      writable: true
    })
  })

  it('shows error message in error boundary', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('catches errors from child components', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()

    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    expect(spy).toHaveBeenCalled()
    expect(screen.getByText('Алдаа гарлаа')).toBeInTheDocument()

    spy.mockRestore()
  })

  it('logs error information for debugging', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()

    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })


  it('has proper accessibility structure', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    )

    // Check that error UI is properly structured for accessibility
    expect(screen.getByText('Алдаа гарлаа')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /дахин ачаалах/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /буцах/i })).toBeInTheDocument()
  })

})