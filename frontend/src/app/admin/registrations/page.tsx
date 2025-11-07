"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { RegistrationApprovalDashboard } from "@/components/admin/registration-approval-dashboard"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { usePageTitle } from "@/hooks/use-page-title"
import { BlurFade } from "@/components/ui/blur-fade"
import { UserRole } from "@/types"
import { useAuth } from "@/hooks/use-auth"

export default function AdminRegistrationsPage() {
  const { user } = useAuth()
  
  // Set page title
  usePageTitle({ title: "Registration Approvals" })

  const breadcrumbItems = [
    { label: "Admin", href: "/admin" },
    { label: "Registration Approvals", current: true }
  ]

  return (
    <MainLayout 
      requireAuth={true} 
      allowedRoles={[UserRole.SYSTEM_ADMIN, UserRole.DOCTOR]}
    >
      <div className="container mx-auto py-8 px-4">
        <BlurFade delay={0.05}>
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
        </BlurFade>
        
        <BlurFade delay={0.1}>
          <RegistrationApprovalDashboard userRole={user?.role || UserRole.SYSTEM_ADMIN} />
        </BlurFade>
      </div>
    </MainLayout>
  )
}