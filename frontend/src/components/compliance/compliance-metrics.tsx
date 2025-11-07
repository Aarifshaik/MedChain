"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Shield, 
  FileText, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

interface ComplianceMetric {
  score: number
  total: number
  compliant: number
  violations: number
  trend: string
}

interface ComplianceMetricsProps {
  data: {
    dataAccess: ComplianceMetric
    consentManagement: ComplianceMetric
    auditTrail: ComplianceMetric
    dataRetention: ComplianceMetric
  }
}

export function ComplianceMetrics({ data }: ComplianceMetricsProps) {
  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (trend.startsWith('-')) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-600" />
  }

  const getTrendColor = (trend: string) => {
    if (trend.startsWith('+')) return "text-green-600"
    if (trend.startsWith('-')) return "text-red-600"
    return "text-gray-600"
  }

  const getMetricIcon = (key: string) => {
    switch (key) {
      case 'dataAccess':
        return <Shield className="w-5 h-5" />
      case 'consentManagement':
        return <Users className="w-5 h-5" />
      case 'auditTrail':
        return <FileText className="w-5 h-5" />
      case 'dataRetention':
        return <Clock className="w-5 h-5" />
      default:
        return <Shield className="w-5 h-5" />
    }
  }

  const getMetricTitle = (key: string) => {
    switch (key) {
      case 'dataAccess':
        return 'Data Access Control'
      case 'consentManagement':
        return 'Consent Management'
      case 'auditTrail':
        return 'Audit Trail Integrity'
      case 'dataRetention':
        return 'Data Retention Policy'
      default:
        return key
    }
  }

  const getMetricDescription = (key: string) => {
    switch (key) {
      case 'dataAccess':
        return 'Monitoring unauthorized access attempts and ensuring proper authentication'
      case 'consentManagement':
        return 'Tracking consent validity, expiration, and revocation compliance'
      case 'auditTrail':
        return 'Ensuring complete and immutable audit logging of all system activities'
      case 'dataRetention':
        return 'Compliance with data retention policies and automatic purging'
      default:
        return 'Compliance metric monitoring'
    }
  }

  const getScoreStatus = (score: number) => {
    if (score >= 95) return { variant: "default" as const, icon: <CheckCircle className="w-4 h-4" />, text: "Excellent" }
    if (score >= 85) return { variant: "secondary" as const, icon: <AlertTriangle className="w-4 h-4" />, text: "Good" }
    return { variant: "destructive" as const, icon: <AlertTriangle className="w-4 h-4" />, text: "Needs Attention" }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(data).map(([key, metric]) => {
          const status = getScoreStatus(metric.score)
          return (
            <Card key={key} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getMetricIcon(key)}
                  {getMetricTitle(key)}
                </CardTitle>
                <CardDescription>
                  {getMetricDescription(key)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">{metric.score}%</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        {status.icon}
                        {status.text}
                      </Badge>
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric.trend)}`}>
                        {getTrendIcon(metric.trend)}
                        {metric.trend}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {metric.compliant} / {metric.total}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Compliant
                    </div>
                  </div>
                </div>

                <Progress value={metric.score} className="h-3" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Compliant</div>
                    <div className="font-medium text-green-600">{metric.compliant}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Violations</div>
                    <div className="font-medium text-red-600">{metric.violations}</div>
                  </div>
                </div>

                {metric.violations > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">
                        {metric.violations} compliance violation{metric.violations > 1 ? 's' : ''} detected
                      </span>
                    </div>
                    <div className="text-red-600 text-xs mt-1">
                      Review and address these issues to improve compliance score
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Recommendations</CardTitle>
          <CardDescription>
            Suggested actions to improve compliance scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data)
              .filter(([, metric]) => metric.score < 95)
              .map(([key, metric]) => (
                <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{getMetricTitle(key)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {metric.violations > 0 && (
                        <span>
                          Address {metric.violations} violation{metric.violations > 1 ? 's' : ''} to improve from {metric.score}% compliance.
                        </span>
                      )}
                      {key === 'dataRetention' && metric.score < 95 && (
                        <span>
                          Review data retention policies and implement automated purging for expired records.
                        </span>
                      )}
                      {key === 'dataAccess' && metric.score < 95 && (
                        <span>
                          Strengthen access controls and review user permissions regularly.
                        </span>
                      )}
                      {key === 'consentManagement' && metric.score < 95 && (
                        <span>
                          Monitor consent expiration dates and implement automated renewal notifications.
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            
            {Object.values(data).every(metric => metric.score >= 95) && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-green-800">
                  <div className="font-medium">Excellent Compliance</div>
                  <div className="text-sm">All metrics are performing above the 95% threshold.</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}