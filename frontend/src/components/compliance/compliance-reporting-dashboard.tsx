"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlurFade } from "@/components/ui/blur-fade"
import { ComplianceMetrics } from "./compliance-metrics"
import { ComplianceReports } from "./compliance-reports"
import { ComplianceAlerts } from "./compliance-alerts"
import { ComplianceExport } from "./compliance-export"
import { AuditEventType } from "@/types"
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Calendar,
  Users,
  Activity,
  Download,
  RefreshCw
} from "lucide-react"

// Mock compliance data
const mockComplianceData = {
  overallScore: 94,
  lastUpdated: new Date(),
  metrics: {
    dataAccess: {
      score: 96,
      total: 1250,
      compliant: 1200,
      violations: 50,
      trend: "+2%"
    },
    consentManagement: {
      score: 98,
      total: 890,
      compliant: 872,
      violations: 18,
      trend: "+1%"
    },
    auditTrail: {
      score: 100,
      total: 2340,
      compliant: 2340,
      violations: 0,
      trend: "0%"
    },
    dataRetention: {
      score: 88,
      total: 456,
      compliant: 401,
      violations: 55,
      trend: "-3%"
    }
  },
  alerts: [
    {
      id: "alert_001",
      type: "warning",
      title: "Consent Expiration",
      description: "15 consent tokens will expire in the next 7 days",
      severity: "medium",
      timestamp: new Date("2024-01-15T10:30:00Z")
    },
    {
      id: "alert_002",
      type: "info",
      title: "Audit Report Generated",
      description: "Monthly compliance report has been generated successfully",
      severity: "low",
      timestamp: new Date("2024-01-15T09:15:00Z")
    },
    {
      id: "alert_003",
      type: "error",
      title: "Data Retention Violation",
      description: "5 records exceed maximum retention period",
      severity: "high",
      timestamp: new Date("2024-01-14T16:20:00Z")
    }
  ],
  recentReports: [
    {
      id: "report_001",
      name: "HIPAA Compliance Report - January 2024",
      type: "HIPAA",
      generatedAt: new Date("2024-01-01T00:00:00Z"),
      status: "completed",
      size: "2.4 MB"
    },
    {
      id: "report_002",
      name: "GDPR Compliance Report - December 2023",
      type: "GDPR",
      generatedAt: new Date("2023-12-01T00:00:00Z"),
      status: "completed",
      size: "1.8 MB"
    },
    {
      id: "report_003",
      name: "SOC 2 Audit Report - Q4 2023",
      type: "SOC2",
      generatedAt: new Date("2023-12-15T00:00:00Z"),
      status: "completed",
      size: "3.1 MB"
    }
  ],
  eventDistribution: {
    [AuditEventType.RECORD_ACCESSED]: 45,
    [AuditEventType.RECORD_CREATED]: 25,
    [AuditEventType.CONSENT_GRANTED]: 15,
    [AuditEventType.CONSENT_REVOKED]: 5,
    [AuditEventType.USER_REGISTRATION]: 6,
    [AuditEventType.USER_APPROVAL]: 3,
    [AuditEventType.LOGIN_ATTEMPT]: 1
  }
}

export function ComplianceReportingDashboard() {
  const [complianceData, setComplianceData] = useState(mockComplianceData)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    // In real implementation, fetch fresh compliance data from API
    setComplianceData({
      ...mockComplianceData,
      lastUpdated: new Date()
    })
    setIsLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 85) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 95) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (score >= 85) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <AlertTriangle className="w-5 h-5 text-red-600" />
  }

  return (
    <div className="space-y-6">
      <BlurFade delay={0.1}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Compliance Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Regulatory compliance monitoring and reporting
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ComplianceExport data={complianceData} />
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={`border-2 ${getScoreColor(complianceData.overallScore)}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
              {getScoreIcon(complianceData.overallScore)}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{complianceData.overallScore}%</div>
              <Progress value={complianceData.overallScore} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {complianceData.lastUpdated.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceData.alerts.length}</div>
              <div className="flex gap-1 mt-2">
                <Badge variant="destructive" className="text-xs">
                  {complianceData.alerts.filter(a => a.severity === 'high').length} High
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {complianceData.alerts.filter(a => a.severity === 'medium').length} Medium
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generated Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceData.recentReports.length}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(complianceData.eventDistribution).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Compliance Metrics
                  </CardTitle>
                  <CardDescription>
                    Key compliance indicators and scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(complianceData.metrics).map(([key, metric]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant={metric.score >= 95 ? "default" : metric.score >= 85 ? "secondary" : "destructive"}>
                            {metric.score}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {metric.trend}
                          </span>
                        </div>
                      </div>
                      <Progress value={metric.score} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {metric.compliant} of {metric.total} compliant
                        {metric.violations > 0 && (
                          <span className="text-red-600 ml-2">
                            ({metric.violations} violations)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Event Distribution
                  </CardTitle>
                  <CardDescription>
                    Audit event types breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(complianceData.eventDistribution)
                      .sort(([,a], [,b]) => b - a)
                      .map(([eventType, count]) => {
                        const total = Object.values(complianceData.eventDistribution).reduce((a, b) => a + b, 0)
                        const percentage = Math.round((count / total) * 100)
                        return (
                          <div key={eventType} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize">
                                {eventType.replace(/_/g, ' ').toLowerCase()}
                              </span>
                              <span className="font-medium">{count} ({percentage}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <ComplianceMetrics data={complianceData.metrics} />
          </TabsContent>

          <TabsContent value="reports">
            <ComplianceReports reports={complianceData.recentReports} />
          </TabsContent>

          <TabsContent value="alerts">
            <ComplianceAlerts alerts={complianceData.alerts} />
          </TabsContent>
        </Tabs>
      </BlurFade>
    </div>
  )
}