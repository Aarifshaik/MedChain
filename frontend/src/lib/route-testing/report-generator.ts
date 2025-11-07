/**
 * Route Testing Report System
 * Generates comprehensive reports for route testing results
 */

import { TestResult, TestContext } from './nextjs-route-tester'
import { RouteTestConfig } from './browser-route-discovery'
import { UserRole } from '@/types'

export interface TestReport {
  summary: TestSummary
  routeResults: RouteTestReport[]
  authenticationReport: AuthenticationReport
  roleAccessReport: RoleAccessReport
  performanceReport: PerformanceReport
  generatedAt: Date
  testDuration: number
}

export interface TestSummary {
  totalRoutes: number
  passedRoutes: number
  failedRoutes: number
  skippedRoutes: number
  passRate: number
  totalTests: number
  averageRenderTime: number
}

export interface RouteTestReport {
  path: string
  component: string
  status: 'pass' | 'fail' | 'skip'
  testResults: TestResult[]
  issues: RouteIssue[]
  recommendations: string[]
}

export interface RouteIssue {
  severity: 'critical' | 'warning' | 'info'
  category: 'authentication' | 'authorization' | 'rendering' | 'navigation' | 'performance'
  message: string
  affectedContexts: string[]
}

export interface AuthenticationReport {
  publicRoutesWorking: number
  protectedRoutesWorking: number
  authRedirectsWorking: number
  authenticationIssues: RouteIssue[]
}

export interface RoleAccessReport {
  roleBasedAccessWorking: Record<UserRole, number>
  unauthorizedAccessBlocked: number
  roleAccessIssues: RouteIssue[]
}

export interface PerformanceReport {
  averageRenderTime: number
  slowestRoutes: Array<{ path: string; renderTime: number }>
  fastestRoutes: Array<{ path: string; renderTime: number }>
  performanceIssues: RouteIssue[]
}

/**
 * Route Testing Report Generator
 */
export class RouteTestReportGenerator {
  /**
   * Generate comprehensive test report
   */
  generateReport(
    configs: RouteTestConfig[],
    results: Record<string, TestResult[]>,
    testStartTime: number,
    testEndTime: number
  ): TestReport {
    const testDuration = testEndTime - testStartTime
    
    return {
      summary: this.generateSummary(results),
      routeResults: this.generateRouteReports(configs, results),
      authenticationReport: this.generateAuthenticationReport(configs, results),
      roleAccessReport: this.generateRoleAccessReport(configs, results),
      performanceReport: this.generatePerformanceReport(results),
      generatedAt: new Date(),
      testDuration
    }
  }

  /**
   * Generate test summary
   */
  private generateSummary(results: Record<string, TestResult[]>): TestSummary {
    const allResults = Object.values(results).flat()
    const routePaths = Object.keys(results)
    
    const totalRoutes = routePaths.length
    const totalTests = allResults.length
    
    // Calculate route-level pass/fail (a route passes if at least one test passes)
    let passedRoutes = 0
    let failedRoutes = 0
    let skippedRoutes = 0
    
    routePaths.forEach(path => {
      const routeResults = results[path]
      const hasPass = routeResults.some(r => r.status === 'pass')
      const hasOnlySkips = routeResults.every(r => r.status === 'skip')
      
      if (hasOnlySkips) {
        skippedRoutes++
      } else if (hasPass) {
        passedRoutes++
      } else {
        failedRoutes++
      }
    })
    
    const passRate = totalRoutes > 0 ? (passedRoutes / totalRoutes) * 100 : 0
    const averageRenderTime = totalTests > 0 
      ? allResults.reduce((sum, r) => sum + r.renderTime, 0) / totalTests 
      : 0
    
    return {
      totalRoutes,
      passedRoutes,
      failedRoutes,
      skippedRoutes,
      passRate,
      totalTests,
      averageRenderTime
    }
  }

  /**
   * Generate individual route reports
   */
  private generateRouteReports(
    configs: RouteTestConfig[],
    results: Record<string, TestResult[]>
  ): RouteTestReport[] {
    return configs.map(config => {
      const routeResults = results[config.path] || []
      const issues = this.analyzeRouteIssues(config, routeResults)
      const recommendations = this.generateRecommendations(config, routeResults, issues)
      
      // Determine overall route status
      const hasPass = routeResults.some(r => r.status === 'pass')
      const hasOnlySkips = routeResults.every(r => r.status === 'skip')
      const status = hasOnlySkips ? 'skip' : (hasPass ? 'pass' : 'fail')
      
      return {
        path: config.path,
        component: config.component,
        status,
        testResults: routeResults,
        issues,
        recommendations
      }
    })
  }

