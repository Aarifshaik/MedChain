"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { useData } from '@/contexts/data-context'
import { cn } from '@/lib/utils'

interface NetworkStatusProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function NetworkStatus({ 
  className, 
  showLabel = false,
  size = 'sm'
}: NetworkStatusProps) {
  const { config, error } = useData()
  const [isOnline, setIsOnline] = useState(true)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good')

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Test connection quality periodically
  useEffect(() => {
    if (!isOnline) {
      setConnectionQuality('offline')
      return
    }

    const testConnection = async () => {
      try {
        const start = Date.now()
        const response = await fetch(`${config.apiEndpoint}/health`, {
          method: 'HEAD',
          cache: 'no-cache'
        })
        const duration = Date.now() - start

        if (response.ok) {
          setConnectionQuality(duration > 2000 ? 'poor' : 'good')
        } else {
          setConnectionQuality('poor')
        }
      } catch {
        setConnectionQuality('poor')
      }
    }

    // Test immediately and then every 30 seconds
    testConnection()
    const interval = setInterval(testConnection, 30000)

    return () => clearInterval(interval)
  }, [isOnline, config.apiEndpoint])

  const getVariant = () => {
    if (!isOnline || connectionQuality === 'offline') return 'destructive'
    if (connectionQuality === 'poor' || error) return 'secondary'
    return 'default'
  }

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
    
    if (!isOnline || connectionQuality === 'offline') {
      return <WifiOff className={iconSize} />
    }
    if (connectionQuality === 'poor' || error) {
      return <AlertTriangle className={iconSize} />
    }
    return <Wifi className={iconSize} />
  }

  const getLabel = () => {
    if (!isOnline || connectionQuality === 'offline') return 'Offline'
    if (connectionQuality === 'poor') return 'Poor'
    if (error) return 'Issues'
    return 'Online'
  }

  const getTooltipContent = () => {
    if (!isOnline) return 'No internet connection'
    if (connectionQuality === 'offline') return 'Cannot reach server'
    if (connectionQuality === 'poor') return 'Slow connection to server'
    if (error) return `Connection issues: ${error}`
    return 'Connected to server'
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