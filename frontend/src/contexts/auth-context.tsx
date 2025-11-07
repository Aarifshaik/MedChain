"use client"

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { User, UserRole } from '@/types'

// Authentication state interface
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
}

// Authentication actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'INITIALIZE_AUTH'; payload: { user: User; token: string } | null }

// Authentication context interface
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshAuth: () => Promise<boolean>
  updateUser: (user: User) => void
  setIntendedUrl: (url: string) => void
  getIntendedUrl: () => string | null
  clearIntendedUrl: () => void
}

// Login credentials interface
interface LoginCredentials {
  userId: string
  password: string
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
}

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      }
    case 'INITIALIZE_AUTH':
      if (action.payload) {
        return {
          ...state,
          user: action.payload.user,
          token: action.payload.token,
          isAuthenticated: true,
          isLoading: false,
        }
      }
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    default:
      return state
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'healthcare_dlt_token',
  USER: 'healthcare_dlt_user',
  LAST_LOGIN: 'healthcare_dlt_last_login',
  INTENDED_URL: 'healthcare_dlt_intended_url',
} as const

// Session expired notification utility
const showSessionExpiredNotification = () => {
  // Simple notification - in a real app, you'd use a toast library
  if (typeof window !== 'undefined') {
    console.log('Session expired. Please log in again.')
    
    // You could integrate with a toast library here, for example:
    // toast.error('Your session has expired. Please log in again.')
    
    // Or create a simple browser notification
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Healthcare DLT', {
          body: 'Your session has expired. Please log in again.',
          icon: '/favicon.ico'
        })
      }
    } catch (error) {
      console.warn('Failed to show notification:', error)
    }
  }
}

