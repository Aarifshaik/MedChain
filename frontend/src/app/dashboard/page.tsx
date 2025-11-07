"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { MagicCard } from "@/components/ui/magic-card"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { usePageTitle } from "@/hooks/use-page-title"
import { Activity, FileText, Shield, Users, Upload, Eye } from "lucide-react"
import { RouteErrorBoundary } from "@/components/errors/route-error-boundary"

function DashboardContent() {
  // Set page title
  usePageTitle({ title: "Dashboard" })

  const breadcrumbItems = [
    { label: "Dashboard", current: true }
  ]

  const stats = [
    { title: "Total Records", value: "1,234", icon: FileText, change: "+12%" },
    { title: "Active Consents", value: "89", icon: Shield, change: "+5%" },
    { title: "Recent Access", value: "156", icon: Eye, change: "+23%" },
    { title: "System Users", value: "45", icon: Users, change: "+2%" },
  ]

  const recentActivity = [
    { action: "Record uploaded", user: "Dr. Smith", time: "2 minutes ago", type: "upload" },
    { action: "Consent granted", user: "John Doe", time: "5 minutes ago", type: "consent" },
    { action: "Record accessed", user: "Lab Tech", time: "10 minutes ago", type: "access" },
    { action: "User approved", user: "Admin", time: "15 minutes ago", type: "approval" },
  ]

  return (
    <MainLayout requireAuth={true}>
      <div className="space-y-6">
        <BlurFade delay={0.05}>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
        </BlurFade>
        
        <BlurFade delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                  Healthcare DLT Dashboard
                </AnimatedShinyText>
              </h1>
              <p className="text-muted-foreground mt-2">
                Quantum-resistant healthcare record management system
              </p>
            </div>
            <div className="flex gap-2">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Record
              </Button>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <MagicCard key={stat.title} className="cursor-pointer">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {stat.change}
                      </Badge>
                      {" "}from last month
                    </p>
                  </CardContent>
                </Card>
              </MagicCard>
            ))}
          </div>
        </BlurFade>

        <div className="grid gap-6 md:grid-cols-2">
          <BlurFade delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest system activities and user actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'upload' ? 'bg-blue-500' :
                        activity.type === 'consent' ? 'bg-green-500' :
                        activity.type === 'access' ? 'bg-yellow-500' :
                        'bg-purple-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          by {activity.user} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </BlurFade>

          <BlurFade delay={0.4}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Status
                </CardTitle>
                <CardDescription>
                  Post-quantum cryptography and system security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quantum Resistance</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Encryption Status</span>
                    <Badge variant="default">AES-256-GCM</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Key Algorithm</span>
                    <Badge variant="secondary">CRYSTALS-Kyber</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Signature Algorithm</span>
                    <Badge variant="secondary">CRYSTALS-Dilithium</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Network Status</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        </div>

        <BlurFade delay={0.5}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and system operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="w-6 h-6" />
                  <span>View Records</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Shield className="w-6 h-6" />
                  <span>Manage Consent</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Activity className="w-6 h-6" />
                  <span>Audit Trail</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </MainLayout>
  )
}

export default function DashboardPage() {
  return (
    <RouteErrorBoundary
      routePath="/dashboard"
      onError={(error, errorInfo) => {
        console.error('Dashboard page error:', error, errorInfo)
      }}
    >
      <DashboardContent />
    </RouteErrorBoundary>
  )
}