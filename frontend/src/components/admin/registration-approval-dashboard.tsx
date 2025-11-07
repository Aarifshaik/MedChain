"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { AnimatedList } from "@/components/ui/animated-list"
import { 
  UserCheck, 
  UserX, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  User, 
  Stethoscope, 
  Building2, 
  Shield, 
  FileText,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  Loader2,
  Filter,
  Search
} from "lucide-react"
import { UserRole, User as UserType } from "@/types"
import { apiClient } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PendingRegistration extends UserType {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth?: string
    address?: string
    emergencyContact?: string
  }
  professionalInfo?: {
    licenseNumber?: string
    specialization?: string
    institution?: string
    department?: string
    credentials?: string
    experience?: string
    references?: string
  }
  submittedAt: Date
  reviewNotes?: string
}

const roleIcons = {
  [UserRole.PATIENT]: User,
  [UserRole.DOCTOR]: Stethoscope,
  [UserRole.LABORATORY]: Building2,
  [UserRole.INSURER]: Shield,
  [UserRole.AUDITOR]: FileText,
  [UserRole.SYSTEM_ADMIN]: UserCheck
}

const roleColors = {
  [UserRole.PATIENT]: "bg-blue-500",
  [UserRole.DOCTOR]: "bg-green-500",
  [UserRole.LABORATORY]: "bg-purple-500",
  [UserRole.INSURER]: "bg-orange-500",
  [UserRole.AUDITOR]: "bg-red-500",
  [UserRole.SYSTEM_ADMIN]: "bg-gray-500"
}

interface RegistrationApprovalDashboardProps {
  userRole: UserRole
}

