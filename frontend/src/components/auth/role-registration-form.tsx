"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import { BlurFade } from "@/components/ui/blur-fade"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { MagicCard } from "@/components/ui/magic-card"
import { 
  User, 
  Stethoscope, 
  Building2, 
  Shield, 
  FileText, 
  UserCheck,
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Award
} from "lucide-react"
import { UserRole } from "@/types"
import { PQCKeyManager } from "@/lib/crypto/key-manager"
import { apiClient } from "@/lib/api"

interface RoleRegistrationData {
  // Basic Info
  userId: string
  role: UserRole
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  
  // Role-specific fields
  licenseNumber?: string
  specialization?: string
  institution?: string
  department?: string
  address?: string
  dateOfBirth?: string
  emergencyContact?: string
  
  // Additional verification
  credentials?: string
  experience?: string
  references?: string
}

const roleConfigs = {
  [UserRole.PATIENT]: {
    icon: User,
    title: "Patient Registration",
    description: "Register as a patient to manage your healthcare records",
    color: "bg-blue-500",
    fields: ['dateOfBirth', 'emergencyContact', 'address']
  },
  [UserRole.DOCTOR]: {
    icon: Stethoscope,
    title: "Doctor Registration",
    description: "Register as a healthcare professional",
    color: "bg-green-500",
    fields: ['licenseNumber', 'specialization', 'institution', 'credentials', 'experience']
  },
  [UserRole.LABORATORY]: {
    icon: Building2,
    title: "Laboratory Registration",
    description: "Register your laboratory for test result management",
    color: "bg-purple-500",
    fields: ['licenseNumber', 'institution', 'department', 'address', 'credentials']
  },
  [UserRole.INSURER]: {
    icon: Shield,
    title: "Insurance Provider Registration",
    description: "Register as an insurance provider for claims processing",
    color: "bg-orange-500",
    fields: ['licenseNumber', 'institution', 'address', 'credentials']
  },
  [UserRole.AUDITOR]: {
    icon: FileText,
    title: "Auditor Registration",
    description: "Register as a compliance auditor",
    color: "bg-red-500",
    fields: ['licenseNumber', 'institution', 'credentials', 'experience']
  },
  [UserRole.SYSTEM_ADMIN]: {
    icon: UserCheck,
    title: "System Administrator Registration",
    description: "Register as a system administrator",
    color: "bg-gray-500",
    fields: ['institution', 'credentials', 'experience']
  }
}

interface RoleRegistrationFormProps {
  selectedRole: UserRole
  onSuccess?: (data: any) => void
  onBack?: () => void
}

