"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { 
  User, 
  Stethoscope, 
  Building2, 
  Shield, 
  FileText, 
  Activity,
  ArrowRight,
  CheckCircle
} from "lucide-react"
import { UserRole } from "@/types"

const roleOptions = [
  {
    role: UserRole.PATIENT,
    icon: User,
    title: "Patient",
    description: "Manage your personal healthcare records and consent permissions",
    features: [
      "Upload and manage medical records",
      "Control data access permissions",
      "View audit trails of data access",
      "Grant/revoke consent to providers"
    ],
    color: "bg-blue-500",
    approvalProcess: "Requires approval from a licensed doctor"
  },
  {
    role: UserRole.DOCTOR,
    icon: Stethoscope,
    title: "Doctor",
    description: "Access patient records with proper consent and manage medical data",
    features: [
      "Access consented patient records",
      "Upload medical reports and diagnoses",
      "Approve patient registrations",
      "Manage treatment records"
    ],
    color: "bg-green-500",
    approvalProcess: "Requires credential verification by system admin"
  },
  {
    role: UserRole.LABORATORY,
    icon: Building2,
    title: "Laboratory",
    description: "Upload test results and manage laboratory data",
    features: [
      "Upload lab test results",
      "Access patient test history",
      "Manage laboratory reports",
      "Integration with hospital systems"
    ],
    color: "bg-purple-500",
    approvalProcess: "Requires license verification by system admin"
  },
  {
    role: UserRole.INSURER,
    icon: Shield,
    title: "Insurance Provider",
    description: "Process claims and access consented patient data for coverage decisions",
    features: [
      "Access consented claim data",
      "Process insurance claims",
      "Verify medical procedures",
      "Generate coverage reports"
    ],
    color: "bg-orange-500",
    approvalProcess: "Requires regulatory approval by system admin"
  },
  {
    role: UserRole.AUDITOR,
    icon: FileText,
    title: "Auditor",
    description: "Review system compliance and access audit trails for regulatory purposes",
    features: [
      "View comprehensive audit trails",
      "Generate compliance reports",
      "Monitor data access patterns",
      "Regulatory compliance verification"
    ],
    color: "bg-red-500",
    approvalProcess: "Requires certification verification by system admin"
  }
]

interface RoleSelectorProps {
  onRoleSelect: (role: UserRole) => void
}

export function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <BlurFade delay={0.1}>
        <div className="w-full max-w-6xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Healthcare DLT Registration</h1>
                <Badge variant="secondary" className="text-xs mt-1">
                  <Shield className="w-3 h-3 mr-1" />
                  Quantum-Resistant Security
                </Badge>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose your role to begin the registration process. Each role has specific permissions and approval requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {roleOptions.map((option, index) => {
              const IconComponent = option.icon
              const isSelected = selectedRole === option.role
              
              return (
                <BlurFade key={option.role} delay={0.1 + index * 0.1}>
                  <div 
                    className="cursor-pointer"
                    onClick={() => setSelectedRole(option.role)}
                  >
                    <MagicCard
                      className={`transition-all duration-200 ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                          : 'hover:shadow-lg'
                      }`}
                    >
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 ${option.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                        <IconComponent className="w-10 h-10 text-white" />
                      </div>
                      <CardTitle className="text-xl flex items-center justify-center gap-2">
                        {option.title}
                        {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {option.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Key Features:</h4>
                        <ul className="space-y-1">
                          {option.features.map((feature, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          <strong>Approval:</strong> {option.approvalProcess}
                        </p>
                      </div>
                    </CardContent>
                    </MagicCard>
                  </div>
                </BlurFade>
              )
            })}
          </div>

          {selectedRole && (
            <BlurFade delay={0.3}>
              <div className="text-center">
                <ShimmerButton
                  onClick={handleContinue}
                  className="px-8 py-3 text-lg"
                  shimmerColor="#3b82f6"
                >
                  Continue as {roleOptions.find(r => r.role === selectedRole)?.title}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </ShimmerButton>
              </div>
            </BlurFade>
          )}

          {/* Information Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  All user data is protected with post-quantum cryptography using CRYSTALS-Kyber 
                  and CRYSTALS-Dilithium algorithms.
                </p>
                <p>
                  Your private keys are generated locally and encrypted with your password. 
                  They never leave your device unencrypted.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Approval Process
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Patient registrations require approval from licensed doctors to ensure 
                  proper medical oversight.
                </p>
                <p>
                  Healthcare professionals undergo credential verification by system 
                  administrators before account activation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </BlurFade>
    </div>
  )
}