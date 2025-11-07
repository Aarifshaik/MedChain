"use client"

import { useState } from "react"
import { Calendar, Filter, Download, Eye, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConsentToken, RecordType } from "@/types"

interface ConsentHistoryTableProps {
  consents: ConsentToken[]
}

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  [RecordType.DIAGNOSIS]: "Diagnosis",
  [RecordType.PRESCRIPTION]: "Prescriptions",
  [RecordType.LAB_RESULT]: "Lab Results",
  [RecordType.IMAGING]: "Medical Imaging",
  [RecordType.CONSULTATION_NOTE]: "Consultation Notes",
}

export function ConsentHistoryTable({ consents }: ConsentHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "provider" | "status">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const getProviderName = (providerId: string) => {
    // In real app, this would come from provider data
    const providerNames: Record<string, string> = {
      'doctor-456': 'Dr. Sarah Johnson',
      'lab-789': 'Central Diagnostics Lab',
      'insurer-101': 'HealthFirst Insurance'
    }
    return providerNames[providerId] || `Provider ${providerId}`
  }

  const getConsentStatus = (consent: ConsentToken) => {
    if (consent.revokedAt) return 'revoked'
    if (consent.expirationTime && new Date(consent.expirationTime) < new Date()) return 'expired'
    if (consent.isActive) return 'active'
    return 'inactive'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'revoked':
        return <Badge variant="secondary">Revoked</Badge>
      default:
        return <Badge variant="outline">Inactive</Badge>
    }
  }

  const filteredAndSortedConsents = consents
    .filter(consent => {
      const matchesSearch = searchQuery === "" || 
        getProviderName(consent.providerId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        consent.permissions.some(p => 
          RECORD_TYPE_LABELS[p.resourceType].toLowerCase().includes(searchQuery.toLowerCase())
        )
      
      const matchesStatus = statusFilter === "all" || getConsentStatus(consent) === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'provider':
          comparison = getProviderName(a.providerId).localeCompare(getProviderName(b.providerId))
          break
        case 'status':
          comparison = getConsentStatus(a).localeCompare(getConsentStatus(b))
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleSort = (column: "date" | "provider" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const exportToCSV = () => {
    const headers = ['Provider', 'Status', 'Permissions', 'Created Date', 'Expiration Date', 'Revoked Date']
    const csvData = filteredAndSortedConsents.map(consent => [
      getProviderName(consent.providerId),
      getConsentStatus(consent),
      consent.permissions.map(p => RECORD_TYPE_LABELS[p.resourceType]).join('; '),
      new Date(consent.createdAt).toLocaleDateString(),
      consent.expirationTime ? new Date(consent.expirationTime).toLocaleDateString() : 'No expiration',
      consent.revokedAt ? new Date(consent.revokedAt).toLocaleDateString() : 'Not revoked'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consent-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Consent History</CardTitle>
            <CardDescription>
              Complete history of all consent permissions granted, revoked, and expired.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by provider name or permission type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredAndSortedConsents.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('provider')}
                  >
                    Provider
                    {sortBy === 'provider' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {sortBy === 'status' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('date')}
                  >
                    Created
                    {sortBy === 'date' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedConsents.map((consent) => (
                  <TableRow key={consent.tokenId}>
                    <TableCell className="font-medium">
                      {getProviderName(consent.providerId)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(getConsentStatus(consent))}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {consent.permissions.slice(0, 2).map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {RECORD_TYPE_LABELS[permission.resourceType]}
                          </Badge>
                        ))}
                        {consent.permissions.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{consent.permissions.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(consent.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {consent.expirationTime ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(consent.expirationTime).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiration</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            Copy Consent ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Consent History</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "No consents match your current filters."
                : "You haven't granted any consent permissions yet."
              }
            </p>
          </div>
        )}

        {/* Summary */}
        {filteredAndSortedConsents.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedConsents.length} of {consents.length} consent records
          </div>
        )}
      </CardContent>
    </Card>
  )
}