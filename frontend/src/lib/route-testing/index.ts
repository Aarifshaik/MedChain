/**
 * Route Testing Library
 * Exports all route testing functionality
 */

// Route Discovery
export * from './browser-route-discovery'
export type { RouteTestConfig } from './browser-route-discovery'

// Route Testing
export * from './nextjs-route-tester'
export type { TestResult, TestContext, RouteTestOptions } from './nextjs-route-tester'

// Report Generation
export * from './report-generator'
export type { 
  TestReport, 
  TestSummary, 
  RouteTestReport, 
  RouteIssue,
  AuthenticationReport,
  RoleAccessReport,
  PerformanceReport 
} from './report-generator'

// Test Orchestration
export * from './route-test-orchestrator'
export type { TestSuiteOptions, TestSuiteResult } from './route-test-orchestrator'

// CLI Interface
export * from './route-test-cli'
export type { CLIOptions } from './route-test-cli'

// Re-export for convenience
export { 
  BrowserRouteDiscoveryService as RouteDiscoveryService,
  discoverRoutes,
  getRouteConfig,
  filterRoutes,
  getRoutesGroupedByAuth,
  getRoutesGroupedByRole,
  validateRouteConfig
} from './browser-route-discovery'

export {
  NextJSRouteTestingService as RouteTestingService,
  testRouteWithDifferentContexts,
  createTestContexts,
  testAllRoutesWithAllContexts,
  filterResultsByStatus,
  getProblematicRoutes
} from './nextjs-route-tester'

export {
  RouteTestReportGenerator,
  formatReportAsHTML,
  formatReportAsJSON,
  formatReportAsText
} from './report-generator'

export {
  RouteTestOrchestrator,
  runQuickRouteTest,
  runComprehensiveRouteTest,
  testRoutes,
  testRoutesForRoles,
  getRouteTestingStatus
} from './route-test-orchestrator'

export {
  RouteTestCLI,
  parseCLIArgs,
  runCLI,
  examples
} from './route-test-cli'