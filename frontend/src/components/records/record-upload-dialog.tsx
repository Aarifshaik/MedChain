"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { RecordUploadForm } from './record-upload-form'

interface RecordUploadDialogProps {
  onUploadComplete?: (recordId: string) => void
  trigger?: React.ReactNode
}

export function RecordUploadDialog({ onUploadComplete, trigger }: RecordUploadDialogProps) {
  const [open, setOpen] = useState(false)

  const handleUploadComplete = (recordId: string) => {
    setOpen(false)
    onUploadComplete?.(recordId)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload Record
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Medical Record</DialogTitle>
          <DialogDescription>
            Securely upload and encrypt your medical records on the blockchain
          </DialogDescription>
        </DialogHeader>
        <RecordUploadForm
          onUploadComplete={handleUploadComplete}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}