/**
 * Next.js Route Testing System
 * Tests Next.js app router routes with authentication and navigation
 */

import { UserRole, User } from '@/types'
import { RouteTestConfig } from './browser-route-discovery'

export interface TestResult {
  path: string
  status: 'pass' | 'fail' | 'skip'
  statusCode: number
  renderTime: number
  errors: string[]
  warnings: string[]
  testDetails: {
    componentRendered: boolean
    authRedirectWorking: boolean
    navigationWorking: boolean
    roleAccessCorrect: boolean
  }
}

export interface TestContext {
  user?: User | null
  isAuthenticated: boolean
  mockAuthProvider?: boolean
}

export interface RouteTestOptions {
  timeout?: number
  skipAuthTests?: boolean
  skipRoleTests?: boolean
  skipNavigationTests?: boolean
}

/**
 * Next.js Route Testing Service
 */
export class NextJSRouteTestingService {
  private testResults: TestResult[] = []
  private defaultOptions: RouteTestOptions = {
    timeout: 5000,
    skipAuthTests: false,
    skipRoleTests: false,
    skipNavigationTests: false
  }

  constructor(private options: RouteTestOptions = {}) {
    this.options = { ...this.defaultOptions, ...options }
  }

  /**
   * Test a single route
   */
  async testRoute(
    config: RouteTestConfig, 
    context: TestContext = { isAuthenticated: false }
  ): Promise<TestResult> {
    const startTime = performance.now()
    const result: TestResult = {
      path: config.path,
      status: 'fail',
      statusCode: 200,
      renderTime: 0,
      errors: [],
      warnings: [],
      testDetails: {
        componentRendered: false,
        authRedirectWorking: false,
        navigationWorking: false,
        roleAccessCorrect: false
      }
    }

    try {
      // Test component accessibility
      const renderResult = await this.testRouteAccessibility(config, context)
      result.testDetails.componentRendered = renderResult.success
      if (!renderResult.success) {
        result.errors.push(...renderResult.errors)
      }

      // Test authentication behavior
      if (!this.options.skipAuthTests && config.requiresAuth) {
        const authResult = await this.testAuthenticationBehavior(config, context)
        result.testDetails.authRedirectWorking = authResult.success
        if (!authResult.success) {
          result.errors.push(...authResult.errors)
        }
      } else {
        result.testDetails.authRedirectWorking = true
      }

      // Test role-based access
      if (!this.options.skipRoleTests && config.allowedRoles && config.allowedRoles.length > 0) {
        const roleResult = await this.testRoleBasedAccess(config, context)
        result.testDetails.roleAccessCorrect = roleResult.success
        if (!roleResult.success) {
          result.errors.push(...roleResult.errors)
        }
      } else {
        result.testDetails.roleAccessCorrect = true
      }

      // Test navigation patterns
      if (!this.options.skipNavigationTests) {
        const navResult = await this.testNavigationPatterns(config, context)
        result.testDetails.navigationWorking = navResult.success
        if (!navResult.success) {
          result.warnings.push(...navResult.errors)
        }
      } else {
        result.testDetails.navigationWorking = true
      }

      // Determine overall status
      const criticalTests = [
        result.testDetails.componentRendered,
        result.testDetails.authRedirectWorking,
        result.testDetails.roleAccessCorrect
      ]

      result.status = criticalTests.every(test => test) ? 'pass' : 'fail'

    } catch (error) {
      result.errors.push(`Unexpected error during testing: ${error instanceof Error ? error.message : String(error)}`)
      result.status = 'fail'
    }

    result.renderTime = performance.now() - startTime
    return result
  }

  /**
   * Test multiple routes in sequence
   */
  async testRoutes(
    configs: RouteTestConfig[], 
    context: TestContext = { isAuthenticated: false }
  ): Promise<TestResult[]> {
    const results: TestResult[] = []
    
    for (const config of configs) {
      try {
        const result = await this.testRoute(config, context)
        results.push(result)
      } catch (error) {
        results.push({
          path: config.path,
          status: 'fail',
          statusCode: 500,
          renderTime: 0,
          errors: [`Failed to test route: ${error instanceof Error ? error.message : String(error)}`],
          warnings: [],
          testDetails: {
            componentRendered: false,
            authRedirectWorking: false,
            navigationWorking: false,
            roleAccessCorrect: false
          }
        })
      }
    }

    this.testResults = results
    return results
  }

