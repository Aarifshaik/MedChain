"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/ui/blur-fade"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { usePageTitle } from "@/hooks/use-page-title"
import { FileText, Upload, Eye, Download, Lock } from "lucide-react"
import { RecordUploadDialog, RecordsTable } from "@/components/records"
import { MedicalRecord, RecordType } from "@/types"

export default function RecordsPage() {
  // Set page title
  usePageTitle({ title: "Medical Records" })

  const breadcrumbItems = [
    { label: "Medical Records", current: true }
  ]

  // Mock data - in real app this would come from API
  const records: MedicalRecord[] = [
    {
      recordId: "rec_001",
      patientId: "patient_001",
      providerId: "City Lab",
      recordType: RecordType.LAB_RESULT,
      ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      encryptionKeyHash: "sha256:abc123...",
      metadata: {
        title: "Blood Test Results",
        description: "Complete blood count and metabolic panel",
        createdAt: new Date("2024-01-15T10:30:00Z"),
        fileSize: 2400000, // 2.4 MB
        mimeType: "application/pdf"
      },
      signature: "sig_001"
    },
    {
      recordId: "rec_002",
      patientId: "patient_001",
      providerId: "General Hospital",
      recordType: RecordType.IMAGING,
      ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdH",
      encryptionKeyHash: "sha256:def456...",
      metadata: {
        title: "X-Ray Chest",
        description: "Chest X-ray for routine checkup",
        createdAt: new Date("2024-01-10T14:15:00Z"),
        fileSize: 15200000, // 15.2 MB
        mimeType: "image/jpeg"
      },
      signature: "sig_002"
    },
    {
      recordId: "rec_003",
      patientId: "patient_001",
      providerId: "Dr. Smith",
      recordType: RecordType.CONSULTATION_NOTE,
      ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdI",
      encryptionKeyHash: "sha256:ghi789...",
      metadata: {
        title: "Consultation Notes",
        description: "Follow-up consultation for treatment plan",
        createdAt: new Date("2024-01-08T09:00:00Z"),
        fileSize: 800000, // 0.8 MB
        mimeType: "text/plain"
      },
      signature: "sig_003"
    }
  ]

  const handleRecordUpdate = (recordId: string) => {
    console.log('Record updated:', recordId)
    // TODO: Refresh records list
  }

  const handleRecordDelete = (recordId: string) => {
    console.log('Record deleted:', recordId)
    // TODO: Remove record from list
  }

  return (
    <MainLayout requireAuth={true}>
      <div className="space-y-6">
        <BlurFade delay={0.05}>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
        </BlurFade>
        
        <BlurFade delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
              <p className="text-muted-foreground mt-2">
                Your encrypted medical records stored on the blockchain
              </p>
            </div>
            <div className="flex gap-2">
              <RecordUploadDialog onUploadComplete={(recordId) => {
                // TODO: Refresh records list or show success message
                console.log('Record uploaded:', recordId)
              }} />
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <RecordsTable 
            records={records}
            onRecordUpdate={handleRecordUpdate}
            onRecordDelete={handleRecordDelete}
          />
        </BlurFade>
      </div>
    </MainLayout>
  )
}