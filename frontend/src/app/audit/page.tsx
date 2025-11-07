"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { AuditTrailViewer } from "@/components/audit/audit-trail-viewer"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { usePageTitle } from "@/hooks/use-page-title"
import { BlurFade } from "@/components/ui/blur-fade"
import { UserRole } from "@/types"

export default function AuditPage() {
  // Set page title
  usePageTitle({ title: "Audit Trail" })

  const breadcrumbItems = [
    { label: "Audit Trail", current: true }
  ]

  return (
    <MainLayout 
      requireAuth={true} 
      allowedRoles={[UserRole.AUDITOR, UserRole.SYSTEM_ADMIN]}
    >
      <div className="space-y-6">
        <BlurFade delay={0.05}>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
        </BlurFade>
        
        <BlurFade delay={0.1}>
          <AuditTrailViewer />
        </BlurFade>
      </div>
    </MainLayout>
  )
}