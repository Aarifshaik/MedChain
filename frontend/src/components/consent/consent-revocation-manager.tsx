"use client"

import { useState } from "react"
import { Trash2, AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConsentToken, RecordType } from "@/types"

interface ConsentRevocationManagerProps {
  consents: ConsentToken[]
  onRevoke: (tokenIds: string[], reason?: string) => void
}

const REVOCATION_REASONS = [
  { value: "no_longer_needed", label: "No longer needed" },
  { value: "provider_change", label: "Changed healthcare provider" },
  { value: "privacy_concerns", label: "Privacy concerns" },
  { value: "data_breach", label: "Suspected data breach" },
  { value: "consent_expired", label: "Consent period ended" },
  { value: "other", label: "Other reason" }
]

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  [RecordType.DIAGNOSIS]: "Diagnosis",
  [RecordType.PRESCRIPTION]: "Prescriptions",
  [RecordType.LAB_RESULT]: "Lab Results",
  [RecordType.IMAGING]: "Medical Imaging",
  [RecordType.CONSULTATION_NOTE]: "Consultation Notes",
}

export function ConsentRevocationManager({ consents, onRevoke }: ConsentRevocationManagerProps) {
  const [selectedConsents, setSelectedConsents] = useState<string[]>([])
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false)
  const [revocationReason, setRevocationReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [isRevoking, setIsRevoking] = useState(false)

  const activeConsents = consents.filter(c => c.isActive && (!c.expirationTime || new Date(c.expirationTime) > new Date()))
  const expiringSoonConsents = activeConsents.filter(c => 
    c.expirationTime && new Date(c.expirationTime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  )

  const getProviderName = (providerId: string) => {
    const providerNames: Record<string, string> = {
      'doctor-456': 'Dr. Sarah Johnson',
      'lab-789': 'Central Diagnostics Lab',
      'insurer-101': 'HealthFirst Insurance'
    }
    return providerNames[providerId] || `Provider ${providerId}`
  }

  const handleConsentToggle = (consentId: string, checked: boolean) => {
    if (checked) {
      setSelectedConsents(prev => [...prev, consentId])
    } else {
      setSelectedConsents(prev => prev.filter(id => id !== consentId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConsents(activeConsents.map(c => c.tokenId))
    } else {
      setSelectedConsents([])
    }
  }

  const handleBulkRevoke = async () => {
    if (selectedConsents.length === 0) return

    setIsRevoking(true)
    try {
      const finalReason = revocationReason === "other" ? customReason : 
        REVOCATION_REASONS.find(r => r.value === revocationReason)?.label || ""
      
      await onRevoke(selectedConsents, finalReason)
      
      // Reset form
      setSelectedConsents([])
      setRevocationReason("")
      setCustomReason("")
      setShowBulkRevokeDialog(false)
    } catch (error) {
      console.error('Failed to revoke consents:', error)
    } finally {
      setIsRevoking(false)
    }
  }

  const isExpiringSoon = (consent: ConsentToken) => {
    return consent.expirationTime && 
      new Date(consent.expirationTime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Consent Revocation Manager
          </CardTitle>
          <CardDescription>
            Manage and revoke consent permissions for your healthcare data access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Active Consents</p>
                <p className="text-2xl font-bold text-green-600">{activeConsents.length}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{expiringSoonConsents.length}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Trash2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Selected</p>
                <p className="text-2xl font-bold text-blue-600">{selectedConsents.length}</p>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {activeConsents.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="select-all"
                  checked={selectedConsents.length === activeConsents.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Select all active consents ({activeConsents.length})
                </Label>
              </div>
              
              {selectedConsents.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowBulkRevokeDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke Selected ({selectedConsents.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent List */}
      {activeConsents.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Consent Permissions</h3>
          <div className="space-y-3">
            {activeConsents.map((consent) => (
              <Card key={consent.tokenId} className={`${isExpiringSoon(consent) ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      id={consent.tokenId}
                      checked={selectedConsents.includes(consent.tokenId)}
                      onCheckedChange={(checked) => handleConsentToggle(consent.tokenId, checked as boolean)}
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{getProviderName(consent.providerId)}</h4>
                          <p className="text-sm text-muted-foreground">
                            Granted {new Date(consent.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpiringSoon(consent) && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              <Clock className="mr-1 h-3 w-3" />
                              Expiring Soon
                            </Badge>
                          )}
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {consent.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {RECORD_TYPE_LABELS[permission.resourceType]}
                          </Badge>
                        ))}
                      </div>
                      
                      {consent.expirationTime && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(consent.expirationTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Consents</h3>
            <p className="text-muted-foreground text-center">
              You don't have any active consent permissions to revoke.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Revocation Dialog */}
      <AlertDialog open={showBulkRevokeDialog} onOpenChange={setShowBulkRevokeDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Revoke Multiple Consents
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to revoke {selectedConsents.length} consent permission{selectedConsents.length > 1 ? 's' : ''}. 
              This action will immediately prevent the selected providers from accessing your medical records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            {/* Selected Consents Preview */}
            <div>
              <Label className="text-sm font-medium">Selected Consents:</Label>
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {selectedConsents.map(consentId => {
                  const consent = consents.find(c => c.tokenId === consentId)
                  return consent ? (
                    <div key={consentId} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{getProviderName(consent.providerId)}</span>
                      <div className="flex gap-1">
                        {consent.permissions.slice(0, 2).map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {RECORD_TYPE_LABELS[permission.resourceType]}
                          </Badge>
                        ))}
                        {consent.permissions.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{consent.permissions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : null
                })}
              </div>
            </div>

            {/* Revocation Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Revocation</Label>
              <Select value={revocationReason} onValueChange={setRevocationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REVOCATION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason */}
            {revocationReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Custom Reason</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Please specify the reason for revocation..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkRevoke}
              disabled={isRevoking || !revocationReason || (revocationReason === "other" && !customReason.trim())}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRevoking ? 'Revoking...' : `Revoke ${selectedConsents.length} Consent${selectedConsents.length > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}