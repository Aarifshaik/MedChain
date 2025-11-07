"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth()
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const handleAuthCheck = async () => {
      try {
        setAuthError(null)
        
        if (!isLoading) {
          if (isAuthenticated) {
            router.replace('/dashboard')
          } else {
            router.replace('/auth/login')
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error)
        setAuthError(error instanceof Error ? error.message : 'Authentication verification failed')
      }
    }

    handleAuthCheck()
  }, [isAuthenticated, isLoading, router])

  const handleRetry = async () => {
    setIsRetrying(true)
    setAuthError(null)
    
    try {
      await checkAuth()
    } catch (error) {
      console.error('Retry authentication check failed:', error)
      setAuthError(error instanceof Error ? error.message : 'Authentication verification failed')
    } finally {
      setIsRetrying(false)
    }
  }

  // Show error state with retry option
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {authError}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              variant="outline"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Checking authentication...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
}