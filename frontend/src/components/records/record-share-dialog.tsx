"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Share,
  User,
  Calendar,
  Clock,
  Shield,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { MedicalRecord, RecordType, Permission, UserRole } from '@/types'
import { apiClient } from '@/lib/api'

interface RecordShareDialogProps {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShareRequest {
  providerId: string
  providerRole: UserRole
  permissions: Permission[]
  expirationTime?: Date
  purpose: string
  notes?: string
}

interface ExistingShare {
  consentTokenId: string
  providerId: string
  providerRole: UserRole
  permissions: Permission[]
  expirationTime?: Date
  createdAt: Date
  isActive: boolean
}

export function RecordShareDialog({ record, open, onOpenChange }: RecordShareDialogProps) {
  const [shareRequest, setShareRequest] = useState<ShareRequest>({
    providerId: '',
    providerRole: UserRole.DOCTOR,
    permissions: [],
    purpose: ''
  })

  const [existingShares, setExistingShares] = useState<ExistingShare[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string>('')

  if (!record) return null

  const handlePermissionChange = (resourceType: RecordType, accessLevel: 'read' | 'write', checked: boolean) => {
    setShareRequest(prev => {
      const newPermissions = [...prev.permissions]
      const existingIndex = newPermissions.findIndex(
        p => p.resourceType === resourceType && p.accessLevel === accessLevel
      )

      if (checked && existingIndex === -1) {
        newPermissions.push({ resourceType, accessLevel })
      } else if (!checked && existingIndex !== -1) {
        newPermissions.splice(existingIndex, 1)
      }

      return { ...prev, permissions: newPermissions }
    })
  }

  const handleExpirationChange = (value: string) => {
    if (value === 'never') {
      setShareRequest(prev => ({ ...prev, expirationTime: undefined }))
    } else {
      const now = new Date()
      let expirationTime: Date

      switch (value) {
        case '1hour':
          expirationTime = new Date(now.getTime() + 60 * 60 * 1000)
          break
        case '1day':
          expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case '1week':
          expirationTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case '1month':
          expirationTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
        default:
          expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }

      setShareRequest(prev => ({ ...prev, expirationTime }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!shareRequest.providerId.trim()) {
      setSubmitError('Please enter a provider ID')
      setSubmitStatus('error')
      return
    }

    if (shareRequest.permissions.length === 0) {
      setSubmitError('Please select at least one permission')
      setSubmitStatus('error')
      return
    }

    if (!shareRequest.purpose.trim()) {
      setSubmitError('Please provide a purpose for sharing')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setSubmitError('')

    try {
      const response = await apiClient.post('/consent/grant', {
        recordId: record.recordId,
        providerId: shareRequest.providerId,
        providerRole: shareRequest.providerRole,
        permissions: shareRequest.permissions,
        expirationTime: shareRequest.expirationTime?.toISOString(),
        purpose: shareRequest.purpose,
        notes: shareRequest.notes
      })

      if (response.success) {
        setSubmitStatus('success')
        // Reset form
        setShareRequest({
          providerId: '',
          providerRole: UserRole.DOCTOR,
          permissions: [],
          purpose: ''
        })
        // TODO: Refresh existing shares list
      } else {
        throw new Error(response.error?.message || 'Failed to grant access')
      }
    } catch (error) {
      setSubmitStatus('error')
      setSubmitError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevokeAccess = async (consentTokenId: string) => {
    try {
      const response = await apiClient.post('/consent/revoke', {
        consentTokenId
      })

      if (response.success) {
        // TODO: Refresh existing shares list
        setExistingShares(prev => 
          prev.map(share => 
            share.consentTokenId === consentTokenId 
              ? { ...share, isActive: false }
              : share
          )
        )
      }
    } catch (error) {
      console.error('Failed to revoke access:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.DOCTOR:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case UserRole.LABORATORY:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case UserRole.INSURER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Share Record Access
          </DialogTitle>
          <DialogDescription>
            Grant access to "{record.metadata.title}" for healthcare providers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Grant New Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grant New Access</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="providerId">Provider ID *</Label>
                    <Input
                      id="providerId"
                      value={shareRequest.providerId}
                      onChange={(e) => setShareRequest(prev => ({ ...prev, providerId: e.target.value }))}
                      placeholder="e.g., dr.smith@hospital.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="providerRole">Provider Role</Label>
                    <Select
                      value={shareRequest.providerRole}
                      onValueChange={(value) => setShareRequest(prev => ({ ...prev, providerRole: value as UserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                        <SelectItem value={UserRole.LABORATORY}>Laboratory</SelectItem>
                        <SelectItem value={UserRole.INSURER}>Insurance Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Access Permissions *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Read Access
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="read-this-record"
                            checked={shareRequest.permissions.some(p => p.resourceType === record.recordType && p.accessLevel === 'read')}
                            onCheckedChange={(checked) => handlePermissionChange(record.recordType, 'read', checked as boolean)}
                          />
                          <Label htmlFor="read-this-record" className="text-sm">
                            This record ({record.recordType})
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Write Access
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="write-this-record"
                            checked={shareRequest.permissions.some(p => p.resourceType === record.recordType && p.accessLevel === 'write')}
                            onCheckedChange={(checked) => handlePermissionChange(record.recordType, 'write', checked as boolean)}
                          />
                          <Label htmlFor="write-this-record" className="text-sm">
                            Add related records
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Access Duration</Label>
                  <Select onValueChange={handleExpirationChange} defaultValue="1day">
                    <SelectTrigger>
                      <Clock className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1hour">1 Hour</SelectItem>
                      <SelectItem value="1day">1 Day</SelectItem>
                      <SelectItem value="1week">1 Week</SelectItem>
                      <SelectItem value="1month">1 Month</SelectItem>
                      <SelectItem value="never">No Expiration</SelectItem>
                    </SelectContent>
                  </Select>
                  {shareRequest.expirationTime && (
                    <p className="text-sm text-muted-foreground">
                      Access will expire on {formatDate(shareRequest.expirationTime)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Input
                    id="purpose"
                    value={shareRequest.purpose}
                    onChange={(e) => setShareRequest(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="e.g., Consultation, Second opinion, Treatment planning"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={shareRequest.notes || ''}
                    onChange={(e) => setShareRequest(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes about this access grant..."
                    rows={2}
                  />
                </div>

                {submitStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {submitStatus === 'success' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Access granted successfully! The provider can now access this record.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Granting Access...' : 'Grant Access'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Existing Access Grants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Access Grants</CardTitle>
            </CardHeader>
            <CardContent>
              {existingShares.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Shares</h3>
                  <p className="text-muted-foreground">
                    This record hasn't been shared with any providers yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {existingShares.map((share) => (
                    <div key={share.consentTokenId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{share.providerId}</p>
                            <Badge className={getRoleColor(share.providerRole)}>
                              {share.providerRole}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {share.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Revoked</Badge>
                          )}
                          {share.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeAccess(share.consentTokenId)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Permissions</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {share.permissions.map((permission, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {permission.accessLevel} {permission.resourceType}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Granted</p>
                          <p>{formatDate(share.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p>{share.expirationTime ? formatDate(share.expirationTime) : 'Never'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}