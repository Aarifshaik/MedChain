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
  Shield,
  Home,
  ArrowLeft,
  Wifi,
  WifiOff,
  Clock
} from "lucide-react"

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
  retryCount: number
  isNetworkError: boolean
  isAuthError: boolean
}

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onRetry?: () => void
  maxRetries?: number
  showDetails?: boolean
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private retryTimer: NodeJS.Timeout | null = null

  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isNetworkError: false,
      isAuthError: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    const isNetworkError = error.message.includes('network') || 
                          error.message.includes('fetch') ||
                          error.message.includes('connection') ||
                          error.name === 'NetworkError'
    
    const isAuthError = error.message.includes('authentication') ||
                       error.message.includes('login') ||
                       error.message.includes('credentials') ||
                       error.message.includes('unauthorized') ||
                       error.message.includes('token')

    return {
      hasError: true,
      error,
      errorId: `auth_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isNetworkError,
      isAuthError
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught an error:', error, errorInfo)
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }

    // Auto-retry for network errors
    if (this.state.isNetworkError && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
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
      errorId: this.state.errorId,
      isNetworkError: this.state.isNetworkError,
      isAuthError: this.state.isAuthError,
      retryCount: this.state.retryCount
    }

    // For now, just log to console
    console.error('Auth Error Report:', errorReport)
  }

  private scheduleRetry = () => {
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000) // Exponential backoff, max 10s
    
    this.retryTimer = setTimeout(() => {
      this.handleRetry()
    }, retryDelay)
  }

  private handleRetry = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: prevState.retryCount + 1,
      isNetworkError: false,
      isAuthError: false
    }))

    // Call custom retry handler
    this.props.onRetry?.()
  }

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isNetworkError: false,
      isAuthError: false
    })

    this.props.onRetry?.()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleGoBack = () => {
    window.history.back()
  }

  private handleGoToLogin = () => {
    window.location.href = '/auth/login'
  }

  private copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      isNetworkError: this.state.isNetworkError,
      isAuthError: this.state.isAuthError,
      retryCount: this.state.retryCount
    }

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
  }

  private getErrorTitle = () => {
    if (this.state.isNetworkError) {
      return "Connection Error"
    }
    if (this.state.isAuthError) {
      return "Authentication Error"
    }
    return "Application Error"
  }

  private getErrorDescription = () => {
    if (this.state.isNetworkError) {
      return "Unable to connect to the authentication service"
    }
    if (this.state.isAuthError) {
      return "There was a problem with your authentication"
    }
    return "Something went wrong with the application"
  }

  private getErrorIcon = () => {
    if (this.state.isNetworkError) {
      return <WifiOff className="w-6 h-6 text-destructive" />
    }
    if (this.state.isAuthError) {
      return <Shield className="w-6 h-6 text-destructive" />
    }
    return <AlertTriangle className="w-6 h-6 text-destructive" />
  }

  private getUserFriendlyMessage = () => {
    const error = this.state.error
    if (!error) return "An unexpected error occurred"

    // Network errors
    if (this.state.isNetworkError) {
      if (error.message.includes('timeout')) {
        return "The request timed out. Please check your internet connection and try again."
      }
      if (error.message.includes('offline')) {
        return "You appear to be offline. Please check your internet connection."
      }
      return "Unable to connect to the server. Please check your internet connection and try again."
    }

    // Authentication errors
    if (this.state.isAuthError) {
      if (error.message.includes('credentials')) {
        return "Invalid username or password. Please check your credentials and try again."
      }
      if (error.message.includes('expired')) {
        return "Your session has expired. Please log in again."
      }
      if (error.message.includes('unauthorized')) {
        return "You don't have permission to access this resource."
      }
      if (error.message.includes('keys')) {
        return "There was a problem with your cryptographic keys. Please try logging in again or contact support."
      }
      return "Authentication failed. Please try logging in again."
    }

    // Generic error
    return error.message || "An unexpected error occurred"
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const maxRetries = this.props.maxRetries || 3
      const canRetry = this.state.retryCount < maxRetries

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  {this.getErrorIcon()}
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
                        Error ID: {this.state.errorId}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {new Date().toLocaleString()}
                      </Badge>
                      {this.state.retryCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Retry {this.state.retryCount}/{maxRetries}
                        </Badge>
                      )}
                      {this.state.isNetworkError && (
                        <Badge variant="outline" className="text-xs">
                          <WifiOff className="w-3 h-3 mr-1" />
                          Network Issue
                        </Badge>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canRetry && (
                  <Button onClick={this.handleManualRetry} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                {this.state.isAuthError && (
                  <Button onClick={this.handleGoToLogin} variant="default">
                    <Shield className="w-4 h-4 mr-2" />
                    Go to Login
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

              {/* Network Status Indicator */}
              {this.state.isNetworkError && (
                <Alert>
                  <Wifi className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>Checking network connection...</span>
                      <Badge variant={navigator.onLine ? "default" : "destructive"}>
                        {navigator.onLine ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details (Collapsible) */}
              {(this.props.showDetails || process.env.NODE_ENV === 'development') && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
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

                    {/* Environment Info */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Environment:</h4>
                      <div className="text-xs space-y-1">
                        <p><strong>URL:</strong> {window.location.href}</p>
                        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                        <p><strong>Online Status:</strong> {navigator.onLine ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Help Text */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">What can you do?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {this.state.isNetworkError ? (
                    <>
                      <li>• Check your internet connection</li>
                      <li>• Try refreshing the page</li>
                      <li>• Disable any VPN or proxy connections</li>
                      <li>• Contact your network administrator if the problem persists</li>
                    </>
                  ) : this.state.isAuthError ? (
                    <>
                      <li>• Verify your username and password are correct</li>
                      <li>• Clear your browser cache and cookies</li>
                      <li>• Try logging out and logging back in</li>
                      <li>• Contact support if you've forgotten your credentials</li>
                    </>
                  ) : (
                    <>
                      <li>• Try refreshing the page or retrying the operation</li>
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

// Hook for functional components to handle authentication errors
export function useAuthErrorHandler() {
  const handleAuthError = (error: Error, context?: string) => {
    console.error(`Auth error in ${context || 'component'}:`, error)
    
    // In production, report to error service
    if (process.env.NODE_ENV === 'production') {
      // Report error to service
    }
  }

  const isNetworkError = (error: Error): boolean => {
    return error.message.includes('network') || 
           error.message.includes('fetch') ||
           error.message.includes('connection') ||
           error.name === 'NetworkError'
  }

  const isAuthError = (error: Error): boolean => {
    return error.message.includes('authentication') ||
           error.message.includes('login') ||
           error.message.includes('credentials') ||
           error.message.includes('unauthorized') ||
           error.message.includes('token')
  }

  const getUserFriendlyErrorMessage = (error: Error): string => {
    if (isNetworkError(error)) {
      if (error.message.includes('timeout')) {
        return "The request timed out. Please check your internet connection and try again."
      }
      if (error.message.includes('offline')) {
        return "You appear to be offline. Please check your internet connection."
      }
      return "Unable to connect to the server. Please check your internet connection and try again."
    }

    if (isAuthError(error)) {
      if (error.message.includes('credentials')) {
        return "Invalid username or password. Please check your credentials and try again."
      }
      if (error.message.includes('expired')) {
        return "Your session has expired. Please log in again."
      }
      if (error.message.includes('unauthorized')) {
        return "You don't have permission to access this resource."
      }
      if (error.message.includes('keys')) {
        return "There was a problem with your cryptographic keys. Please try logging in again or contact support."
      }
      return "Authentication failed. Please try logging in again."
    }

    return error.message || "An unexpected error occurred"
  }

  return { 
    handleAuthError, 
    isNetworkError, 
    isAuthError, 
    getUserFriendlyErrorMessage 
  }
}

// Higher-order component for wrapping components with auth error boundary
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  )

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}