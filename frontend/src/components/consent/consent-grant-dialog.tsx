"use client"

import { useState } from "react"
import { Search, Calendar, Shield, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProviderSearchDialog } from "./provider-search-dialog"
import { ConsentToken, Permission, RecordType, UserRole } from "@/types"

interface ConsentGrantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConsentGranted: (consent: ConsentToken) => void
}

interface SelectedProvider {
  id: string
  name: string
  role: UserRole
  specialization?: string
  organization?: string
}

const RECORD_TYPES = [
  { value: RecordType.DIAGNOSIS, label: "Diagnosis Records", description: "Medical diagnoses and conditions" },
  { value: RecordType.PRESCRIPTION, label: "Prescriptions", description: "Medication prescriptions and dosages" },
  { value: RecordType.LAB_RESULT, label: "Lab Results", description: "Laboratory test results and reports" },
  { value: RecordType.IMAGING, label: "Medical Imaging", description: "X-rays, MRIs, CT scans, and other imaging" },
  { value: RecordType.CONSULTATION_NOTE, label: "Consultation Notes", description: "Doctor visit notes and observations" },
]

export function ConsentGrantDialog({ open, onOpenChange, onConsentGranted }: ConsentGrantDialogProps) {
  const [step, setStep] = useState<'provider' | 'permissions' | 'review'>('provider')
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider | null>(null)
  const [isProviderSearchOpen, setIsProviderSearchOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
  const [expirationDate, setExpirationDate] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleProviderSelect = (provider: SelectedProvider) => {
    setSelectedProvider(provider)
    setIsProviderSearchOpen(false)
    setStep('permissions')
  }

  const handlePermissionToggle = (recordType: RecordType, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [
        ...prev,
        { resourceType: recordType, accessLevel: 'read' as const }
      ])
    } else {
      setSelectedPermissions(prev => 
        prev.filter(p => p.resourceType !== recordType)
      )
    }
  }

  const isPermissionSelected = (recordType: RecordType) => {
    return selectedPermissions.some(p => p.resourceType === recordType)
  }

  const handleNext = () => {
    if (step === 'provider' && selectedProvider) {
      setStep('permissions')
    } else if (step === 'permissions' && selectedPermissions.length > 0) {
      setStep('review')
    }
  }

  const handleBack = () => {
    if (step === 'permissions') {
      setStep('provider')
    } else if (step === 'review') {
      setStep('permissions')
    }
  }

  const handleSubmit = async () => {
    if (!selectedProvider || selectedPermissions.length === 0) return

    setIsSubmitting(true)
    
    try {
      // In a real app, this would call the API to create the consent
      const newConsent: ConsentToken = {
        tokenId: `consent-${Date.now()}`,
        patientId: "patient-123", // Would come from auth context
        providerId: selectedProvider.id,
        permissions: selectedPermissions,
        expirationTime: expirationDate ? new Date(expirationDate) : undefined,
        isActive: true,
        createdAt: new Date(),
        signature: `mock-signature-${Date.now()}`
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onConsentGranted(newConsent)
      
      // Reset form
      setStep('provider')
      setSelectedProvider(null)
      setSelectedPermissions([])
      setExpirationDate("")
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to grant consent:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep('provider')
    setSelectedProvider(null)
    setSelectedPermissions([])
    setExpirationDate("")
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Grant Healthcare Data Access
            </DialogTitle>
            <DialogDescription>
              Allow a healthcare provider to access specific types of your medical records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'provider' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'provider' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  1
                </div>
                <span className="text-sm font-medium">Select Provider</span>
              </div>
              <Separator className="w-12" />
              <div className={`flex items-center space-x-2 ${step === 'permissions' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'permissions' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">Set Permissions</span>
              </div>
              <Separator className="w-12" />
              <div className={`flex items-center space-x-2 ${step === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  3
                </div>
                <span className="text-sm font-medium">Review & Confirm</span>
              </div>
            </div>

            {/* Step Content */}
            {step === 'provider' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Healthcare Provider</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose the healthcare provider you want to grant access to your medical records.
                  </p>
                </div>

                {selectedProvider ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{selectedProvider.name}</span>
                        <Badge variant="secondary" className="capitalize">
                          {selectedProvider.role.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {selectedProvider.specialization && (
                          <span>{selectedProvider.specialization} • </span>
                        )}
                        {selectedProvider.organization}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsProviderSearchOpen(true)}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Change Provider
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Provider Selected</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Search and select a healthcare provider to grant access to.
                      </p>
                      <Button onClick={() => setIsProviderSearchOpen(true)}>
                        <Search className="mr-2 h-4 w-4" />
                        Search Providers
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {step === 'permissions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Set Data Access Permissions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which types of medical records {selectedProvider?.name} can access.
                  </p>
                </div>

                <div className="space-y-3">
                  {RECORD_TYPES.map((recordType) => (
                    <Card key={recordType.value} className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={recordType.value}
                          checked={isPermissionSelected(recordType.value)}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(recordType.value, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={recordType.value}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {recordType.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {recordType.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Expiration Date (Optional)</Label>
                  <Input
                    id="expiration"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for permanent access (can be revoked anytime)
                  </p>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Review Consent Details</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please review the consent details before confirming.
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    By granting this consent, you authorize the selected provider to access your specified medical records. 
                    You can revoke this consent at any time.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Provider Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm">{selectedProvider?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Role:</span>
                      <Badge variant="secondary" className="capitalize">
                        {selectedProvider?.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    {selectedProvider?.organization && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Organization:</span>
                        <span className="text-sm">{selectedProvider.organization}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Access Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedPermissions.map((permission) => {
                        const recordType = RECORD_TYPES.find(rt => rt.value === permission.resourceType)
                        return (
                          <div key={permission.resourceType} className="flex items-center justify-between">
                            <span className="text-sm">{recordType?.label}</span>
                            <Badge variant="outline">Read Access</Badge>
                          </div>
                        )
                      })}
                    </div>
                    {expirationDate && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Expires:</span>
                          <span className="text-sm">{new Date(expirationDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <div>
                {step !== 'provider' && (
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                )}
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {step === 'review' ? (
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Granting...' : 'Grant Consent'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNext}
                    disabled={
                      (step === 'provider' && !selectedProvider) ||
                      (step === 'permissions' && selectedPermissions.length === 0)
                    }
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProviderSearchDialog
        open={isProviderSearchOpen}
        onOpenChange={setIsProviderSearchOpen}
        onProviderSelect={handleProviderSelect}
      />
    </>
  )
}