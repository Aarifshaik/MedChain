"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthLayout } from "@/components/auth/auth-layout"
import { AuthForm } from "@/components/auth/auth-form"
import { KeyGenerator } from "@/components/auth/key-generator"
import { SignatureAuth } from "@/components/auth/signature-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Key, PenTool, UserPlus, Shield } from "lucide-react"

export default function AuthDemoPage() {
  const [demoUserId, setDemoUserId] = useState("demo_user_123")

  const handleKeysGenerated = (keys: any) => {
    console.log("Keys generated:", keys)
  }

  const handleAuthSuccess = (authData: any) => {
    console.log("Authentication successful:", authData)
  }

  const handleAuthError = (error: string) => {
    console.error("Authentication error:", error)
  }

  return (
    <AuthLayout 
      title="PQC Authentication Demo"
      description="Explore post-quantum cryptographic authentication features"
      className="w-full max-w-6xl"
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Auth Form
          </TabsTrigger>
          <TabsTrigger value="keygen" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Key Generator
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center gap-2">
            <PenTool className="w-4 h-4" />
            Signature Auth
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Post-Quantum Security
                </CardTitle>
                <CardDescription>
                  NIST-standardized algorithms resistant to quantum attacks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CRYSTALS-Kyber-768</span>
                    <Badge variant="secondary">KEM</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CRYSTALS-Dilithium-3</span>
                    <Badge variant="secondary">Signature</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AES-256-GCM</span>
                    <Badge variant="secondary">Encryption</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-green-500" />
                  Key Management
                </CardTitle>
                <CardDescription>
                  Secure local storage with password-based encryption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Local Storage</span>
                    <Badge variant="outline">Encrypted</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Key Derivation</span>
                    <Badge variant="outline">PBKDF2</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Backup Support</span>
                    <Badge variant="outline">JSON Export</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-purple-500" />
                  Digital Signatures
                </CardTitle>
                <CardDescription>
                  Challenge-response authentication protocol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Challenge Generation</span>
                    <Badge variant="outline">Cryptographic</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Signature Creation</span>
                    <Badge variant="outline">Dilithium</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verification</span>
                    <Badge variant="outline">Server-side</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-orange-500" />
                  User Experience
                </CardTitle>
                <CardDescription>
                  Intuitive interface with progress indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Progress Tracking</span>
                    <Badge variant="outline">Real-time</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Handling</span>
                    <Badge variant="outline">Comprehensive</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Magic UI Effects</span>
                    <Badge variant="outline">Enhanced</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="auth">
          <AuthForm />
        </TabsContent>

        <TabsContent value="keygen">
          <KeyGenerator 
            onKeysGenerated={handleKeysGenerated}
            className="max-w-2xl mx-auto"
          />
        </TabsContent>

        <TabsContent value="signature">
          <SignatureAuth
            userId={demoUserId}
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
            className="max-w-2xl mx-auto"
          />
        </TabsContent>
      </Tabs>
    </AuthLayout>
  )
}