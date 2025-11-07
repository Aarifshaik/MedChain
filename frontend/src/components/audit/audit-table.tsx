"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuditEntry, AuditEventType } from "@/types"
import { ChevronLeft, ChevronRight, Eye, ExternalLink } from "lucide-react"

interface AuditTableProps {
  entries: AuditEntry[]
  onEntryClick: (entry: AuditEntry) => void
  isLoading?: boolean
}

const ITEMS_PER_PAGE = 10

export function AuditTable({ entries, onEntryClick, isLoading = false }: AuditTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentEntries = entries.slice(startIndex, endIndex)

  const getEventTypeBadge = (eventType: AuditEventType) => {
    const config = {
      [AuditEventType.RECORD_ACCESSED]: { variant: "default" as const, color: "bg-blue-500" },
      [AuditEventType.RECORD_CREATED]: { variant: "default" as const, color: "bg-green-500" },
      [AuditEventType.CONSENT_GRANTED]: { variant: "secondary" as const, color: "bg-purple-500" },
      [AuditEventType.CONSENT_REVOKED]: { variant: "destructive" as const, color: "bg-red-500" },
      [AuditEventType.USER_REGISTRATION]: { variant: "outline" as const, color: "bg-yellow-500" },
      [AuditEventType.USER_APPROVAL]: { variant: "secondary" as const, color: "bg-indigo-500" },
      [AuditEventType.LOGIN_ATTEMPT]: { variant: "outline" as const, color: "bg-gray-500" },
    }

    const { variant } = config[eventType] || { variant: "outline" as const }
    
    return (
      <Badge variant={variant} className="text-xs">
        {eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const truncateId = (id: string, length: number = 12) => {
    return id.length > length ? `${id.substring(0, length)}...` : id
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Audit Entries</span>
          <Badge variant="outline" className="text-sm">
            {entries.length} total entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Block #</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No audit entries found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                currentEntries.map((entry) => (
                  <TableRow 
                    key={entry.entryId} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onEntryClick(entry)}
                  >
                    <TableCell className="font-mono text-sm">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getEventTypeBadge(entry.eventType)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {truncateId(entry.userId)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.resourceId ? truncateId(entry.resourceId) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {truncateId(entry.transactionId)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.blockNumber.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEntryClick(entry)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, entries.length)} of {entries.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}