export function RegistrationApprovalDashboard({ userRole }: RegistrationApprovalDashboardProps) {
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [approvedRegistrations, setApprovedRegistrations] = useState<PendingRegistration[]>([])
  const [rejectedRegistrations, setRejectedRegistrations] = useState<PendingRegistration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")

  // Determine what registrations this user can approve
  const canApprove = (registration: PendingRegistration) => {
    if (userRole === UserRole.SYSTEM_ADMIN) {
      return registration.role !== UserRole.PATIENT // System admin can approve all except patients
    }
    if (userRole === UserRole.DOCTOR) {
      return registration.role === UserRole.PATIENT // Doctors can approve patients
    }
    return false
  }

  const fetchRegistrations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.get('/admin/registrations')
      
      if (response.success && response.data) {
        const registrations = response.data as PendingRegistration[]
        
        // Filter registrations based on user role
        const filteredRegistrations = registrations.filter(reg => canApprove(reg))
        
        setPendingRegistrations(filteredRegistrations.filter(r => r.registrationStatus === 'pending'))
        setApprovedRegistrations(filteredRegistrations.filter(r => r.registrationStatus === 'approved'))
        setRejectedRegistrations(filteredRegistrations.filter(r => r.registrationStatus === 'rejected'))
      } else {
        throw new Error(response.error?.message || "Failed to fetch registrations")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load registrations")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [userRole])

  const handleApproval = async (registrationId: string, approved: boolean) => {
    setIsProcessing(true)
    
    try {
      const response = await apiClient.post('/admin/registrations/review', {
        registrationId,
        approved,
        reviewNotes,
        reviewerId: 'current-user-id' // This would come from auth context
      })
      
      if (response.success) {
        await fetchRegistrations() // Refresh the data
        setSelectedRegistration(null)
        setReviewNotes("")
      } else {
        throw new Error(response.error?.message || "Failed to process registration")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to process registration")
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredPendingRegistrations = pendingRegistrations.filter(reg => {
    const matchesSearch = searchTerm === "" || 
      reg.personalInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.personalInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.personalInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.userId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === "all" || reg.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const RegistrationCard = ({ registration }: { registration: PendingRegistration }) => {
    const IconComponent = roleIcons[registration.role]
    const colorClass = roleColors[registration.role]
    
    return (
      <MagicCard className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 ${colorClass} rounded-lg flex items-center justify-center`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">
                  {registration.personalInfo.firstName} {registration.personalInfo.lastName}
                </h3>
                <Badge variant="secondary">{registration.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {registration.personalInfo.email}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(registration.submittedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor((Date.now() - new Date(registration.submittedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </span>
              </div>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedRegistration(registration)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  Registration Review - {registration.personalInfo.firstName} {registration.personalInfo.lastName}
                </DialogTitle>
                <DialogDescription>
                  Review the registration details and approve or reject the application.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">User ID</Label>
                      <p className="font-mono">{registration.userId}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <p>{registration.role}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p>{registration.personalInfo.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p>{registration.personalInfo.phone}</p>
                    </div>
                    {registration.personalInfo.dateOfBirth && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                        <p>{new Date(registration.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    )}
                    {registration.personalInfo.address && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <p>{registration.personalInfo.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional Information */}
                {registration.professionalInfo && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Professional Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {registration.professionalInfo.licenseNumber && (
                          <div>
                            <Label className="text-xs text-muted-foreground">License Number</Label>
                            <p className="font-mono">{registration.professionalInfo.licenseNumber}</p>
                          </div>
                        )}
                        {registration.professionalInfo.specialization && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Specialization</Label>
                            <p>{registration.professionalInfo.specialization}</p>
                          </div>
                        )}
                        {registration.professionalInfo.institution && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Institution</Label>
                            <p>{registration.professionalInfo.institution}</p>
                          </div>
                        )}
                        {registration.professionalInfo.department && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Department</Label>
                            <p>{registration.professionalInfo.department}</p>
                          </div>
                        )}
                        {registration.professionalInfo.credentials && (
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Credentials</Label>
                            <p className="whitespace-pre-wrap">{registration.professionalInfo.credentials}</p>
                          </div>
                        )}
                        {registration.professionalInfo.experience && (
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Experience</Label>
                            <p className="whitespace-pre-wrap">{registration.professionalInfo.experience}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Review Notes */}
                <div>
                  <Label htmlFor="reviewNotes">Review Notes</Label>
                  <Textarea
                    id="reviewNotes"
                    placeholder="Add notes about your review decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => handleApproval(registration.userId, false)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  <ShimmerButton
                    onClick={() => handleApproval(registration.userId, true)}
                    disabled={isProcessing}
                    shimmerColor="#10b981"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve
                  </ShimmerButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </MagicCard>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading registrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registration Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve user registrations for the healthcare system
          </p>
        </div>
        <Button onClick={fetchRegistrations} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BlurFade delay={0.1}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRegistrations.length}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your review
              </p>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.2}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedRegistrations.length}</div>
              <p className="text-xs text-muted-foreground">
                Successfully approved
              </p>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedRegistrations.length}</div>
              <p className="text-xs text-muted-foreground">
                Applications rejected
              </p>
            </CardContent>
          </Card>
        </BlurFade>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="roleFilter">Role</Label>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {userRole === UserRole.SYSTEM_ADMIN && (
                    <>
                      <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                      <SelectItem value={UserRole.LABORATORY}>Laboratory</SelectItem>
                      <SelectItem value={UserRole.INSURER}>Insurer</SelectItem>
                      <SelectItem value={UserRole.AUDITOR}>Auditor</SelectItem>
                    </>
                  )}
                  {userRole === UserRole.DOCTOR && (
                    <SelectItem value={UserRole.PATIENT}>Patient</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Registrations */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({filteredPendingRegistrations.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Approved ({approvedRegistrations.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedRegistrations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {filteredPendingRegistrations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Registrations</h3>
                  <p className="text-muted-foreground">
                    All registrations have been reviewed or there are no new applications.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPendingRegistrations.map((registration, index) => (
                <BlurFade key={registration.userId} delay={0.1 + index * 0.05}>
                  <RegistrationCard registration={registration} />
                </BlurFade>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRegistrations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Approved Registrations</h3>
                  <p className="text-muted-foreground">
                    Approved registrations will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedRegistrations.map((registration, index) => (
                <BlurFade key={registration.userId} delay={0.1 + index * 0.05}>
                  <RegistrationCard registration={registration} />
                </BlurFade>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRegistrations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Rejected Registrations</h3>
                  <p className="text-muted-foreground">
                    Rejected registrations will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedRegistrations.map((registration, index) => (
                <BlurFade key={registration.userId} delay={0.1 + index * 0.05}>
                  <RegistrationCard registration={registration} />
                </BlurFade>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}