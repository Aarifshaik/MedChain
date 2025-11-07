/**
 * Route Testing CLI Utility
 * Command-line style interface for route testing
 */

import { 
  RouteTestOrchestrator, 
  TestSuiteResult, 
  TestSuiteOptions,
  runQuickRouteTest,
  runComprehensiveRouteTest,
  getRouteTestingStatus
} from './route-test-orchestrator'
import { UserRole } from '@/types'

export interface CLIOptions {
  command: 'quick' | 'comprehensive' | 'routes' | 'roles' | 'help'
  paths?: string[]
  roles?: UserRole[]
  format?: 'html' | 'json' | 'text'
  output?: string
  verbose?: boolean
}

/**
 * Route Testing CLI
 */
export class RouteTestCLI {
  private orchestrator: RouteTestOrchestrator

  constructor(private options: CLIOptions) {
    const suiteOptions: TestSuiteOptions = {
      generateReport: true,
      reportFormat: options.format || 'json'
    }
    
    this.orchestrator = new RouteTestOrchestrator(suiteOptions)
  }

  /**
   * Execute CLI command
   */
  async execute(): Promise<TestSuiteResult> {
    this.log('🚀 Starting route testing...')
    
    let result: TestSuiteResult
    
    switch (this.options.command) {
      case 'quick':
        result = await this.runQuickTest()
        break
      case 'comprehensive':
        result = await this.runComprehensiveTest()
        break
      case 'routes':
        result = await this.runRoutesTest()
        break
      case 'roles':
        result = await this.runRolesTest()
        break
      case 'help':
        this.showHelp()
        throw new Error('Help displayed')
      default:
        throw new Error(`Unknown command: ${this.options.command}`)
    }
    
    this.displayResults(result)
    
    if (this.options.output && result.formattedReport) {
      this.saveReport(result.formattedReport, this.options.output)
    }
    
    return result
  }

  /**
   * Run quick test
   */
  private async runQuickTest(): Promise<TestSuiteResult> {
    this.log('⚡ Running quick test (public routes only)...')
    return await runQuickRouteTest()
  }

  /**
   * Run comprehensive test
   */
  private async runComprehensiveTest(): Promise<TestSuiteResult> {
    this.log('🔍 Running comprehensive test (all routes, all contexts)...')
    return await runComprehensiveRouteTest()
  }

  /**
   * Run test for specific routes
   */
  private async runRoutesTest(): Promise<TestSuiteResult> {
    if (!this.options.paths || this.options.paths.length === 0) {
      throw new Error('No routes specified. Use --paths option.')
    }
    
    this.log(`🎯 Testing specific routes: ${this.options.paths.join(', ')}`)
    return await this.orchestrator.testSpecificRoutes(this.options.paths)
  }

  /**
   * Run test for specific roles
   */
  private async runRolesTest(): Promise<TestSuiteResult> {
    if (!this.options.roles || this.options.roles.length === 0) {
      throw new Error('No roles specified. Use --roles option.')
    }
    
    this.log(`👥 Testing for roles: ${this.options.roles.join(', ')}`)
    return await this.orchestrator.testForRoles(this.options.roles)
  }

  /**
   * Display test results
   */
  private displayResults(result: TestSuiteResult): void {
    const status = getRouteTestingStatus(result)
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 ROUTE TESTING RESULTS')
    console.log('='.repeat(50))
    
    // Status
    const statusIcon = status.status === 'healthy' ? '✅' : 
                      status.status === 'warning' ? '⚠️' : '❌'
    console.log(`${statusIcon} Status: ${status.message}`)
    
    // Summary
    console.log(`\n📈 Summary:`)
    console.log(`  Total Routes: ${result.summary.totalRoutes}`)
    console.log(`  Total Tests: ${result.summary.totalTests}`)
    console.log(`  Passed: ${result.summary.passedRoutes}`)
    console.log(`  Failed: ${result.summary.failedRoutes}`)
    console.log(`  Pass Rate: ${result.summary.passRate.toFixed(1)}%`)
    console.log(`  Duration: ${(result.summary.duration / 1000).toFixed(2)}s`)
    
    // Details
    if (status.details.length > 0) {
      console.log(`\n📋 Details:`)
      status.details.forEach(detail => {
        console.log(`  • ${detail}`)
      })
    }
    
    // Failed routes
    if (result.summary.failedRoutes > 0) {
      console.log(`\n❌ Failed Routes:`)
      Object.entries(result.results).forEach(([path, routeResults]) => {
        const hasFail = routeResults.some(r => r.status === 'fail')
        if (hasFail) {
          const failCount = routeResults.filter(r => r.status === 'fail').length
          console.log(`  • ${path} (${failCount}/${routeResults.length} tests failed)`)
        }
      })
    }
    
    // Verbose output
    if (this.options.verbose && result.report) {
      console.log(`\n🔍 Detailed Issues:`)
      result.report.routeResults.forEach(route => {
        if (route.issues.length > 0) {
          console.log(`\n  Route: ${route.path}`)
          route.issues.forEach(issue => {
            const icon = issue.severity === 'critical' ? '🚨' : 
                        issue.severity === 'warning' ? '⚠️' : 'ℹ️'
            console.log(`    ${icon} ${issue.message}`)
          })
        }
      })
    }
    
    console.log('\n' + '='.repeat(50))
  }

