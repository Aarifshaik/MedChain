/**
 * Authentication Context Tests
 * Tests for the AuthProvider and useAuth hook functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { UserRole } from '@/types'

// Mock the crypto key manager
vi.mock('@/lib/crypto/key-manager', () => ({
  PQCKeyManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    hasUserKeys: vi.fn().mockReturnValue(true),
    getUserKeys: vi.fn().mockResolvedValue({ kyber: 'mock', dilithium: 'mock' }),
    exportPublicKeys: vi.fn().mockResolvedValue({
      kyberPublicKey: 'mock_kyber_key',
      dilithiumPublicKey: 'mock_dilithium_key'
    })
  }))
}))

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: {
          userId: 'test_user',
          role: UserRole.PATIENT,
          publicKeys: {
            kyberPublicKey: 'mock_kyber_key',
            dilithiumPublicKey: 'mock_dilithium_key'
          },
          registrationStatus: 'approved',
          createdAt: new Date()
        },
        token: 'mock_token'
      }
    })
  }
}))

// Test component that uses the auth context
function TestComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.userId : 'no-user'}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => login({ userId: 'test_user', password: 'password' })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

describe('AuthProvider and useAuth', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should provide initial authentication state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
  })

  it('should handle successful login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Perform login
    await act(async () => {
      screen.getByTestId('login-btn').click()
    })

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    expect(screen.getByTestId('user')).toHaveTextContent('test_user')
  })

  it('should handle logout', async () => {
    // Mock localStorage with initial data
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => {
        if (key === 'healthcare_dlt_token') return 'mock_token'
        if (key === 'healthcare_dlt_user') return JSON.stringify({
          userId: 'test_user',
          role: UserRole.PATIENT,
          publicKeys: {
            kyberPublicKey: 'mock_kyber_key',
            dilithiumPublicKey: 'mock_dilithium_key'
          },
          registrationStatus: 'approved',
          createdAt: new Date()
        })
        if (key === 'healthcare_dlt_last_login') return new Date().toISOString()
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initialization to load stored auth
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // Perform logout
    act(() => {
      screen.getByTestId('logout-btn').click()
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    expect(mockLocalStorage.removeItem).toHaveBeenCalled()
  })

  it('should restore authentication from localStorage', async () => {
    // Set up stored authentication
    const mockUser = {
      userId: 'stored_user',
      role: UserRole.DOCTOR,
      publicKeys: {
        kyberPublicKey: 'stored_kyber_key',
        dilithiumPublicKey: 'stored_dilithium_key'
      },
      registrationStatus: 'approved',
      createdAt: new Date()
    }

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => {
        if (key === 'healthcare_dlt_token') return 'stored_token'
        if (key === 'healthcare_dlt_user') return JSON.stringify(mockUser)
        if (key === 'healthcare_dlt_last_login') return new Date().toISOString()
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('stored_user')
  })

  it('should clear expired authentication', async () => {
    // Set up expired authentication (25 hours ago)
    const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000)
    
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => {
        if (key === 'healthcare_dlt_token') return 'expired_token'
        if (key === 'healthcare_dlt_user') return JSON.stringify({
          userId: 'expired_user',
          role: UserRole.PATIENT
        })
        if (key === 'healthcare_dlt_last_login') return expiredDate.toISOString()
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    expect(mockLocalStorage.removeItem).toHaveBeenCalled()
  })

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})