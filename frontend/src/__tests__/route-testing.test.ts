/**
 * Route Testing Framework Tests
 * Tests the route discovery, testing, and reporting functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  discoverRoutes,
  RouteTestConfig,
  NextJSRouteTestingService,
  RouteTestReportGenerator,
  RouteTestOrchestrator,
  runQuickRouteTest,
  createTestContexts,
  getRouteTestingStatus
} from '@/lib/route-testing'
import { UserRole } from '@/types'

describe('Route Testing Framework', () => {
  describe('Route Discovery', () => {
    it('should discover predefined routes', async () => {
      const routes = await discoverRoutes()
      
      expect(routes).toBeDefined()
      expect(Array.isArray(routes)).toBe(true)
      expect(routes.length).toBeGreaterThan(0)
      
      // Check for expected routes
      const routePaths = routes.map(r => r.path)
      expect(routePaths).toContain('/')
      expect(routePaths).toContain('/auth/login')
      expect(routePaths).toContain('/dashboard')
    })

    it('should correctly identify public and protected routes', async () => {
      const routes = await discoverRoutes()
      
      const publicRoutes = routes.filter(r => r.isPublic)
      const protectedRoutes = routes.filter(r => r.requiresAuth)
      
      expect(publicRoutes.length).toBeGreaterThan(0)
      expect(protectedRoutes.length).toBeGreaterThan(0)
      
      // Check specific routes
      const loginRoute = routes.find(r => r.path === '/auth/login')
      expect(loginRoute?.isPublic).toBe(true)
      expect(loginRoute?.requiresAuth).toBe(false)
      
      const dashboardRoute = routes.find(r => r.path === '/dashboard')
      expect(dashboardRoute?.requiresAuth).toBe(true)
      expect(dashboardRoute?.isPublic).toBe(false)
    })

    it('should identify role-based routes correctly', async () => {
      const routes = await discoverRoutes()
      
      const adminRoute = routes.find(r => r.path === '/admin')
      expect(adminRoute?.allowedRoles).toContain(UserRole.SYSTEM_ADMIN)
      
      const auditRoute = routes.find(r => r.path === '/audit')
      expect(auditRoute?.allowedRoles).toContain(UserRole.AUDITOR)
    })
  })

  describe('Route Testing Service', () => {
    let testingService: NextJSRouteTestingService
    let sampleRoute: RouteTestConfig

    beforeEach(() => {
      testingService = new NextJSRouteTestingService()
      sampleRoute = {
        path: '/test-route',
        component: 'test-component.tsx',
        requiresAuth: false,
        expectedStatusCode: 200,
        isPublic: true,
        hasLayout: true,
        isDynamic: false
      }
    })

    it('should test a public route successfully', async () => {
      const result = await testingService.testRoute(sampleRoute, { isAuthenticated: false })
      
      expect(result).toBeDefined()
      expect(result.path).toBe('/test-route')
      expect(result.status).toBe('pass')
      expect(result.renderTime).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should test a protected route with authentication', async () => {
      const protectedRoute: RouteTestConfig = {
        ...sampleRoute,
        path: '/protected-route',
        requiresAuth: true,
        isPublic: false
      }

      const result = await testingService.testRoute(protectedRoute, { isAuthenticated: true })
      
      expect(result.status).toBe('pass')
      expect(result.testDetails.authRedirectWorking).toBe(true)
    })

    it('should handle role-based access control', async () => {
      const roleRoute: RouteTestConfig = {
        ...sampleRoute,
        path: '/admin-route',
        requiresAuth: true,
        allowedRoles: [UserRole.SYSTEM_ADMIN],
        isPublic: false
      }

      const adminUser = {
        userId: 'admin-user',
        role: UserRole.SYSTEM_ADMIN,
        publicKeys: {
          kyberPublicKey: 'test-key',
          dilithiumPublicKey: 'test-key'
        },
        registrationStatus: 'approved' as const,
        createdAt: new Date(),
        approvedAt: new Date()
      }

      const result = await testingService.testRoute(roleRoute, { 
        isAuthenticated: true, 
        user: adminUser 
      })
      
      expect(result.status).toBe('pass')
      expect(result.testDetails.roleAccessCorrect).toBe(true)
    })
  })

  describe('Test Context Creation', () => {
    it('should create test contexts for all user roles', () => {
      const contexts = createTestContexts()
      
      expect(contexts.length).toBe(Object.values(UserRole).length + 1) // +1 for unauthenticated
      
      // Check unauthenticated context
      const unauthContext = contexts.find(c => !c.isAuthenticated)
      expect(unauthContext).toBeDefined()
      
      // Check authenticated contexts
      Object.values(UserRole).forEach(role => {
        const roleContext = contexts.find(c => c.user?.role === role)
        expect(roleContext).toBeDefined()
        expect(roleContext?.isAuthenticated).toBe(true)
      })
    })
  })

  describe('Report Generation', () => {
    it('should generate a test report', () => {
      const reportGenerator = new RouteTestReportGenerator()
      const testRoute = createSampleRoute({ path: '/test-route' })
      const configs: RouteTestConfig[] = [testRoute]
      const results = {
        '/test-route': [{
          path: '/test-route',
          status: 'pass' as const,
          statusCode: 200,
          renderTime: 100,
          errors: [],
          warnings: [],
          testDetails: {
            componentRendered: true,
            authRedirectWorking: true,
            navigationWorking: true,
            roleAccessCorrect: true
          }
        }]
      }

      const report = reportGenerator.generateReport(configs, results, 0, 1000)
      
      expect(report).toBeDefined()
      expect(report.summary.totalRoutes).toBe(1)
      expect(report.summary.passedRoutes).toBe(1)
      expect(report.summary.passRate).toBe(100)
      expect(report.routeResults).toHaveLength(1)
    })
  })

  describe('Route Test Orchestrator', () => {
    it('should run a quick test', async () => {
      const result = await runQuickRouteTest()
      
      expect(result).toBeDefined()
      expect(result.summary.totalRoutes).toBeGreaterThan(0)
      expect(result.configs).toBeDefined()
      expect(result.results).toBeDefined()
    })

    it('should provide test status', async () => {
      const result = await runQuickRouteTest()
      const status = getRouteTestingStatus(result)
      
      expect(status).toBeDefined()
      expect(['healthy', 'warning', 'critical']).toContain(status.status)
      expect(status.message).toBeDefined()
      expect(Array.isArray(status.details)).toBe(true)
    })
  })

  describe('Route Configuration Validation', () => {
    it('should validate route configurations', async () => {
      const routes = await discoverRoutes()
      
      routes.forEach(route => {
        expect(route.path).toBeDefined()
        expect(route.path).toMatch(/^\//)
        expect(route.component).toBeDefined()
        expect(typeof route.requiresAuth).toBe('boolean')
        expect(typeof route.isPublic).toBe('boolean')
        expect(typeof route.expectedStatusCode).toBe('number')
        expect(route.expectedStatusCode).toBeGreaterThanOrEqual(100)
        expect(route.expectedStatusCode).toBeLessThan(600)
      })
    })

    it('should have consistent auth and public flags', async () => {
      const routes = await discoverRoutes()
      
      routes.forEach(route => {
        // A route cannot be both public and require auth
        if (route.isPublic) {
          expect(route.requiresAuth).toBe(false)
        }
        
        // If a route has allowed roles, it should require auth
        if (route.allowedRoles && route.allowedRoles.length > 0) {
          expect(route.requiresAuth).toBe(true)
        }
      })
    })
  })
})

// Helper function to create a sample route config
function createSampleRoute(overrides: Partial<RouteTestConfig> = {}): RouteTestConfig {
  return {
    path: '/sample',
    component: 'sample.tsx',
    requiresAuth: false,
    expectedStatusCode: 200,
    isPublic: true,
    hasLayout: true,
    isDynamic: false,
    ...overrides
  }
}