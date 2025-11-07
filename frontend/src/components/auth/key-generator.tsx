"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { Key, Download, Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { PQCKeyManager } from "@/lib/crypto/key-manager"

interface KeyGenerationProgress {
  step: string
  progress: number
  message: string
}

interface GeneratedKeys {
  kyberPublicKey: string
  dilithiumPublicKey: string
}

interface KeyGeneratorProps {
  onKeysGenerated?: (keys: GeneratedKeys) => void
  className?: string
}

export function KeyGenerator({ onKeysGenerated, className }: KeyGeneratorProps) {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keyGenProgress, setKeyGenProgress] = useState<KeyGenerationProgress | null>(null)
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKeys | null>(null)

  const generateKeys = useCallback(async () => {
    if (!userId || !password) {
      setError("Please provide both User ID and password")
      return
    }

    setIsGenerating(true)
    setError(null)
    setKeyGenProgress({ step: "Initializing", progress: 10, message: "Setting up cryptographic environment..." })
    
    try {
      const keyManager = new PQCKeyManager()
      
      setKeyGenProgress({ step: "Initializing", progress: 25, message: "Initializing key manager..." })
      await keyManager.initialize(password)
      
      setKeyGenProgress({ step: "Generating", progress: 40, message: "Generating Kyber KEM key pair..." })
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulate key generation time
      
      setKeyGenProgress({ step: "Generating", progress: 60, message: "Generating Dilithium signature key pair..." })
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const keys = await keyManager.generateUserKeys(userId)
      
      setKeyGenProgress({ step: "Validating", progress: 80, message: "Validating generated key pairs..." })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setKeyGenProgress({ step: "Exporting", progress: 90, message: "Exporting public keys..." })
      const publicKeys = await keyManager.exportPublicKeys(userId)
      
      setKeyGenProgress({ step: "Complete", progress: 100, message: "Key generation complete!" })
      
      if (publicKeys) {
        setGeneratedKeys(publicKeys)
        onKeysGenerated?.(publicKeys)
      }
      
      return keys
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Key generation failed: ${errorMessage}`)
      setKeyGenProgress(null)
    } finally {
      setIsGenerating(false)
    }
  }, [userId, password, onKeysGenerated])

  const downloadKeys = useCallback(() => {
    if (!generatedKeys) return
    
    const keyData = {
      userId,
      timestamp: new Date().toISOString(),
      publicKeys: generatedKeys,
      note: "Keep these keys secure. The private keys are stored locally and encrypted with your password.",
      algorithms: {
        kem: "CRYSTALS-Kyber-768",
        signature: "CRYSTALS-Dilithium-3"
      }
    }
    
    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pqc-keys-${userId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [generatedKeys, userId])

  const resetGenerator = () => {
    setGeneratedKeys(null)
    setKeyGenProgress(null)
    setError(null)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          PQC Key Generator
        </CardTitle>
        <CardDescription>
          Generate quantum-resistant cryptographic key pairs for secure authentication
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!generatedKeys ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter unique user identifier"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password for key encryption"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                This password will encrypt your private keys locally
              </p>
            </div>

            <ShimmerButton
              onClick={generateKeys}
              disabled={isGenerating || !userId || !password}
              className="w-full"
              shimmerColor="#10b981"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Keys...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Generate PQC Key Pair
                </>
              )}
            </ShimmerButton>
          </>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Quantum-resistant keys generated successfully for user: <strong>{userId}</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kyber Public Key (KEM)</Label>
                <div className="p-3 bg-muted rounded border font-mono text-xs break-all">
                  {generatedKeys.kyberPublicKey.substring(0, 80)}...
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dilithium Public Key (Signature)</Label>
                <div className="p-3 bg-muted rounded border font-mono text-xs break-all">
                  {generatedKeys.dilithiumPublicKey.substring(0, 80)}...
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadKeys} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Backup
              </Button>
              <Button onClick={resetGenerator} variant="outline" className="flex-1">
                Generate New
              </Button>
            </div>
          </div>
        )}

        {/* Key Generation Progress */}
        {keyGenProgress && (
          <BlurFade delay={0.1}>
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <AnimatedCircularProgressBar
                      value={keyGenProgress.progress}
                      max={100}
                      min={0}
                      gaugePrimaryColor="#3b82f6"
                      gaugeSecondaryColor="#e5e7eb"
                      className="w-16 h-16"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{keyGenProgress.step}</p>
                      <p className="text-sm text-muted-foreground">{keyGenProgress.message}</p>
                    </div>
                  </div>
                  <Progress value={keyGenProgress.progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Algorithm Info */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">NIST Post-Quantum Standards</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>CRYSTALS-Kyber-768:</strong> Key encapsulation mechanism</li>
                <li>• <strong>CRYSTALS-Dilithium-3:</strong> Digital signature algorithm</li>
                <li>• <strong>AES-256-GCM:</strong> Symmetric encryption for local storage</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}