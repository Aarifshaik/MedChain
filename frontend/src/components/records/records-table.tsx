"use client"

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Eye,
  Download,
  Share,
  Lock,
  MoreHorizontal,
  Search,
  Filter,
  Calendar,
  User,
  FileType
} from 'lucide-react'
import { MedicalRecord, RecordType } from '@/types'
import { RecordDetailDialog } from './record-detail-dialog'
import { RecordShareDialog } from './record-share-dialog'

interface RecordsTableProps {
  records: MedicalRecord[]
  onRecordUpdate?: (recordId: string) => void
  onRecordDelete?: (recordId: string) => void
}

interface FilterState {
  search: string
  recordType: string
  provider: string
  dateRange: string
}

export function RecordsTable({ records, onRecordUpdate, onRecordDelete }: RecordsTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    recordType: 'all',
    provider: 'all',
    dateRange: 'all'
  })

  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)
  const [shareRecord, setShareRecord] = useState<MedicalRecord | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Get unique providers for filter
  const uniqueProviders = useMemo(() => {
    const providers = new Set(records.map(record => record.providerId))
    return Array.from(providers)
  }, [records])

  // Filter records based on current filters
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          record.metadata.title.toLowerCase().includes(searchLower) ||
          record.metadata.description.toLowerCase().includes(searchLower) ||
          record.recordType.toLowerCase().includes(searchLower) ||
          record.providerId.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Record type filter
      if (filters.recordType !== 'all' && record.recordType !== filters.recordType) {
        return false
      }

      // Provider filter
      if (filters.provider !== 'all' && record.providerId !== filters.provider) {
        return false
      }

      // Date range filter (simplified - could be enhanced with actual date ranges)
      if (filters.dateRange !== 'all') {
        const recordDate = new Date(record.metadata.createdAt)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (filters.dateRange) {
          case 'week':
            if (daysDiff > 7) return false
            break
          case 'month':
            if (daysDiff > 30) return false
            break
          case 'year':
            if (daysDiff > 365) return false
            break
        }
      }

      return true
    })
  }, [records, filters])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getRecordTypeColor = (type: RecordType) => {
    switch (type) {
      case RecordType.DIAGNOSIS:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case RecordType.PRESCRIPTION:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case RecordType.LAB_RESULT:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case RecordType.IMAGING:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case RecordType.CONSULTATION_NOTE:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getRecordTypeLabel = (type: RecordType) => {
    switch (type) {
      case RecordType.DIAGNOSIS:
        return 'Diagnosis'
      case RecordType.PRESCRIPTION:
        return 'Prescription'
      case RecordType.LAB_RESULT:
        return 'Lab Result'
      case RecordType.IMAGING:
        return 'Imaging'
      case RecordType.CONSULTATION_NOTE:
        return 'Consultation'
      default:
        return type
    }
  }

  const handleViewRecord = (record: MedicalRecord) => {
    setSelectedRecord(record)
    setDetailDialogOpen(true)
  }

  const handleShareRecord = (record: MedicalRecord) => {
    setShareRecord(record)
    setShareDialogOpen(true)
  }

  const handleDownloadRecord = async (record: MedicalRecord) => {
    try {
      // TODO: Implement actual download with decryption
      console.log('Downloading record:', record.recordId)
      // This would involve:
      // 1. Fetching encrypted data from IPFS
      // 2. Decrypting with user's keys
      // 3. Creating download blob
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Record Type Filter */}
            <Select
              value={filters.recordType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, recordType: value }))}
            >
              <SelectTrigger>
                <FileType className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Record Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={RecordType.DIAGNOSIS}>Diagnosis</SelectItem>
                <SelectItem value={RecordType.PRESCRIPTION}>Prescription</SelectItem>
                <SelectItem value={RecordType.LAB_RESULT}>Lab Result</SelectItem>
                <SelectItem value={RecordType.IMAGING}>Imaging</SelectItem>
                <SelectItem value={RecordType.CONSULTATION_NOTE}>Consultation</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select
              value={filters.provider}
              onValueChange={(value) => setFilters(prev => ({ ...prev, provider: value }))}
            >
              <SelectTrigger>
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {uniqueProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Medical Records ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No records found</h3>
              <p className="text-muted-foreground">
                {records.length === 0 
                  ? "You haven't uploaded any medical records yet."
                  : "No records match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.recordId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.metadata.title}</div>
                          {record.metadata.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {record.metadata.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRecordTypeColor(record.recordType)}>
                          {getRecordTypeLabel(record.recordType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.providerId}</TableCell>
                      <TableCell>{formatDate(record.metadata.createdAt)}</TableCell>
                      <TableCell>{formatFileSize(record.metadata.fileSize)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Lock className="w-3 h-3" />
                          Encrypted
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewRecord(record)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadRecord(record)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleShareRecord(record)}>
                              <Share className="mr-2 h-4 w-4" />
                              Share Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <RecordDetailDialog
        record={selectedRecord}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onRecordUpdate={onRecordUpdate}
      />

      {/* Share Dialog */}
      <RecordShareDialog
        record={shareRecord}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  )
}