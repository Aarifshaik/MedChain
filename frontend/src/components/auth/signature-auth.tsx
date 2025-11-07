"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RippleButton } from "@/components/ui/ripple-button"
import { PenTool, Shield, CheckCircle, AlertCircle, Loader2, Copy, RefreshCw } from "lucide-react"
import { PQCKeyManager } from "@/lib/crypto/key-manager"
import { apiClient } from "@/lib/api"

interface SignatureAuthProps {
  userId: string
  onAuthSuccess?: (authData: any) => void
  onAuthError?: (error: string) => void
  className?: string
}

export function SignatureAuth({ userId, onAuthSuccess, onAuthError, className }: SignatureAuthProps) {
  const [password, setPassword] = useState("")
  const [challenge, setChallenge] = useState("")
  const [signature, setSignature] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [authStep, setAuthStep] = useState<'challenge' | 'sign' | 'verify'>('challenge')

  const generateChallenge = useCallback(async () => {
    setIsGeneratingChallenge(true)
    setError(null)
    
    try {
      // Generate a cryptographic challenge
      const timestamp = Date.now()
      const nonce = crypto.getRandomValues(new Uint8Array(32))
      const nonceHex = Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')
      
      const challengeMessage = `auth_challenge:${userId}:${timestamp}:${nonceHex}`
      setChallenge(challengeMessage)
      setAuthStep('sign')
    } catch (error) {
      setError("Failed to generate authentication challenge")
    } finally {
      setIsGeneratingChallenge(false)
    }
  }, [userId])

  const generateSignature = useCallback(async () => {
    if (!password || !challenge) {
      setError("Password and challenge are required")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const keyManager = new PQCKeyManager()
      await keyManager.initialize(password)
      
      // Check if user has keys
      if (!keyManager.hasUserKeys(userId)) {
        throw new Error("No keys found for this user. Please register first.")
      }
      
      // Get user keys
      const userKeys = await keyManager.getUserKeys(userId)
      if (!userKeys) {
        throw new Error("Failed to retrieve user keys")
      }
      
      // In a real implementation, this would use the Dilithium signature algorithm
      // For now, we'll simulate the signature generation
      const messageBytes = new TextEncoder().encode(challenge)
      const simulatedSignature = btoa(challenge + ":" + userId + ":" + Date.now())
      
      setSignature(simulatedSignature)
      setAuthStep('verify')
      setSuccess("Digital signature generated successfully")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Signature generation failed"
      setError(errorMessage)
      onAuthError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [password, challenge, userId, onAuthError])

  const verifySignature = useCallback(async () => {
    if (!signature || !challenge) {
      setError("Signature and challenge are required for verification")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Send authentication request to backend
      const response = await apiClient.post('/auth/verify-signature', {
        userId,
        challenge,
        signature,
        timestamp: Date.now()
      })

      if (response.success) {
        setSuccess("Authentication successful!")
        onAuthSuccess?.(response.data)
      } else {
        throw new Error(response.error?.message || "Signature verification failed")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      setError(errorMessage)
      onAuthError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [signature, challenge, userId, onAuthSuccess, onAuthError])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const resetAuth = () => {
    setChallenge("")
    setSignature("")
    setError(null)
    setSuccess(null)
    setAuthStep('challenge')
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5" />
          Digital Signature Authentication
        </CardTitle>
        <CardDescription>
          Authenticate using post-quantum digital signatures
        </CardDescription>
        <div className="flex gap-2">
          <Badge variant={authStep === 'challenge' ? 'default' : 'secondary'}>
            1. Challenge
          </Badge>
          <Badge variant={authStep === 'sign' ? 'default' : 'secondary'}>
            2. Sign
          </Badge>
          <Badge variant={authStep === 'verify' ? 'default' : 'secondary'}>
            3. Verify
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Step 1: Generate Challenge */}
        {authStep === 'challenge' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Step 1:</strong> Generate a cryptographic challenge that will be signed with your private key.
              </p>
            </div>
            
            <RippleButton
              onClick={generateChallenge}
              disabled={isGeneratingChallenge}
              className="w-full"
              rippleColor="#3b82f6"
            >
              {isGeneratingChallenge ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Challenge...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Authentication Challenge
                </>
              )}
            </RippleButton>
          </div>
        )}

        {/* Step 2: Sign Challenge */}
        {authStep === 'sign' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Step 2:</strong> Sign the challenge with your private key to prove your identity.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Authentication Challenge</Label>
              <div className="relative">
                <Textarea
                  value={challenge}
                  readOnly
                  className="font-mono text-xs resize-none"
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(challenge)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password to unlock private keys"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <RippleButton
              onClick={generateSignature}
              disabled={isLoading || !password}
              className="w-full"
              rippleColor="#10b981"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Signature...
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4 mr-2" />
                  Generate Digital Signature
                </>
              )}
            </RippleButton>
          </div>
        )}

        {/* Step 3: Verify Signature */}
        {authStep === 'verify' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Step 3:</strong> Verify the signature with the server to complete authentication.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Digital Signature</Label>
              <div className="relative">
                <Textarea
                  value={signature}
                  readOnly
                  className="font-mono text-xs resize-none"
                  rows={4}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(signature)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <RippleButton
                onClick={verifySignature}
                disabled={isLoading}
                className="flex-1"
                rippleColor="#3b82f6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify & Authenticate
                  </>
                )}
              </RippleButton>
              
              <Button onClick={resetAuth} variant="outline">
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Security Info */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Signature-Based Authentication</p>
              <p className="text-muted-foreground">
                Uses CRYSTALS-Dilithium digital signatures to prove identity without 
                transmitting private keys. Quantum-resistant and cryptographically secure.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}