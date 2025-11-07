"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { ComplianceReportingDashboard } from "@/components/compliance/compliance-reporting-dashboard"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { usePageTitle } from "@/hooks/use-page-title"
import { BlurFade } from "@/components/ui/blur-fade"
import { UserRole } from "@/types"

export default function CompliancePage() {
  // Set page title
  usePageTitle({ title: "Compliance Reporting" })

  const breadcrumbItems = [
    { label: "Compliance Reporting", current: true }
  ]

  return (
    <MainLayout 
      requireAuth={true} 
      allowedRoles={[UserRole.AUDITOR, UserRole.SYSTEM_ADMIN, UserRole.INSURER]}
    >
      <div className="space-y-6">
        <BlurFade delay={0.05}>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
        </BlurFade>
        
        <BlurFade delay={0.1}>
          <ComplianceReportingDashboard />
        </BlurFade>
      </div>
    </MainLayout>
  )
}