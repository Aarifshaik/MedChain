"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api'
import { ApiResponse } from '@/types'

// Data source configuration
export interface DataConfig {
  useMockData: boolean
  apiEndpoint: string
  fallbackToMock: boolean
  mockDataIndicator: boolean
  retryAttempts: number
  retryDelay: number
}

// Default configuration
const defaultConfig: DataConfig = {
  useMockData: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  fallbackToMock: true,
  mockDataIndicator: true,
  retryAttempts: 3,
  retryDelay: 1000
}

// Data provider context interface
interface DataContextType {
  config: DataConfig
  isMockData: boolean
  isLoading: boolean
  error: string | null
  updateConfig: (newConfig: Partial<DataConfig>) => void
  getData: <T>(endpoint: string, mockData?: T) => Promise<T>
  toggleDataSource: (useMock: boolean) => void
  clearError: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

interface DataProviderProps {
  children: ReactNode
  initialConfig?: Partial<DataConfig>
}

export function DataProvider({ children, initialConfig }: DataProviderProps) {
  const [config, setConfig] = useState<DataConfig>({
    ...defaultConfig,
    ...initialConfig
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update configuration
  const updateConfig = (newConfig: Partial<DataConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }

  // Toggle between mock and real data
  const toggleDataSource = (useMock: boolean) => {
    updateConfig({ useMockData: useMock })
  }

  // Clear error state
  const clearError = () => {
    setError(null)
  }

  // Sleep utility for retry delay
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Main data fetching function with fallback and retry logic
  const getData = async <T,>(endpoint: string, mockData?: T): Promise<T> => {
    setIsLoading(true)
    setError(null)

    // If mock data is enabled, return mock data immediately
    if (config.useMockData && mockData !== undefined) {
      setIsLoading(false)
      return mockData
    }

    // Attempt to fetch real data with retry logic
    let lastError: Error | null = null
    let networkError = false
    
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const response: ApiResponse<T> = await apiClient.get(endpoint)
        
        if (response.success && response.data) {
          setIsLoading(false)
          // Clear any previous errors on successful fetch
          setError(null)
          return response.data
        } else {
          const errorMessage = response.error?.message || 'API request failed'
          lastError = new Error(errorMessage)
          
          // Check if it's a network error
          if (response.error?.code === 'NETWORK_ERROR') {
            networkError = true
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error occurred')
        networkError = true
        
        console.warn(`API request attempt ${attempt} failed for ${endpoint}:`, lastError.message)
      }
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < config.retryAttempts) {
        const delay = config.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.retryAttempts})`)
        await sleep(delay)
      }
    }

    // If all attempts failed and fallback is enabled, use mock data
    if (config.fallbackToMock && mockData !== undefined) {
      const fallbackMessage = networkError 
        ? `Network connection failed after ${config.retryAttempts} attempts. Using fallback data.`
        : `API failed after ${config.retryAttempts} attempts. Using fallback data.`
      
      setError(fallbackMessage)
      setIsLoading(false)
      console.warn(`Falling back to mock data for ${endpoint}:`, fallbackMessage)
      return mockData
    }

    // If no fallback or mock data available, throw the error
    setIsLoading(false)
    const errorMessage = lastError?.message || 'Failed to fetch data'
    setError(errorMessage)
    console.error(`Data fetch failed for ${endpoint}:`, errorMessage)
    throw new Error(errorMessage)
  }

  const value: DataContextType = {
    config,
    isMockData: config.useMockData || (error !== null && config.fallbackToMock),
    isLoading,
    error,
    updateConfig,
    getData,
    toggleDataSource,
    clearError
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

// Hook to use the data context
export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}