"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  Download,
  Lock,
  Unlock,
  Eye,
  Calendar,
  User,
  FileType,
  Hash,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { MedicalRecord, RecordType } from '@/types'
import { AESEncryption } from '@/lib/crypto'
import { apiClient } from '@/lib/api'

interface RecordDetailDialogProps {
  record: MedicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordUpdate?: (recordId: string) => void
}

interface DecryptionState {
  status: 'idle' | 'decrypting' | 'success' | 'error'
  progress: number
  error?: string
  decryptedData?: Uint8Array
}

export function RecordDetailDialog({ 
  record, 
  open, 
  onOpenChange, 
  onRecordUpdate 
}: RecordDetailDialogProps) {
  const [decryptionState, setDecryptionState] = useState<DecryptionState>({
    status: 'idle',
    progress: 0
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Reset state when dialog opens/closes or record changes
  useEffect(() => {
    if (!open || !record) {
      setDecryptionState({ status: 'idle', progress: 0 })
      setPreviewUrl(null)
    }
  }, [open, record])

  if (!record) return null

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date))
  }

  const getRecordTypeColor = (type: RecordType) => {
    switch (type) {
      case RecordType.DIAGNOSIS:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case RecordType.PRESCRIPTION:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case RecordType.LAB_RESULT:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case RecordType.IMAGING:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case RecordType.CONSULTATION_NOTE:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getRecordTypeLabel = (type: RecordType) => {
    switch (type) {
      case RecordType.DIAGNOSIS:
        return 'Diagnosis'
      case RecordType.PRESCRIPTION:
        return 'Prescription'
      case RecordType.LAB_RESULT:
        return 'Lab Result'
      case RecordType.IMAGING:
        return 'Medical Imaging'
      case RecordType.CONSULTATION_NOTE:
        return 'Consultation Note'
      default:
        return type
    }
  }

  const handleDecryptAndPreview = async () => {
    if (!record) return

    setDecryptionState({ status: 'decrypting', progress: 0 })

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDecryptionState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 100)

      // Fetch encrypted data from IPFS via middleware
      const response = await apiClient.get(`/records/${record.recordId}/data`)
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch record data')
      }

      // TODO: Get user's encryption key from secure storage
      // This would involve:
      // 1. Getting the user's private keys
      // 2. Deriving the file encryption key using the stored key hash
      // 3. Decrypting the file data
      
      // For now, simulate decryption
      clearInterval(progressInterval)
      setDecryptionState({ status: 'success', progress: 100 })

      // Create preview URL for supported file types
      if (record.metadata.mimeType.startsWith('image/') || 
          record.metadata.mimeType === 'application/pdf') {
        // TODO: Create actual blob URL from decrypted data
        // const blob = new Blob([decryptedData], { type: record.metadata.mimeType })
        // const url = URL.createObjectURL(blob)
        // setPreviewUrl(url)
      }

    } catch (error) {
      setDecryptionState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Decryption failed'
      })
    }
  }

  const handleDownload = async () => {
    if (!record || decryptionState.status !== 'success') return

    try {
      // TODO: Implement actual download with decrypted data
      // const blob = new Blob([decryptionState.decryptedData!], { 
      //   type: record.metadata.mimeType 
      // })
      // const url = URL.createObjectURL(blob)
      // const a = document.createElement('a')
      // a.href = url
      // a.download = record.metadata.title
      // document.body.appendChild(a)
      // a.click()
      // document.body.removeChild(a)
      // URL.revokeObjectURL(url)
      
      console.log('Downloading record:', record.recordId)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {record.metadata.title}
          </DialogTitle>
          <DialogDescription>
            Medical record details and decryption controls
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Record Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileType className="w-4 h-4" />
                    Record Type
                  </div>
                  <Badge className={getRecordTypeColor(record.recordType)}>
                    {getRecordTypeLabel(record.recordType)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    Healthcare Provider
                  </div>
                  <p className="font-medium">{record.providerId}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Created Date
                  </div>
                  <p className="font-medium">{formatDate(record.metadata.createdAt)}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    File Size
                  </div>
                  <p className="font-medium">{formatFileSize(record.metadata.fileSize)}</p>
                </div>
              </div>

              {record.metadata.description && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {record.metadata.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockchain Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Blockchain Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="w-4 h-4" />
                    Record ID
                  </div>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {record.recordId}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="w-4 h-4" />
                    IPFS Hash
                  </div>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {record.ipfsHash}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Encryption Status
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <Lock className="w-3 h-3" />
                    AES-256-GCM Encrypted
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decryption and Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {decryptionState.status === 'idle' && (
                <div className="text-center py-6">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">File is Encrypted</h3>
                  <p className="text-muted-foreground mb-4">
                    Decrypt the file to view its contents or download it.
                  </p>
                  <Button onClick={handleDecryptAndPreview}>
                    <Unlock className="w-4 h-4 mr-2" />
                    Decrypt and Preview
                  </Button>
                </div>
              )}

              {decryptionState.status === 'decrypting' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Decrypting file...</span>
                  </div>
                  <Progress value={decryptionState.progress} className="h-2" />
                </div>
              )}

              {decryptionState.status === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {decryptionState.error}
                  </AlertDescription>
                </Alert>
              )}

              {decryptionState.status === 'success' && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File decrypted successfully! You can now download or preview the content.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                    {(record.metadata.mimeType.startsWith('image/') || 
                      record.metadata.mimeType === 'application/pdf') && (
                      <Button variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    )}
                  </div>

                  {/* Preview area for supported file types */}
                  {previewUrl && (
                    <div className="border rounded-lg p-4">
                      {record.metadata.mimeType.startsWith('image/') ? (
                        <img 
                          src={previewUrl} 
                          alt={record.metadata.title}
                          className="max-w-full h-auto rounded"
                        />
                      ) : record.metadata.mimeType === 'application/pdf' ? (
                        <iframe
                          src={previewUrl}
                          className="w-full h-96 rounded"
                          title={record.metadata.title}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}