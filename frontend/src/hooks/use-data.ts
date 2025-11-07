import { useState, useEffect, useCallback, useRef } from 'react'
import { useData } from '@/contexts/data-context'
import { getMockData } from '@/lib/mock-data'

interface UseDataFetchOptions<T> {
  endpoint: string
  mockDataType?: string
  mockData?: T
  autoFetch?: boolean
  dependencies?: any[]
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  retryOnMount?: boolean
}

interface UseDataFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  isMockData: boolean
  isRetrying: boolean
  refetch: () => Promise<void>
  clearError: () => void
  retry: () => Promise<void>
}

export function useDataFetch<T>({
  endpoint,
  mockDataType,
  mockData,
  autoFetch = true,
  dependencies = [],
  onSuccess,
  onError,
  retryOnMount = false
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
  const { getData, isMockData: contextIsMockData, isLoading: contextIsLoading, error: contextError, clearError: contextClearError } = useData()
  const [data, setData] = useState<T | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Determine mock data to use
  const getMockDataForFetch = useCallback((): T | undefined => {
    if (mockData) return mockData
    if (mockDataType) {
      try {
        return getMockData<T>(mockDataType)
      } catch (err) {
        console.warn(`Failed to get mock data for type: ${mockDataType}`, err)
        return undefined
      }
    }
    return undefined
  }, [mockData, mockDataType])

  // Fetch function with abort support
  const fetchData = useCallback(async (isRetry = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setLocalLoading(true)
    setLocalError(null)
    if (isRetry) {
      setIsRetrying(true)
    }
    
    try {
      const mockDataForFetch = getMockDataForFetch()
      const result = await getData<T>(endpoint, mockDataForFetch)
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      setData(result)
      onSuccess?.(result)
    } catch (err) {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setLocalError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLocalLoading(false)
      setIsRetrying(false)
    }
  }, [endpoint, getData, getMockDataForFetch, onSuccess, onError])

  // Retry function
  const retry = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }

    // Cleanup function to abort ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [autoFetch, fetchData, ...dependencies])

  // Retry on mount if specified and there's an error
  useEffect(() => {
    if (retryOnMount && (localError || contextError) && !localLoading && !contextIsLoading) {
      const timer = setTimeout(() => {
        retry()
      }, 1000) // Wait 1 second before retrying

      return () => clearTimeout(timer)
    }
  }, [retryOnMount, localError, contextError, localLoading, contextIsLoading, retry])

  // Clear error function
  const clearError = useCallback(() => {
    setLocalError(null)
    contextClearError()
  }, [contextClearError])

  return {
    data,
    isLoading: localLoading || contextIsLoading,
    error: localError || contextError,
    isMockData: contextIsMockData,
    isRetrying,
    refetch: fetchData,
    clearError,
    retry
  }
}

// Specialized hooks for common data types
export function useDashboardStats() {
  return useDataFetch<import('@/types').DashboardStats>({
    endpoint: '/dashboard/stats',
    mockDataType: 'dashboard-stats'
  })
}

export function useRecentActivity() {
  return useDataFetch<import('@/types').RecentActivity[]>({
    endpoint: '/dashboard/activity',
    mockDataType: 'recent-activity'
  })
}

export function useSystemStatus() {
  return useDataFetch<import('@/types').SystemStatus>({
    endpoint: '/system/status',
    mockDataType: 'system-status'
  })
}

export function useUsers() {
  return useDataFetch<import('@/types').User[]>({
    endpoint: '/users',
    mockDataType: 'users'
  })
}

export function useMedicalRecords(patientId?: string) {
  return useDataFetch<import('@/types').MedicalRecord[]>({
    endpoint: patientId ? `/records?patientId=${patientId}` : '/records',
    mockDataType: 'medical-records',
    dependencies: [patientId]
  })
}

export function useConsentTokens(patientId?: string) {
  return useDataFetch<import('@/types').ConsentToken[]>({
    endpoint: patientId ? `/consent?patientId=${patientId}` : '/consent',
    mockDataType: 'consent-tokens',
    dependencies: [patientId]
  })
}

export function useAuditEntries(userId?: string) {
  return useDataFetch<import('@/types').AuditEntry[]>({
    endpoint: userId ? `/audit?userId=${userId}` : '/audit',
    mockDataType: 'audit-entries',
    dependencies: [userId]
  })
}