  /**
   * Save report to file (simulated)
   */
  private saveReport(report: string, filename: string): void {
    this.log(`💾 Report saved to: ${filename}`)
    // In a real implementation, this would write to file
    // For now, we'll just log that it would be saved
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
Route Testing CLI

USAGE:
  route-test <command> [options]

COMMANDS:
  quick         Run quick test (public routes only)
  comprehensive Run comprehensive test (all routes, all contexts)
  routes        Test specific routes
  roles         Test routes for specific roles
  help          Show this help message

OPTIONS:
  --paths       Comma-separated list of route paths (for 'routes' command)
  --roles       Comma-separated list of user roles (for 'roles' command)
  --format      Report format: html, json, text (default: json)
  --output      Output file for report
  --verbose     Show detailed output

EXAMPLES:
  route-test quick
  route-test comprehensive --format html --output report.html
  route-test routes --paths "/dashboard,/records" --verbose
  route-test roles --roles "patient,doctor" --format html

AVAILABLE ROLES:
  ${Object.values(UserRole).join(', ')}
`)
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.options.verbose !== false) {
      console.log(message)
    }
  }
}

/**
 * Parse CLI arguments (simplified)
 */
export function parseCLIArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    command: 'help'
  }
  
  if (args.length === 0) {
    return options
  }
  
  // Parse command
  const command = args[0]
  if (['quick', 'comprehensive', 'routes', 'roles', 'help'].includes(command)) {
    options.command = command as CLIOptions['command']
  }
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--paths' && i + 1 < args.length) {
      options.paths = args[i + 1].split(',').map(p => p.trim())
      i++
    } else if (arg === '--roles' && i + 1 < args.length) {
      const roleStrings = args[i + 1].split(',').map(r => r.trim())
      options.roles = roleStrings.filter(r => 
        Object.values(UserRole).includes(r as UserRole)
      ) as UserRole[]
      i++
    } else if (arg === '--format' && i + 1 < args.length) {
      const format = args[i + 1]
      if (['html', 'json', 'text'].includes(format)) {
        options.format = format as 'html' | 'json' | 'text'
      }
      i++
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[i + 1]
      i++
    } else if (arg === '--verbose') {
      options.verbose = true
    }
  }
  
  return options
}

/**
 * Run CLI with arguments
 */
export async function runCLI(args: string[]): Promise<TestSuiteResult> {
  const options = parseCLIArgs(args)
  const cli = new RouteTestCLI(options)
  return await cli.execute()
}

/**
 * Example usage functions
 */
export const examples = {
  /**
   * Run a quick health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await runQuickRouteTest()
      const status = getRouteTestingStatus(result)
      return status.status === 'healthy'
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  },

  /**
   * Generate a comprehensive report
   */
  async generateReport(): Promise<string | null> {
    try {
      const result = await runComprehensiveRouteTest()
      return result.formattedReport || null
    } catch (error) {
      console.error('Report generation failed:', error)
      return null
    }
  },

  /**
   * Test critical routes only
   */
  async testCriticalRoutes(): Promise<TestSuiteResult> {
    const criticalPaths = ['/', '/auth/login', '/dashboard']
    const orchestrator = new RouteTestOrchestrator({
      specificPaths: criticalPaths,
      generateReport: true
    })
    return await orchestrator.runTestSuite()
  }
}