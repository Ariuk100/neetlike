/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Firebase completely before importing AuthContext
jest.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null)
      return jest.fn() // unsubscribe function
    }),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    setPersistence: jest.fn(),
  },
  db: {}
}))

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  getIdToken: jest.fn().mockResolvedValue('mock-token'),
}

// Import AuthContext after mocks
import { AuthProvider, useAuth } from '../app/context/AuthContext'

const TestComponent = () => {
  const { user, loading, logout, firebaseUser, error } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <div data-testid="firebase-user">{firebaseUser ? firebaseUser.email : 'No Firebase User'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('provides initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    })
    
    expect(screen.getByTestId('user')).toHaveTextContent('No User')
    expect(screen.getByTestId('firebase-user')).toHaveTextContent('No Firebase User')
  })

  it('throws error when useAuth is used outside AuthProvider', () => {
    const ConsoleError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    console.error = ConsoleError
  })

  it('handles component unmount properly', () => {
    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // This should not cause any warnings or errors
    expect(() => unmount()).not.toThrow()
  })
})