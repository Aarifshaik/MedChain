"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/ui/blur-fade"
import { AuditTable } from "./audit-table"
import { AuditFilters } from "./audit-filters"
import { AuditExport } from "./audit-export"
import { AuditDetailDialog } from "./audit-detail-dialog"
import { AuditEntry, AuditEventType } from "@/types"
import { Activity, Search, Filter, Download, RefreshCw } from "lucide-react"

// Mock data for demonstration
const mockAuditEntries: AuditEntry[] = [
  {
    entryId: "audit_001",
    eventType: AuditEventType.RECORD_ACCESSED,
    userId: "dr_smith_001",
    resourceId: "record_123",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    details: {
      patientId: "patient_456",
      recordType: "lab_result",
      accessReason: "Treatment review",
      ipAddress: "192.168.1.100"
    },
    signature: "sig_abc123",
    blockNumber: 12345,
    transactionId: "tx_789xyz"
  },
  {
    entryId: "audit_002",
    eventType: AuditEventType.CONSENT_GRANTED,
    userId: "patient_456",
    resourceId: "consent_789",
    timestamp: new Date("2024-01-15T09:15:00Z"),
    details: {
      providerId: "dr_smith_001",
      permissions: ["read"],
      expirationTime: "2024-02-15T09:15:00Z",
      recordTypes: ["lab_result", "diagnosis"]
    },
    signature: "sig_def456",
    blockNumber: 12344,
    transactionId: "tx_456abc"
  },
  {
    entryId: "audit_003",
    eventType: AuditEventType.RECORD_CREATED,
    userId: "lab_tech_001",
    resourceId: "record_124",
    timestamp: new Date("2024-01-15T08:45:00Z"),
    details: {
      patientId: "patient_456",
      recordType: "lab_result",
      fileSize: 2048576,
      ipfsHash: "QmX7Y8Z9...",
      encryptionAlgorithm: "AES-256-GCM"
    },
    signature: "sig_ghi789",
    blockNumber: 12343,
    transactionId: "tx_123def"
  },
  {
    entryId: "audit_004",
    eventType: AuditEventType.USER_APPROVAL,
    userId: "admin_001",
    resourceId: "user_789",
    timestamp: new Date("2024-01-14T16:20:00Z"),
    details: {
      approvedUserId: "dr_jones_002",
      userRole: "doctor",
      approvalReason: "Medical license verified",
      licenseNumber: "MD123456"
    },
    signature: "sig_jkl012",
    blockNumber: 12342,
    transactionId: "tx_789ghi"
  },
  {
    entryId: "audit_005",
    eventType: AuditEventType.LOGIN_ATTEMPT,
    userId: "patient_456",
    timestamp: new Date("2024-01-14T14:30:00Z"),
    details: {
      success: true,
      ipAddress: "192.168.1.105",
      userAgent: "Mozilla/5.0...",
      authMethod: "PQC_signature"
    },
    signature: "sig_mno345",
    blockNumber: 12341,
    transactionId: "tx_456jkl"
  }
]

export function AuditTrailViewer() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(mockAuditEntries)
  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>(mockAuditEntries)
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [isLoading, setIsLoading] = useState(false)

  // Filter entries based on search term, event type, and date range
  useEffect(() => {
    let filtered = auditEntries

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.entryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.resourceId && entry.resourceId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Event type filter
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(entry => entry.eventType === eventTypeFilter)
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(entry => new Date(entry.timestamp) >= dateRange.from!)
    }
    if (dateRange.to) {
      filtered = filtered.filter(entry => new Date(entry.timestamp) <= dateRange.to!)
    }

    setFilteredEntries(filtered)
  }, [auditEntries, searchTerm, eventTypeFilter, dateRange])

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    // In real implementation, fetch fresh data from API
    setIsLoading(false)
  }

  const handleEntryClick = (entry: AuditEntry) => {
    setSelectedEntry(entry)
    setIsDetailDialogOpen(true)
  }

  const getEventTypeColor = (eventType: AuditEventType) => {
    switch (eventType) {
      case AuditEventType.RECORD_ACCESSED:
        return "bg-blue-500"
      case AuditEventType.RECORD_CREATED:
        return "bg-green-500"
      case AuditEventType.CONSENT_GRANTED:
        return "bg-purple-500"
      case AuditEventType.CONSENT_REVOKED:
        return "bg-red-500"
      case AuditEventType.USER_REGISTRATION:
        return "bg-yellow-500"
      case AuditEventType.USER_APPROVAL:
        return "bg-indigo-500"
      case AuditEventType.LOGIN_ATTEMPT:
        return "bg-gray-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="space-y-6">
      <BlurFade delay={0.1}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="w-8 h-8" />
              Audit Trail
            </h1>
            <p className="text-muted-foreground mt-2">
              Immutable audit log of all system activities
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
            <AuditExport entries={filteredEntries} />
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditEntries.length}</div>
              <p className="text-xs text-muted-foreground">
                All audit entries
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEntries.length}</div>
              <p className="text-xs text-muted-foreground">
                Matching current filters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <div className={`w-2 h-2 rounded-full ${getEventTypeColor(filteredEntries[0]?.eventType)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredEntries.filter(e => 
                  new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Event Types</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {new Set(filteredEntries.map(e => e.eventType)).size}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(AuditEventType).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available types
              </p>
            </CardContent>
          </Card>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <Card>
          <CardHeader>
            <CardTitle>Search and Filter</CardTitle>
            <CardDescription>
              Find specific audit entries using search and filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by user ID, entry ID, transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Event Types</SelectItem>
                  {Object.values(AuditEventType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <AuditFilters 
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </CardContent>
        </Card>
      </BlurFade>

      <BlurFade delay={0.4}>
        <AuditTable 
          entries={filteredEntries}
          onEntryClick={handleEntryClick}
          isLoading={isLoading}
        />
      </BlurFade>

      <AuditDetailDialog
        entry={selectedEntry}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  )
}