  /**
   * Analyze issues for a specific route
   */
  private analyzeRouteIssues(config: RouteTestConfig, results: TestResult[]): RouteIssue[] {
    const issues: RouteIssue[] = []
    
    // Check for rendering issues
    const renderingFailures = results.filter(r => !r.testDetails.componentRendered)
    if (renderingFailures.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'rendering',
        message: `Component failed to render in ${renderingFailures.length} test(s)`,
        affectedContexts: renderingFailures.map(r => this.getContextDescription(r))
      })
    }
    
    // Check for authentication issues
    if (config.requiresAuth) {
      const authFailures = results.filter(r => !r.testDetails.authRedirectWorking)
      if (authFailures.length > 0) {
        issues.push({
          severity: 'critical',
          category: 'authentication',
          message: `Authentication redirect not working in ${authFailures.length} test(s)`,
          affectedContexts: authFailures.map(r => this.getContextDescription(r))
        })
      }
    }
    
    // Check for role access issues
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      const roleFailures = results.filter(r => !r.testDetails.roleAccessCorrect)
      if (roleFailures.length > 0) {
        issues.push({
          severity: 'critical',
          category: 'authorization',
          message: `Role-based access control not working in ${roleFailures.length} test(s)`,
          affectedContexts: roleFailures.map(r => this.getContextDescription(r))
        })
      }
    }
    
    // Check for navigation issues
    const navFailures = results.filter(r => !r.testDetails.navigationWorking)
    if (navFailures.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'navigation',
        message: `Navigation issues detected in ${navFailures.length} test(s)`,
        affectedContexts: navFailures.map(r => this.getContextDescription(r))
      })
    }
    
    // Check for performance issues
    const slowResults = results.filter(r => r.renderTime > 1000) // > 1 second
    if (slowResults.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        message: `Slow rendering detected (>${slowResults.length} tests took >1s)`,
        affectedContexts: slowResults.map(r => this.getContextDescription(r))
      })
    }
    
    return issues
  }

  /**
   * Generate recommendations for route improvements
   */
  private generateRecommendations(
    config: RouteTestConfig,
    results: TestResult[],
    issues: RouteIssue[]
  ): string[] {
    const recommendations: string[] = []
    
    // Recommendations based on issues
    issues.forEach(issue => {
      switch (issue.category) {
        case 'rendering':
          recommendations.push('Check component imports and dependencies')
          recommendations.push('Verify component props and context requirements')
          break
        case 'authentication':
          recommendations.push('Ensure RouteGuard is properly implemented')
          recommendations.push('Verify authentication context is available')
          break
        case 'authorization':
          recommendations.push('Check role-based access control configuration')
          recommendations.push('Verify user role validation logic')
          break
        case 'navigation':
          recommendations.push('Review route path configuration')
          recommendations.push('Check for dynamic route parameter handling')
          break
        case 'performance':
          recommendations.push('Consider code splitting for large components')
          recommendations.push('Optimize component rendering and data fetching')
          break
      }
    })
    
    // General recommendations
    if (config.isDynamic && !config.testParams) {
      recommendations.push('Add test parameters for dynamic route testing')
    }
    
    if (config.requiresAuth && !config.allowedRoles) {
      recommendations.push('Consider adding role-based access control')
    }
    
    // Remove duplicates
    return [...new Set(recommendations)]
  }

  /**
   * Generate authentication report
   */
  private generateAuthenticationReport(
    configs: RouteTestConfig[],
    results: Record<string, TestResult[]>
  ): AuthenticationReport {
    const publicRoutes = configs.filter(c => !c.requiresAuth)
    const protectedRoutes = configs.filter(c => c.requiresAuth)
    
    let publicRoutesWorking = 0
    let protectedRoutesWorking = 0
    let authRedirectsWorking = 0
    const authenticationIssues: RouteIssue[] = []
    
    // Check public routes
    publicRoutes.forEach(route => {
      const routeResults = results[route.path] || []
      const isWorking = routeResults.some(r => r.status === 'pass')
      if (isWorking) publicRoutesWorking++
    })
    
    // Check protected routes
    protectedRoutes.forEach(route => {
      const routeResults = results[route.path] || []
      const isWorking = routeResults.some(r => r.status === 'pass')
      const hasAuthRedirect = routeResults.some(r => r.testDetails.authRedirectWorking)
      
      if (isWorking) protectedRoutesWorking++
      if (hasAuthRedirect) authRedirectsWorking++
      
      // Check for auth issues
      const authFailures = routeResults.filter(r => !r.testDetails.authRedirectWorking)
      if (authFailures.length > 0) {
        authenticationIssues.push({
          severity: 'critical',
          category: 'authentication',
          message: `Authentication not working for route ${route.path}`,
          affectedContexts: authFailures.map(r => this.getContextDescription(r))
        })
      }
    })
    
    return {
      publicRoutesWorking,
      protectedRoutesWorking,
      authRedirectsWorking,
      authenticationIssues
    }
  }

  /**
   * Generate role access report
   */
  private generateRoleAccessReport(
    configs: RouteTestConfig[],
    results: Record<string, TestResult[]>
  ): RoleAccessReport {
    const roleBasedAccessWorking: Record<UserRole, number> = {} as Record<UserRole, number>
    let unauthorizedAccessBlocked = 0
    const roleAccessIssues: RouteIssue[] = []
    
    // Initialize role counters
    Object.values(UserRole).forEach(role => {
      roleBasedAccessWorking[role] = 0
    })
    
    // Analyze role-based routes
    configs.filter(c => c.allowedRoles && c.allowedRoles.length > 0).forEach(route => {
      const routeResults = results[route.path] || []
      
      // Check each role
      Object.values(UserRole).forEach(role => {
        const isAllowed = route.allowedRoles!.includes(role)
        const roleResults = routeResults.filter(r => this.getResultRole(r) === role)
        
        if (isAllowed) {
          const hasAccess = roleResults.some(r => r.status === 'pass')
          if (hasAccess) roleBasedAccessWorking[role]++
        } else {
          const isBlocked = roleResults.every(r => r.status === 'fail' || r.testDetails.roleAccessCorrect)
          if (isBlocked) unauthorizedAccessBlocked++
        }
      })
      
      // Check for role access issues
      const roleFailures = routeResults.filter(r => !r.testDetails.roleAccessCorrect)
      if (roleFailures.length > 0) {
        roleAccessIssues.push({
          severity: 'critical',
          category: 'authorization',
          message: `Role access control not working for route ${route.path}`,
          affectedContexts: roleFailures.map(r => this.getContextDescription(r))
        })
      }
    })
    
    return {
      roleBasedAccessWorking,
      unauthorizedAccessBlocked,
      roleAccessIssues
    }
  }

  /**
   * Generate performance report
   */
  private generatePerformanceReport(results: Record<string, TestResult[]>): PerformanceReport {
    const allResults = Object.values(results).flat()
    const averageRenderTime = allResults.length > 0 
      ? allResults.reduce((sum, r) => sum + r.renderTime, 0) / allResults.length 
      : 0
    
    // Group by route and get average render time per route
    const routePerformance: Record<string, number> = {}
    Object.entries(results).forEach(([path, routeResults]) => {
      routePerformance[path] = routeResults.length > 0
        ? routeResults.reduce((sum, r) => sum + r.renderTime, 0) / routeResults.length
        : 0
    })
    
    // Sort routes by performance
    const sortedRoutes = Object.entries(routePerformance)
      .map(([path, renderTime]) => ({ path, renderTime }))
      .sort((a, b) => b.renderTime - a.renderTime)
    
    const slowestRoutes = sortedRoutes.slice(0, 5)
    const fastestRoutes = sortedRoutes.slice(-5).reverse()
    
    // Identify performance issues
    const performanceIssues: RouteIssue[] = []
    const slowRoutes = sortedRoutes.filter(r => r.renderTime > 1000)
    
    if (slowRoutes.length > 0) {
      performanceIssues.push({
        severity: 'warning',
        category: 'performance',
        message: `${slowRoutes.length} route(s) have slow render times (>1s)`,
        affectedContexts: slowRoutes.map(r => r.path)
      })
    }
    
    return {
      averageRenderTime,
      slowestRoutes,
      fastestRoutes,
      performanceIssues
    }
  }

  /**
   * Get context description from test result
   */
  private getContextDescription(result: TestResult): string {
    // This would be enhanced to include more context information
    return `Route: ${result.path}`
  }

  /**
   * Extract role from test result (simplified)
   */
  private getResultRole(result: TestResult): UserRole | null {
    // This would be enhanced to extract actual role from test context
    return null
  }
}

