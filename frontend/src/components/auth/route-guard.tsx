"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@/types'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  redirectTo?: string
  fallback?: React.ReactNode
}

export function RouteGuard({
  children,
  requireAuth = true,
  allowedRoles = [],
  redirectTo = '/auth/login',
  fallback
}: RouteGuardProps) {
  const { user, isAuthenticated, isLoading, checkAuth, setIntendedUrl } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      setIsChecking(true)
      
      try {
        // If authentication is not required, allow access
        if (!requireAuth) {
          setIsChecking(false)
          return
        }

        // Check authentication status
        const isValid = await checkAuth()
        
        if (!isValid || !isAuthenticated) {
          // Store intended destination for post-login redirect
          const returnUrl = pathname !== '/' ? pathname : '/dashboard'
          setIntendedUrl(returnUrl)
          const loginUrl = `${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`
          router.replace(loginUrl)
          return
        }

        // Check role-based access if roles are specified
        if (allowedRoles.length > 0 && user) {
          const hasRequiredRole = allowedRoles.includes(user.role)
          
          if (!hasRequiredRole) {
            // Redirect to unauthorized page or dashboard based on user role
            const unauthorizedRedirect = getUnauthorizedRedirect(user.role)
            router.replace(unauthorizedRedirect)
            return
          }
        }

        setIsChecking(false)
      } catch (error) {
        console.error('Route guard authentication check failed:', error)
        // On error, redirect to login
        router.replace(redirectTo)
      }
    }

    verifyAuth()
  }, [requireAuth, allowedRoles, isAuthenticated, user, checkAuth, router, pathname, redirectTo])

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>
  }

  // If authenticated and authorized, render children
  if (isAuthenticated && user) {
    // Check role authorization one more time
    if (allowedRoles.length > 0) {
      const hasRequiredRole = allowedRoles.includes(user.role)
      if (!hasRequiredRole) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-4">
                You don't have permission to access this page.
              </p>
              <p className="text-sm text-muted-foreground">
                Required roles: {allowedRoles.join(', ')}
              </p>
              <p className="text-sm text-muted-foreground">
                Your role: {user.role}
              </p>
            </div>
          </div>
        )
      }
    }
    
    return <>{children}</>
  }

  // Fallback - should not reach here due to redirects above
  return null
}

/**
 * Get appropriate redirect URL for unauthorized users based on their role
 */
function getUnauthorizedRedirect(userRole: UserRole): string {
  switch (userRole) {
    case UserRole.PATIENT:
      return '/dashboard'
    case UserRole.DOCTOR:
      return '/dashboard'
    case UserRole.LABORATORY:
      return '/dashboard'
    case UserRole.INSURER:
      return '/dashboard'
    case UserRole.AUDITOR:
      return '/audit'
    case UserRole.SYSTEM_ADMIN:
      return '/admin'
    default:
      return '/dashboard'
  }
}

/**
 * Higher-order component for protecting routes
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardOptions?: Omit<RouteGuardProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <RouteGuard {...guardOptions}>
      <Component {...props} />
    </RouteGuard>
  )
  
  WrappedComponent.displayName = `withRouteGuard(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for checking if user has required permissions
 */
export function useRoutePermissions(allowedRoles: UserRole[] = []) {
  const { user, isAuthenticated } = useAuth()
  
  const hasPermission = React.useMemo(() => {
    if (!isAuthenticated || !user) {
      return false
    }
    
    if (allowedRoles.length === 0) {
      return true
    }
    
    return allowedRoles.includes(user.role)
  }, [user, isAuthenticated, allowedRoles])
  
  return {
    hasPermission,
    userRole: user?.role,
    isAuthenticated
  }
}