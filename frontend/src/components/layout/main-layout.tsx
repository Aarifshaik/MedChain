"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sidebar, SidebarContent, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Header } from "./header"
import { RouteGuard } from "@/components/auth/route-guard"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RouteErrorBoundary } from "@/components/errors/route-error-boundary"

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
  requireAuth?: boolean
  allowedRoles?: import("@/types").UserRole[]
}

export function MainLayout({ 
  children, 
  className, 
  requireAuth = true,
  allowedRoles = []
}: MainLayoutProps) {
  return (
    <RouteGuard 
      requireAuth={requireAuth} 
      allowedRoles={allowedRoles}
      fallback={<MainLayoutLoadingFallback />}
    >
      <MainLayoutContent className={className}>
        {children}
      </MainLayoutContent>
    </RouteGuard>
  )
}

interface MainLayoutContentProps {
  children: React.ReactNode
  className?: string
}

function MainLayoutContent({ children, className }: MainLayoutContentProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Show loading state during authentication verification
  if (isLoading) {
    return <MainLayoutLoadingFallback />
  }

  // Show error state if authentication failed
  if (!isAuthenticated || !user) {
    return <MainLayoutErrorFallback />
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className={cn("flex-1 p-6", className)}>
            <React.Suspense fallback={<MainContentLoadingFallback />}>
              <RouteErrorBoundary
                routePath={typeof window !== 'undefined' ? window.location.pathname : '/unknown'}
                onError={(error, errorInfo) => {
                  console.error('Route error in main layout:', error, errorInfo)
                }}
              >
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </RouteErrorBoundary>
            </React.Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

function MainLayoutLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
}

function MainLayoutErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Alert className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Authentication failed. Please refresh the page or log in again.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function MainContentLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading content...</p>
      </div>
    </div>
  )
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MainLayout Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Something went wrong loading this page. Please refresh and try again.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}