"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, X, Filter } from "lucide-react"

interface AuditFiltersProps {
  dateRange: { from?: Date; to?: Date }
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void
}

export function AuditFilters({ dateRange, onDateRangeChange }: AuditFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [fromDate, setFromDate] = useState(
    dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''
  )
  const [toDate, setToDate] = useState(
    dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''
  )

  const handleFromDateChange = (value: string) => {
    setFromDate(value)
    const date = value ? new Date(value) : undefined
    onDateRangeChange({ ...dateRange, from: date })
  }

  const handleToDateChange = (value: string) => {
    setToDate(value)
    const date = value ? new Date(value) : undefined
    onDateRangeChange({ ...dateRange, to: date })
  }

  const clearDateRange = () => {
    setFromDate('')
    setToDate('')
    onDateRangeChange({})
  }

  const setQuickRange = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    
    setFromDate(from.toISOString().split('T')[0])
    setToDate(to.toISOString().split('T')[0])
    onDateRangeChange({ from, to })
  }

  const hasActiveFilters = dateRange.from || dateRange.to

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateRange}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Range Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  max={toDate || new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  min={fromDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quick Date Ranges</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(1)}
                >
                  Last 24 Hours
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(7)}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(30)}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(90)}
                >
                  Last 90 Days
                </Button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Active filters:</span>
                  {dateRange.from && (
                    <Badge variant="secondary">
                      From: {dateRange.from.toLocaleDateString()}
                    </Badge>
                  )}
                  {dateRange.to && (
                    <Badge variant="secondary">
                      To: {dateRange.to.toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}