/**
 * Route Discovery System
 * Scans the app directory and identifies all routes with their metadata
 */

import { UserRole } from '@/types'
import fs from 'fs'
import path from 'path'

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

export interface RouteMetadata {
  filePath: string
  routePath: string
  isPage: boolean
  isLayout: boolean
  isDynamic: boolean
  dynamicSegments: string[]
  parentLayout?: string
}

/**
 * Route Discovery Service
 */
export class RouteDiscoveryService {
  private appDirectory: string
  private routes: RouteTestConfig[] = []

  constructor(appDirectory: string = 'src/app') {
    this.appDirectory = appDirectory
  }

  /**
   * Discover all routes in the application
   */
  async discoverRoutes(): Promise<RouteTestConfig[]> {
    const routeMetadata = await this.scanAppDirectory()
    this.routes = await this.generateRouteConfigs(routeMetadata)
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
   * Scan the app directory recursively to find all route files
   */
  private async scanAppDirectory(): Promise<RouteMetadata[]> {
    const metadata: RouteMetadata[] = []
    
    const scanDirectory = (dir: string, routePrefix: string = ''): void => {
      if (!fs.existsSync(dir)) {
        return
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativePath = path.relative(this.appDirectory, fullPath)
        
        if (entry.isDirectory()) {
          // Handle route groups (folders in parentheses)
          const isRouteGroup = entry.name.startsWith('(') && entry.name.endsWith(')')
          const newRoutePrefix = isRouteGroup 
            ? routePrefix 
            : path.posix.join(routePrefix, entry.name)
          
          scanDirectory(fullPath, newRoutePrefix)
        } else if (entry.isFile()) {
          const { name, ext } = path.parse(entry.name)
          
          // Only process TypeScript/JavaScript files
          if (!['.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
            continue
          }
          
          // Check if it's a page or layout file
          const isPage = name === 'page'
          const isLayout = name === 'layout'
          
          if (isPage || isLayout) {
            const routePath = this.generateRoutePath(routePrefix)
            const isDynamic = this.isDynamicRoute(routePrefix)
            const dynamicSegments = this.extractDynamicSegments(routePrefix)
            
            metadata.push({
              filePath: relativePath,
              routePath,
              isPage,
              isLayout,
              isDynamic,
              dynamicSegments
            })
          }
        }
      }
    }

    scanDirectory(path.resolve(this.appDirectory))
    return metadata
  }

  /**
   * Generate route path from directory structure
   */
  private generateRoutePath(routePrefix: string): string {
    if (!routePrefix) return '/'
    
    // Convert file system path to URL path
    const urlPath = routePrefix.split(path.sep).join('/')
    return urlPath.startsWith('/') ? urlPath : `/${urlPath}`
  }

  /**
   * Check if route has dynamic segments
   */
  private isDynamicRoute(routePrefix: string): boolean {
    return routePrefix.includes('[') && routePrefix.includes(']')
  }

  /**
   * Extract dynamic segments from route path
   */
  private extractDynamicSegments(routePrefix: string): string[] {
    const segments = routePrefix.split(path.sep)
    return segments
      .filter(segment => segment.startsWith('[') && segment.endsWith(']'))
      .map(segment => segment.slice(1, -1)) // Remove brackets
  }

  /**
   * Generate route test configurations from metadata
   */
  private async generateRouteConfigs(metadata: RouteMetadata[]): Promise<RouteTestConfig[]> {
    const configs: RouteTestConfig[] = []
    
    // Filter to only page files (not layouts)
    const pageMetadata = metadata.filter(meta => meta.isPage)
    
    for (const meta of pageMetadata) {
      const config = await this.createRouteConfig(meta)
      configs.push(config)
    }
    
    return configs
  }

  /**
   * Create route configuration for a specific route
   */
  private async createRouteConfig(meta: RouteMetadata): Promise<RouteTestConfig> {
    const authRequirements = await this.analyzeAuthRequirements(meta)
    
    return {
      path: meta.routePath,
      component: meta.filePath,
      requiresAuth: authRequirements.requiresAuth,
      allowedRoles: authRequirements.allowedRoles,
      expectedStatusCode: 200,
      testParams: this.generateTestParams(meta),
      isPublic: this.isPublicRoute(meta.routePath),
      hasLayout: true, // Assume all routes have layout
      isDynamic: meta.isDynamic,
      dynamicSegments: meta.dynamicSegments
    }
  }

  /**
   * Analyze authentication requirements by examining the route file
   */
  private async analyzeAuthRequirements(meta: RouteMetadata): Promise<{
    requiresAuth: boolean
    allowedRoles?: UserRole[]
  }> {
    try {
      const filePath = path.resolve(this.appDirectory, meta.filePath)
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Check for RouteGuard usage
      const hasRouteGuard = content.includes('RouteGuard') || content.includes('withRouteGuard')
      
      // Check for specific role requirements
      const roleMatches = content.match(/allowedRoles.*?\[(.*?)\]/)
      let allowedRoles: UserRole[] | undefined
      
      if (roleMatches && roleMatches[1]) {
        const roleString = roleMatches[1]
        allowedRoles = this.extractRolesFromString(roleString)
      }
      
      // Determine if auth is required based on route path and content
      const requiresAuth = hasRouteGuard || this.requiresAuthByPath(meta.routePath)
      
      return {
        requiresAuth,
        allowedRoles
      }
    } catch (error) {
      console.warn(`Could not analyze auth requirements for ${meta.filePath}:`, error)
      
      // Fallback: determine by route path
      return {
        requiresAuth: this.requiresAuthByPath(meta.routePath)
      }
    }
  }

  /**
   * Extract roles from string content
   */
  private extractRolesFromString(roleString: string): UserRole[] {
    const roles: UserRole[] = []
    
    // Look for UserRole enum values
    Object.values(UserRole).forEach(role => {
      if (roleString.includes(role) || roleString.includes(role.toUpperCase())) {
        roles.push(role)
      }
    })
    
    return roles
  }

  /**
   * Determine if route requires auth based on path
   */
  private requiresAuthByPath(routePath: string): boolean {
    const publicPaths = ['/auth', '/auth/login', '/auth/register', '/']
    
    // Check if it's a public path
    if (publicPaths.some(publicPath => routePath === publicPath || routePath.startsWith(publicPath + '/'))) {
      return false
    }
    
    // Most other routes require authentication
    return true
  }

  /**
   * Check if route is public
   */
  private isPublicRoute(routePath: string): boolean {
    return !this.requiresAuthByPath(routePath)
  }

  /**
   * Generate test parameters for dynamic routes
   */
  private generateTestParams(meta: RouteMetadata): Record<string, string> | undefined {
    if (!meta.isDynamic || !meta.dynamicSegments.length) {
      return undefined
    }
    
    const params: Record<string, string> = {}
    
    meta.dynamicSegments.forEach(segment => {
      // Generate appropriate test values based on parameter name
      if (segment.includes('id')) {
        params[segment] = 'test-id-123'
      } else if (segment.includes('slug')) {
        params[segment] = 'test-slug'
      } else {
        params[segment] = 'test-value'
      }
    })
    
    return params
  }
}

/**
 * Utility function to discover routes
 */
export async function discoverRoutes(appDirectory?: string): Promise<RouteTestConfig[]> {
  const service = new RouteDiscoveryService(appDirectory)
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