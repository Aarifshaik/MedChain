"use client"

import { useState, useEffect } from "react"
import { Plus, Shield, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsentGrantDialog } from "./consent-grant-dialog"
import { ConsentStatusCard } from "./consent-status-card"
import { ConsentHistoryTable } from "./consent-history-table"
import { ConsentMonitoringDashboard } from "./consent-monitoring-dashboard"
import { ConsentRevocationManager } from "./consent-revocation-manager"
import { ConsentToken } from "@/types"

export function ConsentDashboard() {
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
  const [activeConsents, setActiveConsents] = useState<ConsentToken[]>([])
  const [expiredConsents, setExpiredConsents] = useState<ConsentToken[]>([])
  const [revokedConsents, setRevokedConsents] = useState<ConsentToken[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data for demonstration - in real app this would come from API
  useEffect(() => {
    const mockActiveConsents: ConsentToken[] = [
      {
        tokenId: "consent-1",
        patientId: "patient-123",
        providerId: "doctor-456",
        permissions: [
          { resourceType: "diagnosis" as any, accessLevel: "read" },
          { resourceType: "prescription" as any, accessLevel: "read" }
        ],
        expirationTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        signature: "mock-signature-1"
      },
      {
        tokenId: "consent-2",
        patientId: "patient-123",
        providerId: "lab-789",
        permissions: [
          { resourceType: "lab_result" as any, accessLevel: "read" }
        ],
        expirationTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        isActive: true,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        signature: "mock-signature-2"
      }
    ]

    const mockExpiredConsents: ConsentToken[] = [
      {
        tokenId: "consent-3",
        patientId: "patient-123",
        providerId: "insurer-101",
        permissions: [
          { resourceType: "diagnosis" as any, accessLevel: "read" }
        ],
        expirationTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isActive: false,
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        signature: "mock-signature-3"
      }
    ]

    setActiveConsents(mockActiveConsents)
    setExpiredConsents(mockExpiredConsents)
    setRevokedConsents([])
    setLoading(false)
  }, [])

  const handleConsentGranted = (newConsent: ConsentToken) => {
    setActiveConsents(prev => [...prev, newConsent])
  }

  const handleConsentRevoked = (tokenId: string) => {
    setActiveConsents(prev => prev.filter(consent => consent.tokenId !== tokenId))
    // In real app, would move to revoked list
  }

  const handleBulkConsentRevoked = (tokenIds: string[], reason?: string) => {
    setActiveConsents(prev => prev.filter(consent => !tokenIds.includes(consent.tokenId)))
    // In real app, would move to revoked list with reason
  }

  const totalActive = activeConsents.length
  const totalExpired = expiredConsents.length
  const totalRevoked = revokedConsents.length
  const expiringSoon = activeConsents.filter(consent => 
    consent.expirationTime && 
    new Date(consent.expirationTime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  ).length

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalActive}</div>
            <p className="text-xs text-muted-foreground">
              Currently active permissions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Expiring within 7 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalExpired}</div>
            <p className="text-xs text-muted-foreground">
              No longer active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{totalRevoked}</div>
            <p className="text-xs text-muted-foreground">
              Manually revoked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grant New Consent Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Consent Permissions</h2>
          <p className="text-muted-foreground">
            Manage who can access your healthcare data and for what purposes.
          </p>
        </div>
        <Button onClick={() => setIsGrantDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Grant New Consent
        </Button>
      </div>

      {/* Consent Management Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Consents
            {totalActive > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalActive}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="revocation">
            Revoke Consents
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            Monitoring & Analytics
          </TabsTrigger>
          <TabsTrigger value="history">
            Consent History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeConsents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeConsents.map((consent) => (
                <ConsentStatusCard
                  key={consent.tokenId}
                  consent={consent}
                  onRevoke={handleConsentRevoked}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Consents</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't granted any healthcare providers access to your data yet.
                </p>
                <Button onClick={() => setIsGrantDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Grant Your First Consent
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="revocation" className="space-y-4">
          <ConsentRevocationManager 
            consents={[...activeConsents, ...expiredConsents, ...revokedConsents]}
            onRevoke={handleBulkConsentRevoked}
          />
        </TabsContent>
        
        <TabsContent value="monitoring" className="space-y-4">
          <ConsentMonitoringDashboard 
            consents={[...activeConsents, ...expiredConsents, ...revokedConsents]}
          />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <ConsentHistoryTable 
            consents={[...activeConsents, ...expiredConsents, ...revokedConsents]}
          />
        </TabsContent>
      </Tabs>

      {/* Grant Consent Dialog */}
      <ConsentGrantDialog
        open={isGrantDialogOpen}
        onOpenChange={setIsGrantDialogOpen}
        onConsentGranted={handleConsentGranted}
      />
    </div>
  )
}