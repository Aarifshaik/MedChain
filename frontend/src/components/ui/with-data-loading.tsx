"use client"

import { ComponentType, ReactNode } from 'react'
import { DataLoadingState } from '@/components/ui/data-loading-state'

interface WithDataLoadingProps {
  isLoading: boolean
  error: string | null
  isMockData: boolean
  onRetry?: () => void
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  showMockDataWarning?: boolean
}

export function withDataLoading<P extends object>(
  WrappedComponent: ComponentType<P>,
  defaultOptions?: Partial<WithDataLoadingProps>
) {
  return function WithDataLoadingComponent(
    props: P & WithDataLoadingProps
  ) {
    const {
      isLoading,
      error,
      isMockData,
      onRetry,
      loadingComponent,
      errorComponent,
      showMockDataWarning = true,
      ...componentProps
    } = props

    const options = {
      ...defaultOptions,
      isLoading,
      error,
      isMockData,
      onRetry,
      loadingComponent,
      errorComponent,
      showMockDataWarning
    }

    return (
      <DataLoadingState {...options}>
        <WrappedComponent {...(componentProps as P)} />
      </DataLoadingState>
    )
  }
}

// Utility function to create a data-aware component
export function createDataAwareComponent<T, P extends object>(
  Component: ComponentType<P & { data: T }>,
  useDataHook: () => {
    data: T | null
    isLoading: boolean
    error: string | null
    isMockData: boolean
    retry: () => Promise<void>
  }
) {
  return function DataAwareComponent(props: P) {
    const { data, isLoading, error, isMockData, retry } = useDataHook()

    if (isLoading || error || !data) {
      return (
        <DataLoadingState
          isLoading={isLoading}
          error={error}
          isMockData={isMockData}
          onRetry={retry}
        >
          {data && <Component {...props} data={data} />}
        </DataLoadingState>
      )
    }

    return <Component {...props} data={data} />
  }
}