/**
 * Format report as HTML
 */
export function formatReportAsHTML(report: TestReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Route Testing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .skip { color: #6c757d; }
        .critical { color: #dc3545; font-weight: bold; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .route-details { margin-bottom: 30px; }
        .issues { margin-top: 10px; }
        .recommendations { margin-top: 10px; background: #e9ecef; padding: 10px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Route Testing Report</h1>
    <p>Generated: ${report.generatedAt.toLocaleString()}</p>
    <p>Test Duration: ${(report.testDuration / 1000).toFixed(2)}s</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Routes: ${report.summary.totalRoutes}</p>
        <p>Passed: <span class="pass">${report.summary.passedRoutes}</span></p>
        <p>Failed: <span class="fail">${report.summary.failedRoutes}</span></p>
        <p>Skipped: <span class="skip">${report.summary.skippedRoutes}</span></p>
        <p>Pass Rate: ${report.summary.passRate.toFixed(1)}%</p>
        <p>Average Render Time: ${report.summary.averageRenderTime.toFixed(2)}ms</p>
    </div>
    
    <h2>Route Details</h2>
    ${report.routeResults.map(route => `
        <div class="route-details">
            <h3>${route.path} <span class="${route.status}">[${route.status.toUpperCase()}]</span></h3>
            <p>Component: ${route.component}</p>
            
            ${route.issues.length > 0 ? `
                <div class="issues">
                    <h4>Issues:</h4>
                    <ul>
                        ${route.issues.map(issue => `
                            <li class="${issue.severity}">${issue.message}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${route.recommendations.length > 0 ? `
                <div class="recommendations">
                    <h4>Recommendations:</h4>
                    <ul>
                        ${route.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `).join('')}
    
    <h2>Performance Report</h2>
    <h3>Slowest Routes</h3>
    <table>
        <tr><th>Route</th><th>Render Time (ms)</th></tr>
        ${report.performanceReport.slowestRoutes.map(route => `
            <tr><td>${route.path}</td><td>${route.renderTime.toFixed(2)}</td></tr>
        `).join('')}
    </table>
</body>
</html>
  `.trim()
}

/**
 * Format report as JSON
 */
export function formatReportAsJSON(report: TestReport): string {
  return JSON.stringify(report, null, 2)
}

/**
 * Format report as plain text
 */
export function formatReportAsText(report: TestReport): string {
  let text = `Route Testing Report\n`
  text += `Generated: ${report.generatedAt.toLocaleString()}\n`
  text += `Test Duration: ${(report.testDuration / 1000).toFixed(2)}s\n\n`
  
  text += `SUMMARY\n`
  text += `=======\n`
  text += `Total Routes: ${report.summary.totalRoutes}\n`
  text += `Passed: ${report.summary.passedRoutes}\n`
  text += `Failed: ${report.summary.failedRoutes}\n`
  text += `Skipped: ${report.summary.skippedRoutes}\n`
  text += `Pass Rate: ${report.summary.passRate.toFixed(1)}%\n`
  text += `Average Render Time: ${report.summary.averageRenderTime.toFixed(2)}ms\n\n`
  
  text += `ROUTE DETAILS\n`
  text += `=============\n`
  report.routeResults.forEach(route => {
    text += `${route.path} [${route.status.toUpperCase()}]\n`
    text += `Component: ${route.component}\n`
    
    if (route.issues.length > 0) {
      text += `Issues:\n`
      route.issues.forEach(issue => {
        text += `  - [${issue.severity.toUpperCase()}] ${issue.message}\n`
      })
    }
    
    if (route.recommendations.length > 0) {
      text += `Recommendations:\n`
      route.recommendations.forEach(rec => {
        text += `  - ${rec}\n`
      })
    }
    
    text += `\n`
  })
  
  return text
}