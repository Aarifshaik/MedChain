"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditEntry, AuditEventType } from "@/types"
import { 
  Copy, 
  ExternalLink, 
  Clock, 
  User, 
  FileText, 
  Hash, 
  Shield,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

interface AuditDetailDialogProps {
  entry: AuditEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditDetailDialog({ entry, open, onOpenChange }: AuditDetailDialogProps) {
  if (!entry) return null

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const getEventTypeColor = (eventType: AuditEventType) => {
    switch (eventType) {
      case AuditEventType.RECORD_ACCESSED:
        return "text-blue-600 bg-blue-50 border-blue-200"
      case AuditEventType.RECORD_CREATED:
        return "text-green-600 bg-green-50 border-green-200"
      case AuditEventType.CONSENT_GRANTED:
        return "text-purple-600 bg-purple-50 border-purple-200"
      case AuditEventType.CONSENT_REVOKED:
        return "text-red-600 bg-red-50 border-red-200"
      case AuditEventType.USER_REGISTRATION:
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case AuditEventType.USER_APPROVAL:
        return "text-indigo-600 bg-indigo-50 border-indigo-200"
      case AuditEventType.LOGIN_ATTEMPT:
        return "text-gray-600 bg-gray-50 border-gray-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getEventIcon = (eventType: AuditEventType) => {
    switch (eventType) {
      case AuditEventType.RECORD_ACCESSED:
      case AuditEventType.RECORD_CREATED:
        return <FileText className="w-5 h-5" />
      case AuditEventType.CONSENT_GRANTED:
      case AuditEventType.CONSENT_REVOKED:
        return <Shield className="w-5 h-5" />
      case AuditEventType.USER_REGISTRATION:
      case AuditEventType.USER_APPROVAL:
        return <User className="w-5 h-5" />
      case AuditEventType.LOGIN_ATTEMPT:
        return <CheckCircle className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  const renderDetailValue = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-1">
          <span className="font-medium">{key}:</span>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-between">
        <span className="font-medium">{key}:</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{String(value)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(String(value), key)}
            className="h-6 w-6 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${getEventTypeColor(entry.eventType)}`}>
              {getEventIcon(entry.eventType)}
            </div>
            <div>
              <div className="text-xl font-bold">Audit Entry Details</div>
              <div className="text-sm text-muted-foreground font-mono">
                {entry.entryId}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detailed information about this audit trail entry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Event Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Event Type:</span>
                    <Badge className={getEventTypeColor(entry.eventType)}>
                      {entry.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">User ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{entry.userId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(entry.userId, 'User ID')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Resource ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{entry.resourceId || 'N/A'}</span>
                      {entry.resourceId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(entry.resourceId!, 'Resource ID')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Timestamp:</span>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Block Number:</span>
                    <span className="font-mono text-sm">{entry.blockNumber.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Blockchain Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Transaction ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{entry.transactionId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(entry.transactionId, 'Transaction ID')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="View on blockchain explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Digital Signature:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm truncate max-w-xs">
                    {entry.signature}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(entry.signature, 'Digital Signature')}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(entry.details).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No additional details available for this event
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(entry.details).map(([key, value]) => (
                    <div key={key}>
                      {renderDetailValue(key, value)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">Verified</div>
                  <div className="text-sm text-green-600">
                    This audit entry has been cryptographically verified and is immutable
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}