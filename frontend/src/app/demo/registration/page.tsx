"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { RegistrationFlow } from "@/components/auth/registration-flow"
import { RegistrationApprovalDashboard } from "@/components/admin/registration-approval-dashboard"
import { 
  UserPlus, 
  UserCheck, 
  Activity,
  Shield,
  ArrowRight
} from "lucide-react"
import { UserRole } from "@/types"

export default function RegistrationDemoPage() {
  const [activeDemo, setActiveDemo] = useState<'overview' | 'registration' | 'approval'>('overview')
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SYSTEM_ADMIN)

  const demoSections = [
    {
      id: 'registration' as const,
      title: 'User Registration',
      description: 'Experience the role-based registration process with quantum-resistant key generation',
      icon: UserPlus,
      color: 'bg-blue-500',
      features: [
        'Role-specific registration forms',
        'Post-quantum cryptographic key generation',
        'Professional credential validation',
        'Patient-doctor approval workflow'
      ]
    },
    {
      id: 'approval' as const,
      title: 'Admin Approval Dashboard',
      description: 'Review and approve user registrations with comprehensive verification tools',
      icon: UserCheck,
      color: 'bg-green-500',
      features: [
        'Pending registration reviews',
        'Professional credential verification',
        'Role-based approval permissions',
        'Audit trail and compliance tracking'
      ]
    }
  ]

  if (activeDemo === 'registration') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setActiveDemo('overview')}
              className="mb-4"
            >
              ← Back to Demo Overview
            </Button>
            <h1 className="text-3xl font-bold mb-2">Registration Demo</h1>
            <p className="text-muted-foreground">
              Experience the complete user registration process with role selection and quantum-resistant security.
            </p>
          </div>
          <RegistrationFlow />
        </div>
      </div>
    )
  }

  if (activeDemo === 'approval') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setActiveDemo('overview')}
              className="mb-4"
            >
              ← Back to Demo Overview
            </Button>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Approval Dashboard Demo</h1>
                <p className="text-muted-foreground">
                  Review and approve user registrations as a system administrator or doctor.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Demo as:</label>
                <select 
                  value={userRole} 
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value={UserRole.SYSTEM_ADMIN}>System Admin</option>
                  <option value={UserRole.DOCTOR}>Doctor</option>
                </select>
              </div>
            </div>
          </div>
          <RegistrationApprovalDashboard userRole={userRole} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        <BlurFade delay={0.1}>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Registration & Approval Demo</h1>
                <Badge variant="secondary" className="text-xs mt-1">
                  <Shield className="w-3 h-3 mr-1" />
                  Healthcare DLT System
                </Badge>
              </div>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore the complete user registration and approval workflow for the Healthcare DLT system. 
              Experience quantum-resistant security, role-based permissions, and professional verification processes.
            </p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {demoSections.map((section, index) => {
            const IconComponent = section.icon
            
            return (
              <BlurFade key={section.id} delay={0.2 + index * 0.1}>
                <MagicCard className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 ${section.color} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-base">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-3">Key Features:</h4>
                      <ul className="space-y-2">
                        {section.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button 
                      onClick={() => setActiveDemo(section.id)}
                      className="w-full mt-6"
                    >
                      Try {section.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </MagicCard>
              </BlurFade>
            )
          })}
        </div>

        {/* System Overview */}
        <BlurFade delay={0.4}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                System Architecture Overview
              </CardTitle>
              <CardDescription>
                Understanding the registration and approval workflow in the Healthcare DLT system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="workflow" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="roles">User Roles</TabsTrigger>
                </TabsList>
                
                <TabsContent value="workflow" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <UserPlus className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">1. Registration</h3>
                      <p className="text-sm text-muted-foreground">
                        Users select their role and complete role-specific registration forms with professional credentials.
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">2. Key Generation</h3>
                      <p className="text-sm text-muted-foreground">
                        Post-quantum cryptographic keys are generated locally and stored securely with user password encryption.
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <UserCheck className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">3. Approval</h3>
                      <p className="text-sm text-muted-foreground">
                        Authorized personnel review credentials and approve registrations based on role requirements.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="security" className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Post-Quantum Cryptography</h3>
                      <p className="text-sm text-muted-foreground">
                        Uses CRYSTALS-Kyber for key exchange and CRYSTALS-Dilithium for digital signatures, 
                        providing security against both classical and quantum computer attacks.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Local Key Storage</h3>
                      <p className="text-sm text-muted-foreground">
                        Private keys are generated and stored locally in the user's browser, encrypted with their password. 
                        Keys never leave the device unencrypted.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Credential Verification</h3>
                      <p className="text-sm text-muted-foreground">
                        Professional credentials are verified by authorized personnel before account activation, 
                        ensuring only qualified individuals access the system.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="roles" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold">Healthcare Professionals</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Doctor</Badge>
                          <span className="text-muted-foreground">Can approve patient registrations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Laboratory</Badge>
                          <span className="text-muted-foreground">Upload test results</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Insurer</Badge>
                          <span className="text-muted-foreground">Process insurance claims</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Auditor</Badge>
                          <span className="text-muted-foreground">Review compliance and audit trails</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold">Approval Authority</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">System Admin</Badge>
                          <span className="text-muted-foreground">Approves all professional registrations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Doctor</Badge>
                          <span className="text-muted-foreground">Approves patient registrations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Patient</Badge>
                          <span className="text-muted-foreground">Requires doctor approval</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </div>
  )
}