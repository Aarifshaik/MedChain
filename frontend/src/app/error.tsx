'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  RefreshCw, 
  Home,
  ArrowLeft,
  Activity
} from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page error:', error)
  }, [error])

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleGoBack = () => {
    window.history.back()
  }

  const getErrorType = () => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'chunk-load'
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'network'
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'permission'
    }
    return 'unknown'
  }

  const getErrorTitle = () => {
    const errorType = getErrorType()
    
    switch (errorType) {
      case 'chunk-load':
        return 'Loading Error'
      case 'network':
        return 'Network Error'
      case 'permission':
        return 'Access Denied'
      default:
        return 'Something went wrong'
    }
  }

  const getErrorDescription = () => {
    const errorType = getErrorType()
    
    switch (errorType) {
      case 'chunk-load':
        return 'Failed to load the required resources for this page'
      case 'network':
        return 'Unable to connect to the server'
      case 'permission':
        return 'You do not have permission to access this resource'
      default:
        return 'An unexpected error occurred'
    }
  }

  const getUserFriendlyMessage = () => {
    const errorType = getErrorType()
    
    switch (errorType) {
      case 'chunk-load':
        return "The page resources failed to load. This might be due to a network issue or the page being updated. Please refresh the page."
      case 'network':
        return "Unable to connect to the server. Please check your internet connection and try again."
      case 'permission':
        return "You don't have permission to access this resource. Please check your authentication status."
      default:
        return error.message || "An unexpected error occurred. Please try again."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
              <CardDescription>
                {getErrorDescription()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Summary */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  {getUserFriendlyMessage()}
                </p>
                <div className="flex items-center gap-2">
                  {error.digest && (
                    <Badge variant="outline" className="text-xs">
                      Error ID: {error.digest}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {new Date().toLocaleString()}
                  </Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={handleGoHome} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Help Text */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">What can you do?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {getErrorType() === 'chunk-load' ? (
                <>
                  <li>• Refresh the page to reload the resources</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• Check your internet connection</li>
                  <li>• Try accessing the page in an incognito/private window</li>
                </>
              ) : getErrorType() === 'network' ? (
                <>
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Disable any VPN or proxy connections</li>
                  <li>• Contact your network administrator if the problem persists</li>
                </>
              ) : getErrorType() === 'permission' ? (
                <>
                  <li>• Make sure you are logged in</li>
                  <li>• Check if you have the required permissions</li>
                  <li>• Contact an administrator for access</li>
                  <li>• Try logging out and logging back in</li>
                </>
              ) : (
                <>
                  <li>• Try refreshing the page</li>
                  <li>• Check your internet connection</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• If the problem persists, contact support</li>
                </>
              )}
            </ul>
          </div>

          {/* Healthcare DLT Branding */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Healthcare DLT - Secure Medical Records</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}