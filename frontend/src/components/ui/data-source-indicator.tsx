"use client"

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useData } from '@/contexts/data-context'
import { Database, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataSourceIndicatorProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function DataSourceIndicator({ 
  className, 
  showLabel = false,
  size = 'sm'
}: DataSourceIndicatorProps) {
  const { isMockData, config, error } = useData()

  // Don't show if mock data indicator is disabled
  if (!config.mockDataIndicator) {
    return null
  }

  const getVariant = () => {
    if (error) return 'destructive'
    if (isMockData) return 'secondary'
    return 'default'
  }

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
    
    if (error) return <AlertTriangle className={iconSize} />
    if (isMockData) return <Database className={iconSize} />
    return <Wifi className={iconSize} />
  }

  const getLabel = () => {
    if (error) return 'Fallback'
    if (isMockData) return 'Mock'
    return 'Live'
  }

  const getTooltipContent = () => {
    if (error) {
      return `Using fallback data due to API error: ${error}`
    }
    if (isMockData) {
      return 'Currently displaying mock/sample data for demonstration'
    }
    return 'Connected to live data source'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()}
            className={cn(
              "flex items-center gap-1 cursor-help",
              sizeClasses[size],
              className
            )}
          >
            {getIcon()}
            {showLabel && <span>{getLabel()}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}