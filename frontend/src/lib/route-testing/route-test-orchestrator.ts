/**
 * Route Test Orchestrator
 * Coordinates route discovery, testing, and reporting
 */

import { 
  discoverRoutes, 
  RouteTestConfig, 
  filterRoutes 
} from './browser-route-discovery'
import { 
  NextJSRouteTestingService, 
  TestResult, 
  TestContext, 
  RouteTestOptions,
  createTestContexts,
  testAllRoutesWithAllContexts 
} from './nextjs-route-tester'
import { 
  RouteTestReportGenerator, 
  TestReport,
  formatReportAsHTML,
  formatReportAsJSON,
  formatReportAsText 
} from './report-generator'
import { UserRole } from '@/types'

export interface TestSuiteOptions extends RouteTestOptions {
  includePublicRoutes?: boolean
  includeProtectedRoutes?: boolean
  specificRoles?: UserRole[]
  specificPaths?: string[]
  generateReport?: boolean
  reportFormat?: 'html' | 'json' | 'text'
}

export interface TestSuiteResult {
  configs: RouteTestConfig[]
  results: Record<string, TestResult[]>
  report?: TestReport
  formattedReport?: string
  summary: {
    totalRoutes: number
    totalTests: number
    passedRoutes: number
    failedRoutes: number
    passRate: number
    duration: number
  }
}

/**
 * Route Test Orchestrator
 * Main class for coordinating route testing
 */
export class RouteTestOrchestrator {
  private reportGenerator: RouteTestReportGenerator
  private testingService: NextJSRouteTestingService

  constructor(private options: TestSuiteOptions = {}) {
    this.reportGenerator = new RouteTestReportGenerator()
    this.testingService = new NextJSRouteTestingService(options)
  }

  /**
   * Run complete route test suite
   */
  async runTestSuite(): Promise<TestSuiteResult> {
    const startTime = performance.now()
    
    try {
      // Step 1: Discover routes
      console.log('🔍 Discovering routes...')
      const allConfigs = await discoverRoutes()
      
      // Step 2: Filter routes based on options
      const configs = this.filterConfigsByOptions(allConfigs)
      console.log(`📋 Found ${configs.length} routes to test`)
      
      // Step 3: Run tests
      console.log('🧪 Running route tests...')
      const results = await this.runTests(configs)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Step 4: Generate report
      let report: TestReport | undefined
      let formattedReport: string | undefined
      
      if (this.options.generateReport !== false) {
        console.log('📊 Generating test report...')
        report = this.reportGenerator.generateReport(configs, results, startTime, endTime)
        
        if (this.options.reportFormat) {
          formattedReport = this.formatReport(report, this.options.reportFormat)
        }
      }
      
      // Step 5: Generate summary
      const summary = this.generateSummary(configs, results, duration)
      
      console.log('✅ Route testing complete!')
      console.log(`📈 Summary: ${summary.passedRoutes}/${summary.totalRoutes} routes passed (${summary.passRate.toFixed(1)}%)`)
      
      return {
        configs,
        results,
        report,
        formattedReport,
        summary
      }
      
    } catch (error) {
      console.error('❌ Route testing failed:', error)
      throw error
    }
  }

  /**
   * Run tests for specific routes
   */
  async testSpecificRoutes(paths: string[]): Promise<TestSuiteResult> {
    const originalOptions = { ...this.options }
    this.options.specificPaths = paths
    
    try {
      return await this.runTestSuite()
    } finally {
      this.options = originalOptions
    }
  }

  /**
   * Run tests for specific user roles
   */
  async testForRoles(roles: UserRole[]): Promise<TestSuiteResult> {
    const originalOptions = { ...this.options }
    this.options.specificRoles = roles
    
    try {
      return await this.runTestSuite()
    } finally {
      this.options = originalOptions
    }
  }

  /**
   * Run quick test (public routes only)
   */
  async runQuickTest(): Promise<TestSuiteResult> {
    const originalOptions = { ...this.options }
    this.options.includePublicRoutes = true
    this.options.includeProtectedRoutes = false
    this.options.skipRoleTests = true
    
    try {
      return await this.runTestSuite()
    } finally {
      this.options = originalOptions
    }
  }

  /**
   * Run comprehensive test (all routes, all contexts)
   */
  async runComprehensiveTest(): Promise<TestSuiteResult> {
    const originalOptions = { ...this.options }
    this.options.includePublicRoutes = true
    this.options.includeProtectedRoutes = true
    this.options.skipAuthTests = false
    this.options.skipRoleTests = false
    this.options.skipNavigationTests = false
    this.options.generateReport = true
    this.options.reportFormat = 'html'
    
    try {
      return await this.runTestSuite()
    } finally {
      this.options = originalOptions
    }
  }

  /**
   * Filter route configurations based on options
   */
  private filterConfigsByOptions(configs: RouteTestConfig[]): RouteTestConfig[] {
    let filtered = [...configs]
    
    // Filter by specific paths
    if (this.options.specificPaths && this.options.specificPaths.length > 0) {
      filtered = filtered.filter(config => 
        this.options.specificPaths!.includes(config.path)
      )
    }
    
    // Filter by public/protected routes
    if (this.options.includePublicRoutes === false) {
      filtered = filtered.filter(config => !config.isPublic)
    }
    
    if (this.options.includeProtectedRoutes === false) {
      filtered = filtered.filter(config => config.isPublic)
    }
    
    // Filter by specific roles
    if (this.options.specificRoles && this.options.specificRoles.length > 0) {
      filtered = filtered.filter(config => {
        if (!config.allowedRoles || config.allowedRoles.length === 0) {
          return config.isPublic // Include public routes
        }
        return config.allowedRoles.some(role => 
          this.options.specificRoles!.includes(role)
        )
      })
    }
    
    return filtered
  }

