"use client"

import { useState, useEffect } from "react"
import { Activity, AlertTriangle, Clock, Shield, TrendingUp, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsentToken, AuditEntry, AuditEventType } from "@/types"

interface ConsentMonitoringDashboardProps {
  consents: ConsentToken[]
}

interface ConsentMetrics {
  totalActive: number
  totalExpired: number
  totalRevoked: number
  expiringSoon: number
  recentActivity: number
  mostAccessedProvider: string
  averageConsentDuration: number
}

interface AccessActivity {
  providerId: string
  providerName: string
  accessCount: number
  lastAccess: Date
  consentType: string[]
}

export function ConsentMonitoringDashboard({ consents }: ConsentMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<ConsentMetrics | null>(null)
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([])
  const [accessActivity, setAccessActivity] = useState<AccessActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Calculate metrics
    const now = Date.now()
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)

    const activeConsents = consents.filter(c => c.isActive && (!c.expirationTime || new Date(c.expirationTime) > new Date()))
    const expiredConsents = consents.filter(c => c.expirationTime && new Date(c.expirationTime) <= new Date())
    const revokedConsents = consents.filter(c => c.revokedAt)
    const expiringSoon = activeConsents.filter(c => 
      c.expirationTime && new Date(c.expirationTime).getTime() - now < 7 * 24 * 60 * 60 * 1000
    )
    const recentConsents = consents.filter(c => new Date(c.createdAt).getTime() > sevenDaysAgo)

    // Calculate average consent duration
    const completedConsents = [...expiredConsents, ...revokedConsents]
    const avgDuration = completedConsents.length > 0 
      ? completedConsents.reduce((sum, consent) => {
          const endDate = consent.revokedAt ? new Date(consent.revokedAt) : new Date(consent.expirationTime!)
          const duration = endDate.getTime() - new Date(consent.createdAt).getTime()
          return sum + duration
        }, 0) / completedConsents.length / (24 * 60 * 60 * 1000) // Convert to days
      : 0

    // Find most accessed provider (mock data)
    const providerCounts: Record<string, number> = {}
    consents.forEach(consent => {
      providerCounts[consent.providerId] = (providerCounts[consent.providerId] || 0) + 1
    })
    const mostAccessedProvider = Object.entries(providerCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'

    const calculatedMetrics: ConsentMetrics = {
      totalActive: activeConsents.length,
      totalExpired: expiredConsents.length,
      totalRevoked: revokedConsents.length,
      expiringSoon: expiringSoon.length,
      recentActivity: recentConsents.length,
      mostAccessedProvider,
      averageConsentDuration: Math.round(avgDuration)
    }

    setMetrics(calculatedMetrics)

    // Mock recent activity data
    const mockActivity: AuditEntry[] = [
      {
        entryId: "audit-1",
        eventType: AuditEventType.CONSENT_GRANTED,
        userId: "patient-123",
        resourceId: "consent-1",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        details: { providerId: "doctor-456", permissions: ["diagnosis", "prescription"] },
        signature: "mock-sig-1",
        blockNumber: 12345,
        transactionId: "tx-1"
      },
      {
        entryId: "audit-2",
        eventType: AuditEventType.RECORD_ACCESSED,
        userId: "doctor-456",
        resourceId: "record-123",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        details: { patientId: "patient-123", recordType: "diagnosis" },
        signature: "mock-sig-2",
        blockNumber: 12344,
        transactionId: "tx-2"
      },
      {
        entryId: "audit-3",
        eventType: AuditEventType.CONSENT_REVOKED,
        userId: "patient-123",
        resourceId: "consent-old",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        details: { providerId: "insurer-101", reason: "manual_revocation" },
        signature: "mock-sig-3",
        blockNumber: 12343,
        transactionId: "tx-3"
      }
    ]

    setRecentActivity(mockActivity)

    // Mock access activity data
    const mockAccessActivity: AccessActivity[] = [
      {
        providerId: "doctor-456",
        providerName: "Dr. Sarah Johnson",
        accessCount: 15,
        lastAccess: new Date(Date.now() - 2 * 60 * 60 * 1000),
        consentType: ["Diagnosis", "Prescriptions"]
      },
      {
        providerId: "lab-789",
        providerName: "Central Diagnostics Lab",
        accessCount: 8,
        lastAccess: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        consentType: ["Lab Results"]
      },
      {
        providerId: "insurer-101",
        providerName: "HealthFirst Insurance",
        accessCount: 3,
        lastAccess: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        consentType: ["Diagnosis"]
      }
    ]

    setAccessActivity(mockAccessActivity)
    setLoading(false)
  }, [consents])

  const getProviderName = (providerId: string) => {
    const providerNames: Record<string, string> = {
      'doctor-456': 'Dr. Sarah Johnson',
      'lab-789': 'Central Diagnostics Lab',
      'insurer-101': 'HealthFirst Insurance'
    }
    return providerNames[providerId] || `Provider ${providerId}`
  }

  const getEventTypeIcon = (eventType: AuditEventType) => {
    switch (eventType) {
      case AuditEventType.CONSENT_GRANTED:
        return <Shield className="h-4 w-4 text-green-600" />
      case AuditEventType.CONSENT_REVOKED:
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case AuditEventType.RECORD_ACCESSED:
        return <Activity className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventTypeLabel = (eventType: AuditEventType) => {
    switch (eventType) {
      case AuditEventType.CONSENT_GRANTED:
        return "Consent Granted"
      case AuditEventType.CONSENT_REVOKED:
        return "Consent Revoked"
      case AuditEventType.RECORD_ACCESSED:
        return "Record Accessed"
      default:
        return eventType.replace('_', ' ')
    }
  }

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.totalActive}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.recentActivity} granted this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Within next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.averageConsentDuration}</div>
            <p className="text-xs text-muted-foreground">
              Days per consent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revoked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.totalRevoked}</div>
            <p className="text-xs text-muted-foreground">
              Manually revoked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="access">Access Patterns</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Consent Activity</CardTitle>
              <CardDescription>
                Latest consent-related events and data access activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.entryId} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="mt-1">
                      {getEventTypeIcon(activity.eventType)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {getEventTypeLabel(activity.eventType)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {activity.timestamp.toLocaleTimeString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.eventType === AuditEventType.CONSENT_GRANTED && 
                          `Granted access to ${getProviderName(activity.details.providerId)} for ${activity.details.permissions.join(', ')}`
                        }
                        {activity.eventType === AuditEventType.CONSENT_REVOKED && 
                          `Revoked access for ${getProviderName(activity.details.providerId)}`
                        }
                        {activity.eventType === AuditEventType.RECORD_ACCESSED && 
                          `${getProviderName(activity.userId)} accessed ${activity.details.recordType} record`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Block #{activity.blockNumber} • Transaction: {activity.transactionId.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Access Patterns</CardTitle>
              <CardDescription>
                How frequently different providers access your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {accessActivity.map((provider) => (
                  <div key={provider.providerId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{provider.providerName}</p>
                        <p className="text-xs text-muted-foreground">
                          Last access: {provider.lastAccess.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{provider.accessCount} accesses</p>
                        <div className="flex gap-1">
                          {provider.consentType.map((type, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={(provider.accessCount / Math.max(...accessActivity.map(p => p.accessCount))) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
              <CardDescription>
                Important notifications about your consent permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.expiringSoon > 0 && (
                  <div className="flex items-start space-x-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Consents Expiring Soon
                      </p>
                      <p className="text-sm text-yellow-700">
                        {metrics.expiringSoon} consent{metrics.expiringSoon > 1 ? 's' : ''} will expire within the next 7 days. 
                        Review and extend if needed.
                      </p>
                    </div>
                  </div>
                )}

                {metrics.totalActive === 0 && (
                  <div className="flex items-start space-x-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        No Active Consents
                      </p>
                      <p className="text-sm text-blue-700">
                        You don't have any active consent permissions. Healthcare providers won't be able to access your records.
                      </p>
                    </div>
                  </div>
                )}

                {metrics.recentActivity > 5 && (
                  <div className="flex items-start space-x-4 p-4 border border-green-200 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        High Activity Week
                      </p>
                      <p className="text-sm text-green-700">
                        You've granted {metrics.recentActivity} new consents this week. Make sure you're comfortable with all permissions.
                      </p>
                    </div>
                  </div>
                )}

                {metrics.expiringSoon === 0 && metrics.totalActive > 0 && metrics.recentActivity <= 5 && (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-800 mb-2">All Good!</h3>
                    <p className="text-green-700">
                      No alerts at this time. Your consent permissions are properly managed.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}