"use client"

import { ReactNode } from 'react'
import { MockDataBanner } from '@/components/ui/mock-data-banner'

interface DataAwareLayoutProps {
  children: ReactNode
  showBanner?: boolean
  bannerVariant?: 'banner' | 'compact'
  showToggle?: boolean
  dismissible?: boolean
}

export function DataAwareLayout({
  children,
  showBanner = true,
  bannerVariant = 'banner',
  showToggle = true,
  dismissible = true
}: DataAwareLayoutProps) {
  return (
    <div className="space-y-4">
      {showBanner && (
        <MockDataBanner
          variant={bannerVariant}
          showToggle={showToggle}
          dismissible={dismissible}
        />
      )}
      {children}
    </div>
  )
}