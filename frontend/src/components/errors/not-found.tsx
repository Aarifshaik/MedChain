"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Home,
  ArrowLeft,
  Search,
  FileQuestion,
  Navigation,
  Activity
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { useState } from "react"

interface NotFoundProps {
  path?: string
  showSearch?: boolean
  customMessage?: string
}

export function NotFound({ 
  path, 
  showSearch = true,
  customMessage 
}: NotFoundProps) {
  // Get path safely for SSR
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/unknown')
  const [searchQuery, setSearchQuery] = useState("")

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleGoBack = () => {
    window.history.back()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // In a real app, this would navigate to a search results page
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const getSuggestedRoutes = () => {
    const commonRoutes = [
      { path: '/dashboard', label: 'Dashboard', description: 'Main application dashboard' },
      { path: '/records', label: 'Medical Records', description: 'View and manage medical records' },
      { path: '/consent', label: 'Consent Management', description: 'Manage data sharing consent' },
      { path: '/audit', label: 'Audit Trail', description: 'View system audit logs' },
      { path: '/auth/login', label: 'Login', description: 'Sign in to your account' }
    ]

    // Filter out the current path and return top suggestions
    return commonRoutes.filter(route => route.path !== currentPath).slice(0, 3)
  }

  const suggestedRoutes = getSuggestedRoutes()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <BlurFade delay={0.1}>
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <FileQuestion className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl">
              <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                404 - Page Not Found
              </AnimatedShinyText>
            </CardTitle>
            <CardDescription className="text-lg">
              {customMessage || "The page you're looking for doesn't exist or has been moved"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Current Path Info */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-medium">Requested Path:</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {currentPath}
              </Badge>
            </div>

            {/* Search Box */}
            {showSearch && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Search for a page:</h4>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    placeholder="Search pages, features, or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}

            {/* Suggested Routes */}
            {suggestedRoutes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">You might be looking for:</h4>
                <div className="space-y-2">
                  {suggestedRoutes.map((route) => (
                    <Card key={route.path} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => window.location.href = route.path}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{route.label}</div>
                          <div className="text-xs text-muted-foreground">{route.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                          {route.path}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button onClick={handleGoHome} className="flex-1 sm:flex-none">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
              <Button onClick={handleGoBack} variant="outline" className="flex-1 sm:flex-none">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>

            {/* Healthcare DLT Branding */}
            <div className="pt-6 border-t">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Healthcare DLT - Secure Medical Records</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  )
}

// Simplified 404 component for minimal use cases
export function SimpleNotFound({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-6">
        {message || "The page you're looking for doesn't exist"}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => window.history.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
        <Button onClick={() => window.location.href = '/'}>
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  )
}