// Storage utilities
const storage = {
  get: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return null
    }
  },
  set: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing from localStorage:', error)
    }
  },
  clear: (): void => {
    if (typeof window === 'undefined') return
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  },
}

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      try {
        const token = storage.get(STORAGE_KEYS.TOKEN)
        const userStr = storage.get(STORAGE_KEYS.USER)
        const lastLogin = storage.get(STORAGE_KEYS.LAST_LOGIN)

        if (token && userStr && lastLogin) {
          // Check if token is still valid (24 hours)
          const lastLoginTime = new Date(lastLogin).getTime()
          const now = Date.now()
          const tokenExpiryTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

          if (now - lastLoginTime < tokenExpiryTime) {
            try {
              const user = JSON.parse(userStr) as User
              
              // Attempt to validate token with backend (optional)
              try {
                const { apiClient } = await import('@/lib/api')
                const response = await apiClient.post('/auth/validate', { token })
                
                if (response.success) {
                  dispatch({ 
                    type: 'INITIALIZE_AUTH', 
                    payload: { user, token } 
                  })
                  console.log('Authentication restored from storage and validated')
                  return
                } else {
                  throw new Error('Token validation failed')
                }
              } catch (validationError) {
                console.warn('Token validation failed, but token is not expired. Proceeding with local validation:', validationError)
                // If backend validation fails but token is not expired, proceed with local auth
                dispatch({ 
                  type: 'INITIALIZE_AUTH', 
                  payload: { user, token } 
                })
                console.log('Authentication restored from storage (offline mode)')
                return
              }
            } catch (error) {
              console.error('Error parsing stored user data:', error)
              storage.clear()
            }
          } else {
            // Token expired, clear storage and show notification
            console.log('Authentication token expired, clearing session')
            storage.clear()
            
            // Show user-friendly notification about expired session
            if (typeof window !== 'undefined') {
              // Create a simple notification for expired session
              showSessionExpiredNotification()
            }
          }
        }

        // No valid authentication found
        dispatch({ type: 'INITIALIZE_AUTH', payload: null })
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear potentially corrupted data
        storage.clear()
        dispatch({ type: 'INITIALIZE_AUTH', payload: null })
      }
    }

    initializeAuth()
  }, [])

  // Periodic authentication check
  useEffect(() => {
    if (!state.isAuthenticated) {
      return
    }

    // Check authentication status every 5 minutes
    const interval = setInterval(async () => {
      const isValid = await checkAuth()
      if (!isValid) {
        console.log('Periodic auth check failed, user will be logged out')
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [state.isAuthenticated])

  // Check authentication when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && state.isAuthenticated) {
        const isValid = await checkAuth()
        if (!isValid) {
          console.log('Auth check failed on tab focus, user will be logged out')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [state.isAuthenticated])

  // Login function with two-step authentication
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Import crypto utilities
      const { PQCKeyManager } = await import('@/lib/crypto/key-manager')
      const { apiClient } = await import('@/lib/api')

      // Initialize key manager
      const keyManager = new PQCKeyManager()
      await keyManager.initialize(credentials.password)

      // Check if user has stored keys
      if (!keyManager.hasUserKeys(credentials.userId)) {
        throw new Error('No keys found for this user. Please register first or upload your key file.')
      }

      // Get user keys
      const userKeys = await keyManager.getUserKeys(credentials.userId)
      if (!userKeys) {
        throw new Error('Failed to retrieve user keys')
      }

      // Step 1: Get nonce from server
      const nonceResponse = await apiClient.getNonce(credentials.userId)
      if (!nonceResponse.success || !nonceResponse.data) {
        throw new Error(nonceResponse.error?.message || 'Failed to get authentication nonce')
      }

      const { nonce } = nonceResponse.data

      // Step 2: Create signature with nonce
      const message = `${credentials.userId}:${nonce}:${Date.now()}`
      const messageBytes = new TextEncoder().encode(message)
      
      // For now, simulate signature (in real implementation, use Dilithium)
      const signature = "simulated_signature_" + btoa(message)

      // Step 3: Authenticate with signed nonce
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      try {
        const response = await apiClient.authenticate({
          userId: credentials.userId,
          signature,
          nonce
        })

        clearTimeout(timeoutId)

        if (response.success && response.data) {
          const { user, token } = response.data as { user: User; token: string }

          // Store authentication data with enhanced security
          storage.set(STORAGE_KEYS.TOKEN, token)
          storage.set(STORAGE_KEYS.USER, JSON.stringify(user))
          storage.set(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString())

          // Update state
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user, token } 
          })

          // Log successful authentication
          console.log('Authentication successful for user:', credentials.userId)
        } else {
          throw new Error(response.error?.message || 'Authentication failed')
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        // Handle different types of network errors
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Login request timed out. Please check your connection and try again.')
          }
          if (fetchError.message.includes('fetch')) {
            throw new Error('Unable to connect to authentication server. Please check your internet connection.')
          }
        }
        throw fetchError
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      console.error('Login error:', error)
      
      // Enhance error messages for better user experience
      if (error instanceof Error) {
        if (error.message.includes('keys')) {
          throw new Error('Authentication keys not found or invalid. Please register first or check your credentials.')
        }
        if (error.message.includes('password')) {
          throw new Error('Invalid password. Please check your password and try again.')
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error occurred. Please check your internet connection and try again.')
        }
      }
      
      throw error
    }
  }

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Attempt to notify backend of logout (optional - don't block on failure)
      try {
        const token = storage.get(STORAGE_KEYS.TOKEN)
        if (token) {
          const { apiClient } = await import('@/lib/api')
          await apiClient.post('/auth/logout', { token })
        }
      } catch (error) {
        console.warn('Failed to notify backend of logout:', error)
        // Continue with local logout even if backend notification fails
      }

      // Clear all authentication data from storage
      storage.clear()
      
      // Clear any cached crypto keys (if applicable)
      try {
        const { PQCKeyManager } = await import('@/lib/crypto/key-manager')
        const keyManager = new PQCKeyManager()
        // Clear keys for current user if available
        if (state.user?.userId) {
          keyManager.clearUserKeys(state.user.userId)
        }
      } catch (error) {
        console.warn('Failed to clear crypto cache:', error)
      }
      
      // Update state
      dispatch({ type: 'LOGOUT' })
      
      console.log('User logged out successfully')
    } catch (error) {
      console.error('Error during logout:', error)
      // Even if there's an error, clear local state
      storage.clear()
      dispatch({ type: 'LOGOUT' })
    }
  }

  // Check authentication status
  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = storage.get(STORAGE_KEYS.TOKEN)
      const userStr = storage.get(STORAGE_KEYS.USER)
      const lastLogin = storage.get(STORAGE_KEYS.LAST_LOGIN)

      if (!token || !userStr || !lastLogin) {
        return false
      }

      // Check token expiry
      const lastLoginTime = new Date(lastLogin).getTime()
      const now = Date.now()
      const tokenExpiryTime = 24 * 60 * 60 * 1000 // 24 hours

      if (now - lastLoginTime >= tokenExpiryTime) {
        console.log('Token expired during auth check')
        await logout()
        
        // Show user notification about expired session
        if (typeof window !== 'undefined') {
          showSessionExpiredNotification()
        }
        return false
      }

      // Optional: Validate token with backend periodically
      try {
        const { apiClient } = await import('@/lib/api')
        const response = await apiClient.post('/auth/validate', { token })
        
        if (!response.success) {
          console.log('Token validation failed with backend')
          await logout()
          return false
        }
      } catch (validationError) {
        console.warn('Backend token validation failed, but proceeding with local validation:', validationError)
        // Continue with local validation if backend is unavailable
      }

      return true
    } catch (error) {
      console.error('Error checking auth:', error)
      return false
    }
  }

  // Update user function
  const updateUser = (user: User): void => {
    storage.set(STORAGE_KEYS.USER, JSON.stringify(user))
    dispatch({ type: 'SET_USER', payload: user })
  }

  // Intended URL management functions
  const setIntendedUrl = (url: string): void => {
    storage.set(STORAGE_KEYS.INTENDED_URL, url)
  }

  const getIntendedUrl = (): string | null => {
    return storage.get(STORAGE_KEYS.INTENDED_URL)
  }

  const clearIntendedUrl = (): void => {
    storage.remove(STORAGE_KEYS.INTENDED_URL)
  }

  // Refresh authentication - attempt to extend session or re-authenticate
  const refreshAuth = async (): Promise<boolean> => {
    try {
      const token = storage.get(STORAGE_KEYS.TOKEN)
      const userStr = storage.get(STORAGE_KEYS.USER)
      
      if (!token || !userStr) {
        return false
      }

      // Attempt to refresh token with backend
      try {
        const { apiClient } = await import('@/lib/api')
        const response = await apiClient.post('/auth/refresh', { token })
        
        if (response.success && response.data) {
          const { user, token: newToken } = response.data as { user: User; token: string }
          
          // Update stored authentication data
          storage.set(STORAGE_KEYS.TOKEN, newToken)
          storage.set(STORAGE_KEYS.USER, JSON.stringify(user))
          storage.set(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString())
          
          // Update state
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user, token: newToken } 
          })
          
          console.log('Authentication refreshed successfully')
          return true
        }
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError)
      }

      return false
    } catch (error) {
      console.error('Error refreshing auth:', error)
      return false
    }
  }

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
    refreshAuth,
    updateUser,
    setIntendedUrl,
    getIntendedUrl,
    clearIntendedUrl,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export types for external use
export type { AuthContextType, LoginCredentials }