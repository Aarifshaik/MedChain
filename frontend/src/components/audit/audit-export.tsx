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
import { AuditEntry } from "@/types"
import { Download, FileText, FileSpreadsheet, FileJson, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AuditExportProps {
  entries: AuditEntry[]
}

export function AuditExport({ entries }: AuditExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      const headers = [
        'Entry ID',
        'Event Type',
        'User ID',
        'Resource ID',
        'Timestamp',
        'Block Number',
        'Transaction ID',
        'Signature',
        'Details'
      ]

      const csvContent = [
        headers.join(','),
        ...entries.map(entry => [
          entry.entryId,
          entry.eventType,
          entry.userId,
          entry.resourceId || '',
          entry.timestamp.toISOString(),
          entry.blockNumber,
          entry.transactionId,
          entry.signature,
          JSON.stringify(entry.details).replace(/"/g, '""')
        ].map(field => `"${field}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${entries.length} audit entries to CSV`)
    } catch (error) {
      toast.error('Failed to export audit trail')
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
        totalEntries: entries.length,
        entries: entries.map(entry => ({
          ...entry,
          timestamp: entry.timestamp.toISOString()
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json;charset=utf-8;' 
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${entries.length} audit entries to JSON`)
    } catch (error) {
      toast.error('Failed to export audit trail')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToTXT = async () => {
    setIsExporting(true)
    try {
      const txtContent = [
        'HEALTHCARE DLT AUDIT TRAIL REPORT',
        '=' .repeat(50),
        `Generated: ${new Date().toLocaleString()}`,
        `Total Entries: ${entries.length}`,
        '',
        ...entries.map((entry, index) => [
          `Entry ${index + 1}:`,
          `-`.repeat(20),
          `Entry ID: ${entry.entryId}`,
          `Event Type: ${entry.eventType}`,
          `User ID: ${entry.userId}`,
          `Resource ID: ${entry.resourceId || 'N/A'}`,
          `Timestamp: ${entry.timestamp.toLocaleString()}`,
          `Block Number: ${entry.blockNumber}`,
          `Transaction ID: ${entry.transactionId}`,
          `Signature: ${entry.signature}`,
          `Details: ${JSON.stringify(entry.details, null, 2)}`,
          ''
        ]).flat()
      ].join('\n')

      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.txt`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${entries.length} audit entries to TXT`)
    } catch (error) {
      toast.error('Failed to export audit trail')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || entries.length === 0}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV Spreadsheet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} disabled={isExporting}>
          <FileJson className="w-4 h-4 mr-2" />
          JSON Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToTXT} disabled={isExporting}>
          <FileText className="w-4 h-4 mr-2" />
          Text Report
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {entries.length} entries selected
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}