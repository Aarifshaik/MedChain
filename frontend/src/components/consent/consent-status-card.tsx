"use client"

import { useState } from "react"
import { Calendar, Shield, AlertTriangle, MoreVertical, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ConsentToken, RecordType } from "@/types"

interface ConsentStatusCardProps {
  consent: ConsentToken
  onRevoke: (tokenId: string) => void
}

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  [RecordType.DIAGNOSIS]: "Diagnosis",
  [RecordType.PRESCRIPTION]: "Prescriptions",
  [RecordType.LAB_RESULT]: "Lab Results",
  [RecordType.IMAGING]: "Medical Imaging",
  [RecordType.CONSULTATION_NOTE]: "Consultation Notes",
}

export function ConsentStatusCard({ consent, onRevoke }: ConsentStatusCardProps) {
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const isExpiringSoon = consent.expirationTime && 
    new Date(consent.expirationTime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  const isExpired = consent.expirationTime && 
    new Date(consent.expirationTime).getTime() < Date.now()

  const handleRevoke = async () => {
    setIsRevoking(true)
    try {
      // In real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      onRevoke(consent.tokenId)
      setShowRevokeDialog(false)
    } catch (error) {
      console.error('Failed to revoke consent:', error)
    } finally {
      setIsRevoking(false)
    }
  }

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (isExpiringSoon) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
  }

  const getProviderName = (providerId: string) => {
    // In real app, this would come from provider data
    const providerNames: Record<string, string> = {
      'doctor-456': 'Dr. Sarah Johnson',
      'lab-789': 'Central Diagnostics Lab',
      'insurer-101': 'HealthFirst Insurance'
    }
    return providerNames[providerId] || `Provider ${providerId}`
  }

  return (
    <>
      <Card className={`${isExpired ? 'opacity-75' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {getProviderName(consent.providerId)}
              </CardTitle>
              <CardDescription>
                Granted {new Date(consent.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => setShowRevokeDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Revoke Consent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Permissions */}
          <div>
            <h4 className="text-sm font-medium mb-2">Permitted Access</h4>
            <div className="flex flex-wrap gap-1">
              {consent.permissions.map((permission, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {RECORD_TYPE_LABELS[permission.resourceType]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Expiration */}
          {consent.expirationTime && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {isExpired ? 'Expired' : 'Expires'} {new Date(consent.expirationTime).toLocaleDateString()}
              </span>
              {isExpiringSoon && !isExpired && (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
          )}

          {!consent.expirationTime && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">No expiration date</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:text-red-700"
              onClick={() => setShowRevokeDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Consent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke consent for {getProviderName(consent.providerId)}? 
              This will immediately prevent them from accessing your medical records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Consent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}