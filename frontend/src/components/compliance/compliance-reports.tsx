"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Download, 
  Plus, 
  Calendar, 
  Filter,
  Eye,
  Trash2,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface ComplianceReport {
  id: string
  name: string
  type: string
  generatedAt: Date
  status: string
  size: string
}

interface ComplianceReportsProps {
  reports: ComplianceReport[]
}

export function ComplianceReports({ reports: initialReports }: ComplianceReportsProps) {
  const [reports, setReports] = useState(initialReports)
  const [filteredReports, setFilteredReports] = useState(initialReports)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

  // Filter reports based on search and type
  useEffect(() => {
    let filtered = reports

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(report => report.type === typeFilter)
    }

    setFilteredReports(filtered)
  }, [reports, searchTerm, typeFilter])

  const handleDownload = (report: ComplianceReport) => {
    // Simulate download
    toast.success(`Downloading ${report.name}`)
  }

  const handleDelete = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId))
    toast.success("Report deleted successfully")
  }

  const handleGenerateReport = async (reportData: {
    name: string
    type: string
    dateRange: { from: string; to: string }
  }) => {
    setIsGenerating(true)
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const newReport: ComplianceReport = {
      id: `report_${Date.now()}`,
      name: reportData.name,
      type: reportData.type,
      generatedAt: new Date(),
      status: "completed",
      size: "2.1 MB"
    }
    
    setReports(prev => [newReport, ...prev])
    setIsGenerating(false)
    setIsGenerateDialogOpen(false)
    toast.success("Report generated successfully")
  }

  const getReportTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'HIPAA':
        return "bg-blue-100 text-blue-800 border-blue-200"
      case 'GDPR':
        return "bg-green-100 text-green-800 border-green-200"
      case 'SOC2':
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return "default"
      case 'generating':
        return "secondary"
      case 'failed':
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Compliance Reports
              </CardTitle>
              <CardDescription>
                Generate and manage regulatory compliance reports
              </CardDescription>
            </div>
            <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Compliance Report</DialogTitle>
                  <DialogDescription>
                    Create a new compliance report for regulatory requirements
                  </DialogDescription>
                </DialogHeader>
                <GenerateReportForm 
                  onGenerate={handleGenerateReport}
                  isGenerating={isGenerating}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="HIPAA">HIPAA</SelectItem>
                <SelectItem value="GDPR">GDPR</SelectItem>
                <SelectItem value="SOC2">SOC 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No reports found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <Badge className={getReportTypeColor(report.type)}>
                          {report.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.generatedAt.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{report.size}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(report.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm">HIPAA Compliance</span>
              <Button variant="outline" size="sm">Use</Button>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm">GDPR Compliance</span>
              <Button variant="outline" size="sm">Use</Button>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm">SOC 2 Type II</span>
              <Button variant="outline" size="sm">Use</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scheduled Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                Monthly HIPAA Report
              </div>
              <div className="text-xs">Next: Feb 1, 2024</div>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                Quarterly SOC 2 Report
              </div>
              <div className="text-xs">Next: Mar 31, 2024</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Export as Excel
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GenerateReportForm({ 
  onGenerate, 
  isGenerating 
}: { 
  onGenerate: (data: any) => void
  isGenerating: boolean 
}) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    fromDate: "",
    toDate: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate({
      name: formData.name,
      type: formData.type,
      dateRange: {
        from: formData.fromDate,
        to: formData.toDate
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="report-name">Report Name</Label>
        <Input
          id="report-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., HIPAA Compliance Report - January 2024"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-type">Report Type</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HIPAA">HIPAA Compliance</SelectItem>
            <SelectItem value="GDPR">GDPR Compliance</SelectItem>
            <SelectItem value="SOC2">SOC 2 Type II</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from-date">From Date</Label>
          <Input
            id="from-date"
            type="date"
            value={formData.fromDate}
            onChange={(e) => setFormData(prev => ({ ...prev, fromDate: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-date">To Date</Label>
          <Input
            id="to-date"
            type="date"
            value={formData.toDate}
            onChange={(e) => setFormData(prev => ({ ...prev, toDate: e.target.value }))}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isGenerating}>
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </>
        )}
      </Button>
    </form>
  )
}