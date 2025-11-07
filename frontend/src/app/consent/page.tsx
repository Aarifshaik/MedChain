"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { ConsentDashboard } from "@/components/consent/consent-dashboard"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { usePageTitle } from "@/hooks/use-page-title"
import { BlurFade } from "@/components/ui/blur-fade"

export default function ConsentPage() {
  // Set page title
  usePageTitle({ title: "Consent Management" })

  const breadcrumbItems = [
    { label: "Consent Management", current: true }
  ]

  return (
    <MainLayout requireAuth={true}>
      <div className="space-y-6">
        <BlurFade delay={0.05}>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
        </BlurFade>
        
        <BlurFade delay={0.1}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Consent Management</h1>
            <p className="text-muted-foreground">
              Manage your healthcare data access permissions and monitor consent status.
            </p>
          </div>
        </BlurFade>
        
        <BlurFade delay={0.2}>
          <ConsentDashboard />
        </BlurFade>
      </div>
    </MainLayout>
  )
}