export function RoleRegistrationForm({ selectedRole, onSuccess, onBack }: RoleRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [keyGenProgress, setKeyGenProgress] = useState<number>(0)
  
  const [formData, setFormData] = useState<RoleRegistrationData>({
    userId: "",
    role: selectedRole,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    specialization: "",
    institution: "",
    department: "",
    address: "",
    dateOfBirth: "",
    emergencyContact: "",
    credentials: "",
    experience: "",
    references: ""
  })

  const config = roleConfigs[selectedRole]
  const IconComponent = config.icon

  const generateKeys = useCallback(async (userId: string, password: string) => {
    setKeyGenProgress(10)
    
    try {
      const keyManager = new PQCKeyManager()
      
      setKeyGenProgress(25)
      await keyManager.initialize(password)
      
      setKeyGenProgress(50)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setKeyGenProgress(75)
      const keys = await keyManager.generateUserKeys(userId)
      
      setKeyGenProgress(90)
      const publicKeys = await keyManager.exportPublicKeys(userId)
      
      setKeyGenProgress(100)
      
      return { keys, publicKeys }
    } catch (error) {
      throw new Error(`Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    // Role-specific validation
    if (selectedRole !== UserRole.PATIENT && !formData.licenseNumber) {
      setError("License number is required for healthcare professionals")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setKeyGenProgress(0)

    try {
      // Generate PQC keys
      const { keys, publicKeys } = await generateKeys(formData.userId, formData.password)
      
      // Prepare registration data with proper public key format
      const registrationData = {
        userId: formData.userId,
        role: formData.role,
        publicKeys: {
          kyberPublicKey: publicKeys.kyberPublicKey,
          dilithiumPublicKey: publicKeys.dilithiumPublicKey
        },
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          address: formData.address,
          emergencyContact: formData.emergencyContact
        },
        professionalInfo: {
          licenseNumber: formData.licenseNumber,
          specialization: formData.specialization,
          institution: formData.institution,
          department: formData.department,
          credentials: formData.credentials,
          experience: formData.experience,
          references: formData.references
        }
      }

      // Submit registration
      const response = await apiClient.post('/auth/register', registrationData)

      if (response.success) {
        const successMessage = selectedRole === UserRole.PATIENT 
          ? "Registration submitted successfully! A doctor will review and approve your registration."
          : "Registration submitted successfully! A system administrator will review your credentials and approve your registration."
        
        setSuccess(successMessage)
        onSuccess?.(response.data)
      } else {
        throw new Error(response.error?.message || "Registration failed")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed")
      setKeyGenProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof RoleRegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <BlurFade delay={0.1}>
        <MagicCard className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`w-16 h-16 ${config.color} rounded-xl flex items-center justify-center`}>
                <IconComponent className="w-10 h-10 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{config.title}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {config.description}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="mx-auto">
              <Shield className="w-3 h-3 mr-1" />
              Quantum-Resistant Security
            </Badge>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID *</Label>
                    <Input
                      id="userId"
                      placeholder="Choose a unique user ID"
                      value={formData.userId}
                      onChange={(e) => updateFormData('userId', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      required
                    />
                  </div>
                  
                  {config.fields.includes('dateOfBirth') && (
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
                
                {config.fields.includes('address') && (
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your full address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
                
                {config.fields.includes('emergencyContact') && (
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      placeholder="Emergency contact name and phone"
                      value={formData.emergencyContact}
                      onChange={(e) => updateFormData('emergencyContact', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Professional Information */}
              {selectedRole !== UserRole.PATIENT && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Professional Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.fields.includes('licenseNumber') && (
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber">License Number *</Label>
                        <Input
                          id="licenseNumber"
                          placeholder="Professional license number"
                          value={formData.licenseNumber}
                          onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                          required
                        />
                      </div>
                    )}
                    
                    {config.fields.includes('specialization') && (
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          placeholder="Medical specialization"
                          value={formData.specialization}
                          onChange={(e) => updateFormData('specialization', e.target.value)}
                        />
                      </div>
                    )}
                    
                    {config.fields.includes('institution') && (
                      <div className="space-y-2">
                        <Label htmlFor="institution">Institution *</Label>
                        <Input
                          id="institution"
                          placeholder="Hospital, clinic, or organization name"
                          value={formData.institution}
                          onChange={(e) => updateFormData('institution', e.target.value)}
                          required
                        />
                      </div>
                    )}
                    
                    {config.fields.includes('department') && (
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          placeholder="Department or division"
                          value={formData.department}
                          onChange={(e) => updateFormData('department', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  
                  {config.fields.includes('credentials') && (
                    <div className="space-y-2">
                      <Label htmlFor="credentials">Credentials & Certifications</Label>
                      <Textarea
                        id="credentials"
                        placeholder="List your relevant credentials, certifications, and qualifications"
                        value={formData.credentials}
                        onChange={(e) => updateFormData('credentials', e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                  
                  {config.fields.includes('experience') && (
                    <div className="space-y-2">
                      <Label htmlFor="experience">Professional Experience</Label>
                      <Textarea
                        id="experience"
                        placeholder="Describe your relevant professional experience"
                        value={formData.experience}
                        onChange={(e) => updateFormData('experience', e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Security Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Security Setup</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 characters. Used to encrypt your private keys.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Key Generation Progress */}
              {keyGenProgress > 0 && keyGenProgress < 100 && (
                <BlurFade delay={0.2}>
                  <Card className="border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Generating Quantum-Resistant Keys</p>
                          <p className="text-sm text-muted-foreground">
                            Progress: {keyGenProgress}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </BlurFade>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                {onBack && (
                  <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                    Back to Role Selection
                  </Button>
                )}
                
                <ShimmerButton
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                  shimmerColor="#10b981"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {keyGenProgress > 0 ? 'Generating Keys...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Submit Registration
                    </>
                  )}
                </ShimmerButton>
              </div>
            </form>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {success && (
              <Alert className="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Registration Process</p>
                  <p className="text-muted-foreground">
                    {selectedRole === UserRole.PATIENT 
                      ? "After registration, a licensed doctor will review and approve your account. You'll receive an email notification once approved."
                      : "Your registration will be reviewed by system administrators who will verify your credentials and professional standing before approval."
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </MagicCard>
      </BlurFade>
    </div>
  )
}