  /**
   * Run tests for filtered configurations
   */
  private async runTests(configs: RouteTestConfig[]): Promise<Record<string, TestResult[]>> {
    if (this.options.specificRoles && this.options.specificRoles.length > 0) {
      // Test with specific roles only
      const results: Record<string, TestResult[]> = {}
      const contexts = createTestContexts().filter(ctx => 
        !ctx.user || this.options.specificRoles!.includes(ctx.user.role)
      )
      
      for (const config of configs) {
        results[config.path] = []
        for (const context of contexts) {
          const result = await this.testingService.testRoute(config, context)
          results[config.path].push(result)
        }
      }
      
      return results
    } else {
      // Test with all contexts
      return await testAllRoutesWithAllContexts(configs, this.options)
    }
  }

  /**
   * Generate test summary
   */
  private generateSummary(
    configs: RouteTestConfig[], 
    results: Record<string, TestResult[]>, 
    duration: number
  ): TestSuiteResult['summary'] {
    const totalRoutes = configs.length
    const totalTests = Object.values(results).flat().length
    
    // Calculate route-level pass/fail
    let passedRoutes = 0
    Object.entries(results).forEach(([path, routeResults]) => {
      const hasPass = routeResults.some(r => r.status === 'pass')
      if (hasPass) passedRoutes++
    })
    
    const failedRoutes = totalRoutes - passedRoutes
    const passRate = totalRoutes > 0 ? (passedRoutes / totalRoutes) * 100 : 0
    
    return {
      totalRoutes,
      totalTests,
      passedRoutes,
      failedRoutes,
      passRate,
      duration
    }
  }

  /**
   * Format report based on specified format
   */
  private formatReport(report: TestReport, format: 'html' | 'json' | 'text'): string {
    switch (format) {
      case 'html':
        return formatReportAsHTML(report)
      case 'json':
        return formatReportAsJSON(report)
      case 'text':
        return formatReportAsText(report)
      default:
        return formatReportAsJSON(report)
    }
  }
}

/**
 * Convenience function to run a quick route test
 */
export async function runQuickRouteTest(): Promise<TestSuiteResult> {
  const orchestrator = new RouteTestOrchestrator({
    includePublicRoutes: true,
    includeProtectedRoutes: false,
    skipRoleTests: true,
    generateReport: false
  })
  
  return await orchestrator.runQuickTest()
}

/**
 * Convenience function to run a comprehensive route test
 */
export async function runComprehensiveRouteTest(): Promise<TestSuiteResult> {
  const orchestrator = new RouteTestOrchestrator({
    generateReport: true,
    reportFormat: 'html'
  })
  
  return await orchestrator.runComprehensiveTest()
}

/**
 * Convenience function to test specific routes
 */
export async function testRoutes(paths: string[]): Promise<TestSuiteResult> {
  const orchestrator = new RouteTestOrchestrator({
    specificPaths: paths,
    generateReport: true,
    reportFormat: 'json'
  })
  
  return await orchestrator.runTestSuite()
}

/**
 * Convenience function to test routes for specific roles
 */
export async function testRoutesForRoles(roles: UserRole[]): Promise<TestSuiteResult> {
  const orchestrator = new RouteTestOrchestrator({
    specificRoles: roles,
    generateReport: true,
    reportFormat: 'html'
  })
  
  return await orchestrator.runTestSuite()
}

/**
 * Get route testing status
 */
export function getRouteTestingStatus(result: TestSuiteResult): {
  status: 'healthy' | 'warning' | 'critical'
  message: string
  details: string[]
} {
  const { passRate, failedRoutes, totalRoutes } = result.summary
  const details: string[] = []
  
  if (passRate >= 90) {
    return {
      status: 'healthy',
      message: `Route testing is healthy (${passRate.toFixed(1)}% pass rate)`,
      details: [`${result.summary.passedRoutes}/${totalRoutes} routes passing`]
    }
  } else if (passRate >= 70) {
    details.push(`${failedRoutes} routes failing`)
    if (result.report) {
      const criticalIssues = result.report.routeResults
        .flatMap(r => r.issues)
        .filter(i => i.severity === 'critical').length
      if (criticalIssues > 0) {
        details.push(`${criticalIssues} critical issues found`)
      }
    }
    
    return {
      status: 'warning',
      message: `Route testing has warnings (${passRate.toFixed(1)}% pass rate)`,
      details
    }
  } else {
    details.push(`${failedRoutes} routes failing`)
    if (result.report) {
      const criticalIssues = result.report.routeResults
        .flatMap(r => r.issues)
        .filter(i => i.severity === 'critical').length
      details.push(`${criticalIssues} critical issues found`)
    }
    
    return {
      status: 'critical',
      message: `Route testing is critical (${passRate.toFixed(1)}% pass rate)`,
      details
    }
  }
}