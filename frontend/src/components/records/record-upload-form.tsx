"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, File, X, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { RecordType } from '@/types'
import { AESEncryption } from '@/lib/crypto'
import { apiClient } from '@/lib/api'

interface FileUploadState {
  file: File | null
  encryptedData: any | null
  encryptionKey: Uint8Array | null
  uploadProgress: number
  status: 'idle' | 'encrypting' | 'uploading' | 'success' | 'error'
  error?: string
}

interface RecordMetadata {
  title: string
  description: string
  recordType: RecordType
  providerId: string
}

interface RecordUploadFormProps {
  onUploadComplete?: (recordId: string) => void
  onCancel?: () => void
}

export function RecordUploadForm({ onUploadComplete, onCancel }: RecordUploadFormProps) {
  const [fileState, setFileState] = useState<FileUploadState>({
    file: null,
    encryptedData: null,
    encryptionKey: null,
    uploadProgress: 0,
    status: 'idle'
  })

  const [metadata, setMetadata] = useState<RecordMetadata>({
    title: '',
    description: '',
    recordType: RecordType.CONSULTATION_NOTE,
    providerId: '' // This would come from authenticated user context
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setFileState(prev => ({
      ...prev,
      file,
      status: 'encrypting',
      uploadProgress: 0,
      error: undefined
    }))

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)

      // Encrypt file client-side
      const encryptionResult = await AESEncryption.encryptFile(
        fileData,
        file.name,
        file.type
      )

      setFileState(prev => ({
        ...prev,
        encryptedData: encryptionResult.encryptedData,
        encryptionKey: encryptionResult.encryptionKey,
        status: 'idle',
        uploadProgress: 0
      }))

      // Auto-fill title if empty
      if (!metadata.title) {
        setMetadata(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
        }))
      }
    } catch (error) {
      setFileState(prev => ({
        ...prev,
        status: 'error',
        error: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    }
  }, [metadata.title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB limit
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  })

  const removeFile = () => {
    setFileState({
      file: null,
      encryptedData: null,
      encryptionKey: null,
      uploadProgress: 0,
      status: 'idle'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fileState.file || !fileState.encryptedData || !fileState.encryptionKey) {
      return
    }

    if (!metadata.title.trim()) {
      setFileState(prev => ({
        ...prev,
        status: 'error',
        error: 'Please provide a title for the record'
      }))
      return
    }

    setIsSubmitting(true)
    setFileState(prev => ({ ...prev, status: 'uploading', uploadProgress: 0 }))

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFileState(prev => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + 10, 90)
        }))
      }, 200)

      // Prepare upload data
      const uploadData = {
        encryptedData: AESEncryption.serializeEncryptedData(fileState.encryptedData),
        encryptionKeyHash: await crypto.subtle.digest('SHA-256', new Uint8Array(fileState.encryptionKey).buffer),
        metadata: {
          title: metadata.title,
          description: metadata.description,
          recordType: metadata.recordType,
          providerId: metadata.providerId,
          originalFilename: fileState.file.name,
          mimeType: fileState.file.type,
          fileSize: fileState.file.size,
          createdAt: new Date().toISOString()
        }
      }

      // Upload to middleware API
      const response = await apiClient.post('/records/upload', uploadData)

      clearInterval(progressInterval)

      if (response.success) {
        setFileState(prev => ({
          ...prev,
          status: 'success',
          uploadProgress: 100
        }))

        // Call completion callback after a brief delay
        setTimeout(() => {
          onUploadComplete?.((response.data as any)?.recordId)
        }, 1000)
      } else {
        throw new Error(response.error?.message || 'Upload failed')
      }
    } catch (error) {
      setFileState(prev => ({
        ...prev,
        status: 'error',
        uploadProgress: 0,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Medical Record
        </CardTitle>
        <CardDescription>
          Upload and encrypt your medical records securely on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-4">
            <Label>Medical Record File</Label>
            {!fileState.file ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to select a file
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: PDF, Images, Word, Excel, Text files (Max: 100MB)
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{fileState.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(fileState.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fileState.encryptedData && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Encrypted
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      disabled={fileState.status === 'uploading'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Encryption Progress */}
                {fileState.status === 'encrypting' && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">Encrypting file...</span>
                    </div>
                    <Progress value={undefined} className="h-2" />
                  </div>
                )}

                {/* Upload Progress */}
                {fileState.status === 'uploading' && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">Uploading to IPFS...</span>
                      <span className="text-sm text-muted-foreground">
                        {fileState.uploadProgress}%
                      </span>
                    </div>
                    <Progress value={fileState.uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Record Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Record Title *</Label>
              <Input
                id="title"
                value={metadata.title}
                onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Blood Test Results"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordType">Record Type</Label>
              <Select
                value={metadata.recordType}
                onValueChange={(value) => setMetadata(prev => ({ ...prev, recordType: value as RecordType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecordType.DIAGNOSIS}>Diagnosis</SelectItem>
                  <SelectItem value={RecordType.PRESCRIPTION}>Prescription</SelectItem>
                  <SelectItem value={RecordType.LAB_RESULT}>Lab Result</SelectItem>
                  <SelectItem value={RecordType.IMAGING}>Medical Imaging</SelectItem>
                  <SelectItem value={RecordType.CONSULTATION_NOTE}>Consultation Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of the medical record..."
              rows={3}
            />
          </div>

          {/* Error Display */}
          {fileState.status === 'error' && fileState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fileState.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {fileState.status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Record uploaded successfully! It has been encrypted and stored securely.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!fileState.file || !fileState.encryptedData || isSubmitting || fileState.status === 'success'}
            >
              {fileState.status === 'uploading' ? 'Uploading...' : 'Upload Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}