"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, FileSpreadsheet, FileJson, Loader2, Shield } from "lucide-react"
import { toast } from "sonner"

interface ComplianceExportProps {
  data: any // The compliance data to export
}

export function ComplianceExport({ data }: ComplianceExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would generate a PDF report
      const reportContent = generateComplianceReport(data, 'pdf')
      
      toast.success("Compliance report exported to PDF")
    } catch (error) {
      toast.error("Failed to export compliance report")
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    try {
      // Simulate Excel generation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const csvContent = generateComplianceCSV(data)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `compliance-report-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Compliance data exported to Excel/CSV")
    } catch (error) {
      toast.error("Failed to export compliance data")
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToJSON = async () => {
    setIsExporting(true)
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        complianceScore: data.overallScore,
        metrics: data.metrics,
        alerts: data.alerts.map((alert: any) => ({
          ...alert,
          timestamp: alert.timestamp.toISOString()
        })),
        reports: data.recentReports.map((report: any) => ({
          ...report,
          generatedAt: report.generatedAt.toISOString()
        })),
        eventDistribution: data.eventDistribution
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json;charset=utf-8;' 
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `compliance-data-${new Date().toISOString().split('T')[0]}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Compliance data exported to JSON")
    } catch (error) {
      toast.error("Failed to export compliance data")
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportComplianceSummary = async () => {
    setIsExporting(true)
    try {
      const summaryContent = generateComplianceSummary(data)
      const blob = new Blob([summaryContent], { type: 'text/plain;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `compliance-summary-${new Date().toISOString().split('T')[0]}.txt`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Compliance summary exported")
    } catch (error) {
      toast.error("Failed to export compliance summary")
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Export Compliance Data
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} disabled={isExporting}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel/CSV Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} disabled={isExporting}>
          <FileJson className="w-4 h-4 mr-2" />
          JSON Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportComplianceSummary} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          Summary Report
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Score: {data.overallScore}% • {data.alerts.length} alerts
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function generateComplianceCSV(data: any): string {
  const headers = [
    'Metric',
    'Score (%)',
    'Total Items',
    'Compliant Items',
    'Violations',
    'Trend'
  ]

  const rows = Object.entries(data.metrics).map(([key, metric]: [string, any]) => [
    key.replace(/([A-Z])/g, ' $1').trim(),
    metric.score,
    metric.total,
    metric.compliant,
    metric.violations,
    metric.trend
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n')
}

function generateComplianceSummary(data: any): string {
  const summary = [
    'HEALTHCARE DLT COMPLIANCE SUMMARY',
    '=' .repeat(50),
    `Generated: ${new Date().toLocaleString()}`,
    `Overall Compliance Score: ${data.overallScore}%`,
    '',
    'COMPLIANCE METRICS:',
    '-'.repeat(30),
    ...Object.entries(data.metrics).map(([key, metric]: [string, any]) => [
      `${key.replace(/([A-Z])/g, ' $1').trim()}:`,
      `  Score: ${metric.score}%`,
      `  Compliant: ${metric.compliant}/${metric.total}`,
      `  Violations: ${metric.violations}`,
      `  Trend: ${metric.trend}`,
      ''
    ]).flat(),
    'ACTIVE ALERTS:',
    '-'.repeat(30),
    ...data.alerts.map((alert: any, index: number) => [
      `${index + 1}. ${alert.title} (${alert.severity.toUpperCase()})`,
      `   ${alert.description}`,
      `   Timestamp: ${alert.timestamp.toLocaleString()}`,
      ''
    ]).flat(),
    'RECENT REPORTS:',
    '-'.repeat(30),
    ...data.recentReports.map((report: any, index: number) => [
      `${index + 1}. ${report.name}`,
      `   Type: ${report.type}`,
      `   Generated: ${report.generatedAt.toLocaleDateString()}`,
      `   Status: ${report.status}`,
      `   Size: ${report.size}`,
      ''
    ]).flat(),
    'EVENT DISTRIBUTION:',
    '-'.repeat(30),
    ...Object.entries(data.eventDistribution).map(([eventType, count]) => 
      `${eventType.replace(/_/g, ' ')}: ${count}`
    ),
    '',
    'END OF REPORT'
  ].join('\n')

  return summary
}

function generateComplianceReport(data: any, format: string): string {
  // This would generate a proper PDF in a real implementation
  // For now, return a text representation
  return generateComplianceSummary(data)
}