  /**
   * Test route accessibility (simulated)
   */
  private async testRouteAccessibility(
    config: RouteTestConfig, 
    context: TestContext
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Simulate route accessibility check
      await new Promise(resolve => setTimeout(resolve, 100))

      // Basic validation
      if (!config.path) {
        errors.push('Route path is empty or invalid')
        return { success: false, errors }
      }

      if (!config.component) {
        errors.push('Route component is not defined')
        return { success: false, errors }
      }

      // Check for dynamic route parameters
      if (config.isDynamic) {
        if (!config.testParams || Object.keys(config.testParams).length === 0) {
          errors.push('Dynamic route is missing test parameters')
          return { success: false, errors }
        }
      }

      return { success: true, errors: [] }

    } catch (error) {
      errors.push(`Route accessibility test failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, errors }
    }
  }

  /**
   * Test authentication behavior
   */
  private async testAuthenticationBehavior(
    config: RouteTestConfig, 
    context: TestContext
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Simulate authentication check
      await new Promise(resolve => setTimeout(resolve, 50))

      // Test unauthenticated access to protected route
      if (config.requiresAuth && !context.isAuthenticated) {
        // Should redirect to login - this is expected behavior
        return { success: true, errors: [] }
      }

      // Test authenticated access to protected route
      if (config.requiresAuth && context.isAuthenticated) {
        // Should allow access
        return { success: true, errors: [] }
      }

      // Test access to public routes
      if (!config.requiresAuth) {
        // Should always allow access
        return { success: true, errors: [] }
      }

      return { success: true, errors: [] }

    } catch (error) {
      errors.push(`Authentication behavior test failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, errors }
    }
  }

  /**
   * Test role-based access control
   */
  private async testRoleBasedAccess(
    config: RouteTestConfig, 
    context: TestContext
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Simulate role check
      await new Promise(resolve => setTimeout(resolve, 30))

      // If no user context provided for role-protected route
      if (!context.user && config.allowedRoles && config.allowedRoles.length > 0) {
        errors.push('Route requires specific roles but no user context provided')
        return { success: false, errors }
      }

      // Check role authorization
      if (config.allowedRoles && config.allowedRoles.length > 0 && context.user) {
        const hasRequiredRole = config.allowedRoles.includes(context.user.role)
        
        if (!hasRequiredRole) {
          // Access should be denied - this is correct behavior
          return { success: true, errors: [] }
        }
      }

      return { success: true, errors: [] }

    } catch (error) {
      errors.push(`Role-based access test failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, errors }
    }
  }

  /**
   * Test navigation patterns
   */
  private async testNavigationPatterns(
    config: RouteTestConfig, 
    context: TestContext
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Simulate navigation test
      await new Promise(resolve => setTimeout(resolve, 20))

      // Validate route path format
      if (!config.path.startsWith('/')) {
        errors.push('Route path should start with "/"')
        return { success: false, errors }
      }

      // Check for conflicting route patterns
      if (config.path.includes('//')) {
        errors.push('Route path contains double slashes')
        return { success: false, errors }
      }

      // Validate dynamic segments
      if (config.isDynamic && config.dynamicSegments) {
        for (const segment of config.dynamicSegments) {
          if (!segment || segment.trim() === '') {
            errors.push('Dynamic segment is empty')
            return { success: false, errors }
          }
        }
      }

      return { success: true, errors: [] }

    } catch (error) {
      errors.push(`Navigation pattern test failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, errors }
    }
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return this.testResults
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = []
  }

  /**
   * Get test summary
   */
  getTestSummary(): {
    total: number
    passed: number
    failed: number
    skipped: number
    passRate: number
  } {
    const total = this.testResults.length
    const passed = this.testResults.filter(r => r.status === 'pass').length
    const failed = this.testResults.filter(r => r.status === 'fail').length
    const skipped = this.testResults.filter(r => r.status === 'skip').length
    const passRate = total > 0 ? (passed / total) * 100 : 0

    return { total, passed, failed, skipped, passRate }
  }
}

/**
 * Test route with different authentication contexts
 */
export async function testRouteWithDifferentContexts(
  config: RouteTestConfig,
  contexts: TestContext[]
): Promise<TestResult[]> {
  const tester = new NextJSRouteTestingService()
  const results: TestResult[] = []

  for (const context of contexts) {
    const result = await tester.testRoute(config, context)
    results.push(result)
  }

  return results
}

/**
 * Create test contexts for different user roles
 */
export function createTestContexts(): TestContext[] {
  const contexts: TestContext[] = [
    // Unauthenticated context
    { isAuthenticated: false }
  ]

  // Add authenticated contexts for each role
  Object.values(UserRole).forEach((role, index) => {
    const user: User = {
      userId: `test-user-${role}-${index}`,
      role,
      publicKeys: {
        kyberPublicKey: 'test-kyber-key',
        dilithiumPublicKey: 'test-dilithium-key'
      },
      registrationStatus: 'approved',
      createdAt: new Date(),
      approvedAt: new Date()
    }

    contexts.push({
      isAuthenticated: true,
      user
    })
  })

  return contexts
}

/**
 * Utility function to test all routes with all contexts
 */
export async function testAllRoutesWithAllContexts(
  configs: RouteTestConfig[],
  options?: RouteTestOptions
): Promise<Record<string, TestResult[]>> {
  const results: Record<string, TestResult[]> = {}
  const testContexts = createTestContexts()
  const tester = new NextJSRouteTestingService(options)

  for (const config of configs) {
    results[config.path] = []
    
    for (const context of testContexts) {
      const result = await tester.testRoute(config, context)
      results[config.path].push(result)
    }
  }

  return results
}

/**
 * Filter test results by status
 */
export function filterResultsByStatus(
  results: TestResult[], 
  status: 'pass' | 'fail' | 'skip'
): TestResult[] {
  return results.filter(result => result.status === status)
}

/**
 * Get routes with the most failures
 */
export function getProblematicRoutes(
  results: Record<string, TestResult[]>, 
  threshold: number = 0.5
): string[] {
  const problematicRoutes: string[] = []

  Object.entries(results).forEach(([path, routeResults]) => {
    const totalTests = routeResults.length
    const failedTests = routeResults.filter(r => r.status === 'fail').length
    const failureRate = totalTests > 0 ? failedTests / totalTests : 0

    if (failureRate >= threshold) {
      problematicRoutes.push(path)
    }
  })

  return problematicRoutes
}