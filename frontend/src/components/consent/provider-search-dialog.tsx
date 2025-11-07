"use client"

import { useState, useEffect } from "react"
import { Search, User, Building, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { UserRole } from "@/types"

interface SelectedProvider {
  id: string
  name: string
  role: UserRole
  specialization?: string
  organization?: string
}

interface ProviderSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProviderSelect: (provider: SelectedProvider) => void
}

// Mock provider data - in real app this would come from API
const MOCK_PROVIDERS: SelectedProvider[] = [
  {
    id: "doctor-1",
    name: "Dr. Sarah Johnson",
    role: UserRole.DOCTOR,
    specialization: "Cardiology",
    organization: "City General Hospital"
  },
  {
    id: "doctor-2",
    name: "Dr. Michael Chen",
    role: UserRole.DOCTOR,
    specialization: "Internal Medicine",
    organization: "Metro Medical Center"
  },
  {
    id: "doctor-3",
    name: "Dr. Emily Rodriguez",
    role: UserRole.DOCTOR,
    specialization: "Pediatrics",
    organization: "Children's Hospital"
  },
  {
    id: "lab-1",
    name: "Central Diagnostics Lab",
    role: UserRole.LABORATORY,
    organization: "LabCorp Network"
  },
  {
    id: "lab-2",
    name: "Advanced Imaging Center",
    role: UserRole.LABORATORY,
    specialization: "Radiology",
    organization: "Regional Medical Group"
  },
  {
    id: "insurer-1",
    name: "HealthFirst Insurance",
    role: UserRole.INSURER,
    organization: "HealthFirst Corp"
  },
  {
    id: "insurer-2",
    name: "MediCare Plus",
    role: UserRole.INSURER,
    organization: "MediCare Plus Inc"
  }
]

export function ProviderSearchDialog({ open, onOpenChange, onProviderSelect }: ProviderSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredProviders, setFilteredProviders] = useState<SelectedProvider[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setFilteredProviders([])
      return
    }

    // Initialize with all providers
    setFilteredProviders(MOCK_PROVIDERS)
  }, [open])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProviders(MOCK_PROVIDERS)
      return
    }

    setIsLoading(true)
    
    // Simulate API search delay
    const timer = setTimeout(() => {
      const filtered = MOCK_PROVIDERS.filter(provider =>
        provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.organization?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProviders(filtered)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleProviderSelect = (provider: SelectedProvider) => {
    onProviderSelect(provider)
    onOpenChange(false)
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.DOCTOR:
        return <Stethoscope className="h-4 w-4" />
      case UserRole.LABORATORY:
        return <Building className="h-4 w-4" />
      case UserRole.INSURER:
        return <Building className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.DOCTOR:
        return "bg-blue-100 text-blue-800"
      case UserRole.LABORATORY:
        return "bg-green-100 text-green-800"
      case UserRole.INSURER:
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Healthcare Providers
          </DialogTitle>
          <DialogDescription>
            Find and select a healthcare provider to grant access to your medical records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, specialization, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              // Loading skeletons
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-4 w-64" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              // Provider results
              <div className="space-y-3">
                {filteredProviders.map((provider) => (
                  <Card 
                    key={provider.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleProviderSelect(provider)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(provider.role)}
                          <span>{provider.name}</span>
                        </div>
                        <Badge className={getRoleColor(provider.role)}>
                          {provider.role.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {provider.specialization && (
                          <span className="font-medium">{provider.specialization} • </span>
                        )}
                        {provider.organization}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              // No results
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Providers Found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchQuery 
                      ? `No providers match "${searchQuery}". Try a different search term.`
                      : "No healthcare providers are available at the moment."
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}