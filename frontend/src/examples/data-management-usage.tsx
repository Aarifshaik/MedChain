/**
 * Example usage of the Data Management System
 * 
 * This file demonstrates how to use the new data source management system
 * that was implemented in task 4.
 */

"use client"

import { useDataFetch, useDashboardStats } from '@/hooks/use-data'
import { DataLoadingState } from '@/components/ui/data-loading-state'
import { MockDataBanner } from '@/components/ui/mock-data-banner'
import { DataSourceIndicator } from '@/components/ui/data-source-indicator'
import { DataAwareCard } from '@/components/ui/data-aware-card'
import { DataAwareLayout } from '@/components/layout/data-aware-layout'
import { NetworkStatus } from '@/components/ui/network-status'
import { Card, CardContent } from '@/components/ui/card'

// Example 1: Using the specialized dashboard stats hook
export function ExampleDashboardStats() {
  const { data, isLoading, error, isMockData, retry } = useDashboardStats()

  return (
    <DataLoadingState
      isLoading={isLoading}
      error={error}
      isMockData={isMockData}
      onRetry={retry}
    >
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Records</p>
                  <p className="text-2xl font-bold">{data.totalRecords}</p>
                </div>
                <DataSourceIndicator />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DataLoadingState>
  )
}

// Example 2: Using the generic useDataFetch hook with custom mock data
export function ExampleCustomData() {
  const customMockData = { message: "Hello from mock data!" }
  
  const { data, isLoading, error, isMockData, retry } = useDataFetch({
    endpoint: '/api/custom-endpoint',
    mockData: customMockData,
    onSuccess: (data) => console.log('Data loaded successfully:', data),
    onError: (error) => console.error('Failed to load data:', error)
  })

  return (
    <DataLoadingState
      isLoading={isLoading}
      error={error}
      isMockData={isMockData}
      onRetry={retry}
    >
      {data && (
        <DataAwareCard 
          title="Custom Data" 
          description="Example of custom data fetching"
        >
          <p>{data.message}</p>
        </DataAwareCard>
      )}
    </DataLoadingState>
  )
}

// Example 3: Using the DataAwareLayout with banner
export function ExamplePageWithBanner() {
  return (
    <DataAwareLayout showBanner={true} showToggle={true}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <div className="flex items-center gap-2">
            <NetworkStatus showLabel />
            <DataSourceIndicator showLabel />
          </div>
        </div>
        
        <ExampleDashboardStats />
        <ExampleCustomData />
      </div>
    </DataAwareLayout>
  )
}

// Example 4: Environment-based configuration
export function ExampleConfigUsage() {
  // The data provider automatically uses environment variables:
  // - NEXT_PUBLIC_USE_MOCK_DATA: Enable/disable mock data
  // - NEXT_PUBLIC_API_URL: API endpoint
  // - NEXT_PUBLIC_FALLBACK_TO_MOCK: Enable fallback to mock data
  // - NEXT_PUBLIC_SHOW_MOCK_INDICATOR: Show/hide mock data indicators
  // - NEXT_PUBLIC_API_RETRY_ATTEMPTS: Number of retry attempts
  // - NEXT_PUBLIC_API_RETRY_DELAY: Delay between retries

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Configuration Examples</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Development Mode</h3>
          <p className="text-sm text-muted-foreground">
            Set NEXT_PUBLIC_USE_MOCK_DATA=true to use mock data by default
          </p>
        </div>
        
        <div>
          <h3 className="font-medium">Production Mode</h3>
          <p className="text-sm text-muted-foreground">
            Set NEXT_PUBLIC_USE_MOCK_DATA=false to use real API data
          </p>
        </div>
        
        <div>
          <h3 className="font-medium">Fallback Mode</h3>
          <p className="text-sm text-muted-foreground">
            Set NEXT_PUBLIC_FALLBACK_TO_MOCK=true to fallback to mock data when API fails
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Key Features Implemented:
 * 
 * 1. Data Provider Abstraction (Task 4.1):
 *    - DataProvider context with configuration management
 *    - Environment-based data source selection
 *    - Automatic switching between mock and real data
 *    - Custom hooks for common data types
 * 
 * 2. Visual Indicators (Task 4.2):
 *    - MockDataBanner for page-level notifications
 *    - DataSourceIndicator for component-level badges
 *    - DataAwareCard wrapper component
 *    - NetworkStatus indicator
 * 
 * 3. Fallback Mechanisms (Task 4.3):
 *    - Automatic retry logic with exponential backoff
 *    - Fallback to mock data when API fails
 *    - Comprehensive error handling
 *    - Loading states and user feedback
 *    - Request cancellation support
 */