"use client"

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataSourceIndicator } from '@/components/ui/data-source-indicator'
import { cn } from '@/lib/utils'

interface DataAwareCardProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  showDataIndicator?: boolean
  indicatorPosition?: 'header' | 'corner'
  indicatorSize?: 'sm' | 'md' | 'lg'
}

export function DataAwareCard({
  title,
  description,
  children,
  className,
  showDataIndicator = true,
  indicatorPosition = 'header',
  indicatorSize = 'sm'
}: DataAwareCardProps) {
  return (
    <Card className={cn("relative", className)}>
      {(title || description) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showDataIndicator && indicatorPosition === 'header' && (
            <DataSourceIndicator size={indicatorSize} />
          )}
        </CardHeader>
      )}
      
      <CardContent>
        {children}
      </CardContent>
      
      {showDataIndicator && indicatorPosition === 'corner' && (
        <div className="absolute top-2 right-2">
          <DataSourceIndicator size={indicatorSize} />
        </div>
      )}
    </Card>
  )
}