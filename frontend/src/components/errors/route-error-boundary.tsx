"use client"

import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown, 
  Copy, 
  Home,
  ArrowLeft,
  Route,
  Bug,
  Navigation
} from "lucide-react"

interface RouteErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
  routePath: string
}

interface RouteErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  routePath?: string
  showDetails?: boolean
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      routePath: props.routePath || (typeof window !== 'undefined' ? window.location.pathname : '/unknown')
    }
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `route_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      routePath: typeof window !== 'undefined' ? window.location.pathname : '/unknown'
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Route Error Boundary caught an error:', error, errorInfo)
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // This would typically send to an error reporting service like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      routePath: this.state.routePath,
      errorId: this.state.errorId
    }

    // For now, just log to console
    console.error('Route Error Report:', errorReport)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      routePath: typeof window !== 'undefined' ? window.location.pathname : '/unknown'
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleGoBack = () => {
    window.history.back()
  }

  private handleRefreshPage = () => {
    window.location.reload()
  }

  private copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      routePath: this.state.routePath,
      timestamp: new Date().toISOString()
    }

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
  }

  private getRouteErrorType = () => {
    const error = this.state.error
    if (!error) return 'unknown'

    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'chunk-load'
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'not-found'
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'permission'
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'network'
    }
    return 'component'
  }

  private getErrorTitle = () => {
    const errorType = this.getRouteErrorType()
    
    switch (errorType) {
      case 'chunk-load':
        return 'Loading Error'
      case 'not-found':
        return 'Page Not Found'
      case 'permission':
        return 'Access Denied'
      case 'network':
        return 'Network Error'
      case 'component':
        return 'Component Error'
      default:
        return 'Route Error'
    }
  }

  private getErrorDescription = () => {
    const errorType = this.getRouteErrorType()
    
    switch (errorType) {
      case 'chunk-load':
        return 'Failed to load the required resources for this page'
      case 'not-found':
        return 'The page you are looking for could not be found'
      case 'permission':
        return 'You do not have permission to access this page'
      case 'network':
        return 'Unable to load the page due to network issues'
      case 'component':
        return 'A component on this page encountered an error'
      default:
        return 'Something went wrong while loading this page'
    }
  }

  private getUserFriendlyMessage = () => {
    const error = this.state.error
    if (!error) return "An unexpected error occurred"

    const errorType = this.getRouteErrorType()
    
    switch (errorType) {
      case 'chunk-load':
        return "The page resources failed to load. This might be due to a network issue or the page being updated. Please refresh the page."
      case 'not-found':
        return `The page "${this.state.routePath}" could not be found. It may have been moved or deleted.`
      case 'permission':
        return "You don't have permission to access this page. Please check your authentication status or contact an administrator."
      case 'network':
        return "Unable to load the page due to network connectivity issues. Please check your internet connection and try again."
      case 'component':
        return "A component on this page encountered an error. Please try refreshing the page or contact support if the problem persists."
      default:
        return error.message || "An unexpected error occurred while loading this page"
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorType = this.getRouteErrorType()

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Route className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-xl">{this.getErrorTitle()}</CardTitle>
                  <CardDescription>
                    {this.getErrorDescription()}
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
                      {this.getUserFriendlyMessage()}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Route className="w-3 h-3 mr-1" />
                        {this.state.routePath}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Error ID: {this.state.errorId}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {new Date().toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {errorType === 'chunk-load' && (
                  <Button onClick={this.handleRefreshPage} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
                )}
                
                {errorType !== 'not-found' && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <Button onClick={this.handleGoBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
                
                <Button onClick={this.copyErrorDetails} variant="ghost" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Error Details
                </Button>
              </div>

              {/* Error Details (Collapsible) */}
              {(this.props.showDetails || process.env.NODE_ENV === 'development') && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Bug className="w-4 h-4" />
                        Technical Details
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    {/* Error Stack */}
                    {this.state.error?.stack && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Error Stack:</h4>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component Stack */}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Component Stack:</h4>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {/* Route Info */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Route Information:</h4>
                      <div className="text-xs space-y-1">
                        <p><strong>Current Path:</strong> {this.state.routePath}</p>
                        <p><strong>Full URL:</strong> {window.location.href}</p>
                        <p><strong>Referrer:</strong> {document.referrer || 'Direct access'}</p>
                        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Help Text */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">What can you do?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {errorType === 'chunk-load' ? (
                    <>
                      <li>• Refresh the page to reload the resources</li>
                      <li>• Clear your browser cache and cookies</li>
                      <li>• Check your internet connection</li>
                      <li>• Try accessing the page in an incognito/private window</li>
                    </>
                  ) : errorType === 'not-found' ? (
                    <>
                      <li>• Check the URL for typos</li>
                      <li>• Use the navigation menu to find the page</li>
                      <li>• Go back to the previous page</li>
                      <li>• Contact support if you believe this page should exist</li>
                    </>
                  ) : errorType === 'permission' ? (
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
                      <li>• If the problem persists, contact support with the Error ID</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle route errors
export function useRouteErrorHandler() {
  const handleRouteError = (error: Error, context?: string) => {
    console.error(`Route error in ${context || 'component'}:`, error)
    
    // In production, report to error service
    if (process.env.NODE_ENV === 'production') {
      // Report error to service
    }
  }

  return { handleRouteError }
}

// Higher-order component for wrapping route components with error boundary
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<RouteErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <RouteErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </RouteErrorBoundary>
  )

  WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}