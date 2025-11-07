"use client"

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, RefreshCw, AlertTriangle, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataLoadingStateProps {
  isLoading: boolean
  error: string | null
  isMockData: boolean
  onRetry?: () => void
  children: ReactNode
  className?: string
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  showMockDataWarning?: boolean
}

export function DataLoadingState({
  isLoading,
  error,
  isMockData,
  onRetry,
  children,
  className,
  loadingComponent,
  errorComponent,
  showMockDataWarning = true
}: DataLoadingStateProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {loadingComponent || <DefaultLoadingComponent />}
      </div>
    )
  }

  // Error state (without fallback data)
  if (error && !isMockData) {
    return (
      <div className={cn("space-y-4", className)}>
        {errorComponent || (
          <DefaultErrorComponent error={error} onRetry={onRetry} />
        )}
      </div>
    )
  }

  // Success state with optional mock data warning
  return (
    <div className={cn("space-y-4", className)}>
      {error && isMockData && showMockDataWarning && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Using fallback data:</strong> {error}
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="ml-2 text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  )
}

function DefaultLoadingComponent() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading data...</span>
        </div>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

function DefaultErrorComponent({ 
  error, 
  onRetry 
}: { 
  error: string
  onRetry?: () => void 
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Failed to load data</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized loading states for different content types
export function DataTableLoadingState({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DataCardLoadingState({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}