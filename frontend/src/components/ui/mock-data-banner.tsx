"use client"

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useData } from '@/contexts/data-context'
import { Database, X, Settings, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MockDataBannerProps {
  className?: string
  variant?: 'banner' | 'compact'
  showToggle?: boolean
  dismissible?: boolean
}

export function MockDataBanner({ 
  className, 
  variant = 'banner',
  showToggle = false,
  dismissible = false 
}: MockDataBannerProps) {
  const { isMockData, config, toggleDataSource, error } = useData()
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show banner if not using mock data and no error
  if ((!isMockData && !error) || isDismissed) {
    return null
  }

  // Don't show if mock data indicator is disabled
  if (!config.mockDataIndicator) {
    return null
  }

  const handleToggle = () => {
    toggleDataSource(!config.useMockData)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  if (variant === 'compact') {
    return (
      <Badge 
        variant={error ? "destructive" : "secondary"} 
        className={cn("flex items-center gap-1", className)}
      >
        <Database className="w-3 h-3" />
        {error ? 'Fallback Data' : 'Mock Data'}
      </Badge>
    )
  }

  return (
    <Alert className={cn("border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950", className)}>
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-800 dark:text-orange-200">
            {error ? (
              <>
                <strong>Using fallback data:</strong> {error}
              </>
            ) : (
              <>
                <strong>Mock data mode:</strong> Currently displaying sample data for demonstration purposes.
              </>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {showToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle}
              className="text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900"
            >
              <Settings className="w-3 h-3 mr-1" />
              {config.useMockData ? 'Use Real Data' : 'Use Mock Data'}
            </Button>
          )}
          
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}