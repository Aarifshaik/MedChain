"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataSourceIndicator } from '@/components/ui/data-source-indicator'
import { DataLoadingState } from '@/components/ui/data-loading-state'
import { useDashboardStats } from '@/hooks/use-data'
import { Activity, FileText, Shield, Users, Eye } from 'lucide-react'

const statIcons = {
  totalRecords: FileText,
  activeConsents: Shield,
  recentAccess: Eye,
  systemUsers: Users,
}

export function DashboardStats() {
  const { data: stats, isLoading, error, isMockData, retry } = useDashboardStats()

  return (
    <DataLoadingState
      isLoading={isLoading}
      error={error}
      isMockData={isMockData}
      onRetry={retry}
      loadingComponent={<StatsLoadingSkeleton />}
    >
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Records"
            value={stats.totalRecords.toLocaleString()}
            change={stats.recordsChange}
            icon={FileText}
            isMockData={isMockData}
          />
          <StatCard
            title="Active Consents"
            value={stats.activeConsents.toLocaleString()}
            change={stats.consentsChange}
            icon={Shield}
            isMockData={isMockData}
          />
          <StatCard
            title="Recent Access"
            value={stats.recentAccess.toLocaleString()}
            change={stats.accessChange}
            icon={Eye}
            isMockData={isMockData}
          />
          <StatCard
            title="System Users"
            value={stats.systemUsers.toLocaleString()}
            change={stats.usersChange}
            icon={Users}
            isMockData={isMockData}
          />
        </div>
      ) : null}
    </DataLoadingState>
  )
}

interface StatCardProps {
  title: string
  value: string
  change: string
  icon: React.ComponentType<{ className?: string }>
  isMockData: boolean
}

function StatCard({ title, value, change, icon: Icon, isMockData }: StatCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <DataSourceIndicator size="sm" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {change}
          </Badge>
          {" "}from last month
        </p>
      </CardContent>
    </Card>
  )
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}