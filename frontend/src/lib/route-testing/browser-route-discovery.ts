/**
 * Browser-Compatible Route Discovery System
 * Discovers routes using predefined route configurations for browser environments
 */

import { UserRole } from '@/types'

export interface RouteTestConfig {
  path: string
  component: string
  requiresAuth: boolean
  allowedRoles?: UserRole[]
  expectedStatusCode: number
  testParams?: Record<string, string>
  isPublic: boolean
  hasLayout: boolean
  isDynamic: boolean
  dynamicSegments?: string[]
}

/**
 * Predefined route configurations based on the current app structure
 * This is used in browser environments where we can't scan the filesystem
 */
const PREDEFINED_ROUTES: RouteTestConfig[] = [
  // Root route
  {
    path: '/',
    component: 'app/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  },
  
  // Auth routes
  {
    path: '/auth',
    component: 'app/auth/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/auth/login',
    component: 'app/auth/login/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/auth/register',
    component: 'app/auth/register/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/auth/demo',
    component: 'app/auth/demo/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  },
  
  // Protected routes
  {
    path: '/dashboard',
    component: 'app/dashboard/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.PATIENT, UserRole.DOCTOR, UserRole.LABORATORY, UserRole.INSURER],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/records',
    component: 'app/records/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.PATIENT, UserRole.DOCTOR, UserRole.LABORATORY],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/consent',
    component: 'app/consent/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.PATIENT, UserRole.DOCTOR],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/audit',
    component: 'app/audit/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.AUDITOR, UserRole.SYSTEM_ADMIN],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/compliance',
    component: 'app/compliance/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.AUDITOR, UserRole.SYSTEM_ADMIN],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/admin',
    component: 'app/admin/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.SYSTEM_ADMIN],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/admin/registrations',
    component: 'app/admin/registrations/page.tsx',
    requiresAuth: true,
    allowedRoles: [UserRole.SYSTEM_ADMIN],
    expectedStatusCode: 200,
    isPublic: false,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/demo',
    component: 'app/demo/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  },
  {
    path: '/demo/registration',
    component: 'app/demo/registration/page.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false
  }
]

/**
 * Browser-compatible Route Discovery Service
 */
export class BrowserRouteDiscoveryService {
  private routes: RouteTestConfig[] = []

  constructor() {
    this.routes = [...PREDEFINED_ROUTES]
  }

  /**
   * Discover all routes (returns predefined routes in browser environment)
   */
  async discoverRoutes(): Promise<RouteTestConfig[]> {
    return this.routes
  }

  /**
   * Get discovered routes
   */
  getRoutes(): RouteTestConfig[] {
    return this.routes
  }

  /**
   * Get routes by authentication requirement
   */
  getRoutesByAuth(requiresAuth: boolean): RouteTestConfig[] {
    return this.routes.filter(route => route.requiresAuth === requiresAuth)
  }

  /**
   * Get routes by role
   */
  getRoutesByRole(role: UserRole): RouteTestConfig[] {
    return this.routes.filter(route => 
      !route.allowedRoles || route.allowedRoles.includes(role)
    )
  }

  /**
   * Get public routes
   */
  getPublicRoutes(): RouteTestConfig[] {
    return this.routes.filter(route => route.isPublic)
  }

  /**
   * Get protected routes
   */
  getProtectedRoutes(): RouteTestConfig[] {
    return this.routes.filter(route => route.requiresAuth)
  }

  /**
   * Add custom route configuration
   */
  addRoute(route: RouteTestConfig): void {
    this.routes.push(route)
  }

  /**
   * Update existing route configuration
   */
  updateRoute(path: string, updates: Partial<RouteTestConfig>): boolean {
    const index = this.routes.findIndex(route => route.path === path)
    if (index !== -1) {
      this.routes[index] = { ...this.routes[index], ...updates }
      return true
    }
    return false
  }

  /**
   * Remove route configuration
   */
  removeRoute(path: string): boolean {
    const index = this.routes.findIndex(route => route.path === path)
    if (index !== -1) {
      this.routes.splice(index, 1)
      return true
    }
    return false
  }
}

/**
 * Utility function to discover routes (browser-compatible)
 */
export async function discoverRoutes(): Promise<RouteTestConfig[]> {
  const service = new BrowserRouteDiscoveryService()
  return await service.discoverRoutes()
}

/**
 * Get route configuration by path
 */
export function getRouteConfig(routes: RouteTestConfig[], path: string): RouteTestConfig | undefined {
  return routes.find(route => route.path === path)
}

/**
 * Filter routes by criteria
 */
export function filterRoutes(
  routes: RouteTestConfig[],
  criteria: {
    requiresAuth?: boolean
    allowedRoles?: UserRole[]
    isPublic?: boolean
    isDynamic?: boolean
  }
): RouteTestConfig[] {
  return routes.filter(route => {
    if (criteria.requiresAuth !== undefined && route.requiresAuth !== criteria.requiresAuth) {
      return false
    }
    
    if (criteria.isPublic !== undefined && route.isPublic !== criteria.isPublic) {
      return false
    }
    
    if (criteria.isDynamic !== undefined && route.isDynamic !== criteria.isDynamic) {
      return false
    }
    
    if (criteria.allowedRoles && criteria.allowedRoles.length > 0) {
      if (!route.allowedRoles || !criteria.allowedRoles.some(role => route.allowedRoles!.includes(role))) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Get routes grouped by authentication requirement
 */
export function getRoutesGroupedByAuth(routes: RouteTestConfig[]): {
  public: RouteTestConfig[]
  protected: RouteTestConfig[]
} {
  return {
    public: routes.filter(route => route.isPublic),
    protected: routes.filter(route => route.requiresAuth)
  }
}

/**
 * Get routes grouped by role
 */
export function getRoutesGroupedByRole(routes: RouteTestConfig[]): Record<UserRole, RouteTestConfig[]> {
  const grouped: Record<UserRole, RouteTestConfig[]> = {} as Record<UserRole, RouteTestConfig[]>
  
  // Initialize all roles
  Object.values(UserRole).forEach(role => {
    grouped[role] = []
  })
  
  routes.forEach(route => {
    if (route.allowedRoles && route.allowedRoles.length > 0) {
      route.allowedRoles.forEach(role => {
        grouped[role].push(route)
      })
    } else if (route.isPublic) {
      // Public routes are accessible to all roles
      Object.values(UserRole).forEach(role => {
        grouped[role].push(route)
      })
    }
  })
  
  return grouped
}

/**
 * Validate route configuration
 */
export function validateRouteConfig(route: RouteTestConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!route.path) {
    errors.push('Route path is required')
  }
  
  if (!route.component) {
    errors.push('Route component is required')
  }
  
  if (route.requiresAuth && route.isPublic) {
    errors.push('Route cannot require auth and be public at the same time')
  }
  
  if (route.allowedRoles && route.allowedRoles.length > 0 && !route.requiresAuth) {
    errors.push('Route with allowed roles must require authentication')
  }
  
  if (route.expectedStatusCode < 100 || route.expectedStatusCode >= 600) {
    errors.push('Expected status code must be a valid HTTP status code')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}