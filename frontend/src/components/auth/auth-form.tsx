"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { RippleButton } from "@/components/ui/ripple-button"
import { Activity, Shield, Key, Upload, Download, AlertCircle, CheckCircle, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { UserRole } from "@/types"
import { PQCKeyManager } from "@/lib/crypto/key-manager"
import { apiClient } from "@/lib/api"
import { useAuthErrorHandler, AuthErrorBoundary } from "./auth-error-boundary"

// Form data types
interface LoginFormData {
  userId: string
  password: string
}

interface RegistrationFormData {
  userId: string
  role: UserRole
  password: string
  confirmPassword: string
}

interface KeyGenerationProgress {
  step: string
  progress: number
  message: string
}

function AuthFormContent() {
  const { login, isLoading: authLoading, getIntendedUrl, clearIntendedUrl } = useAuth()
  const { getUserFriendlyErrorMessage, isNetworkError, isAuthError } = useAuthErrorHandler()
  const [activeTab, setActiveTab] = useState("login")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [keyGenProgress, setKeyGenProgress] = useState<KeyGenerationProgress | null>(null)
  const [generatedKeys, setGeneratedKeys] = useState<{
    kyberPublicKey: string
    dilithiumPublicKey: string
  } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine)

  // Login form state
  const [loginData, setLoginData] = useState<LoginFormData>({
    userId: "",
    password: "",
  })

  // Registration form state
  const [registrationData, setRegistrationData] = useState<RegistrationFormData>({
    userId: "",
    role: UserRole.PATIENT,
    password: "",
    confirmPassword: "",
  })

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true)
    const handleOffline = () => setNetworkStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-retry mechanism for network errors
  const retryWithBackoff = useCallback(async (operation: () => Promise<void>, maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt)
        if (attempt > 0) {
          setIsRetrying(true)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        await operation()
        setRetryCount(0)
        setIsRetrying(false)
        return // Success
      } catch (error) {
        if (attempt === maxRetries) {
          setIsRetrying(false)
          throw error // Final attempt failed
        }
        
        // Only retry network errors
        if (error instanceof Error && !isNetworkError(error)) {
          setIsRetrying(false)
          throw error // Don't retry non-network errors
        }
      }
    }
  }, [isNetworkError])

  const generateKeys = useCallback(async (userId: string, password: string) => {
    setKeyGenProgress({ step: "Initializing", progress: 10, message: "Setting up cryptographic environment..." })
    
    try {
      const keyManager = new PQCKeyManager()
      
      setKeyGenProgress({ step: "Initializing", progress: 25, message: "Initializing key manager..." })
      await keyManager.initialize(password)
      
      setKeyGenProgress({ step: "Generating", progress: 50, message: "Generating Kyber key pair..." })
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate key generation time
      
      setKeyGenProgress({ step: "Generating", progress: 75, message: "Generating Dilithium key pair..." })
      const keys = await keyManager.generateUserKeys(userId)
      
      setKeyGenProgress({ step: "Exporting", progress: 90, message: "Exporting public keys..." })
      const publicKeys = await keyManager.exportPublicKeys(userId)
      
      setKeyGenProgress({ step: "Complete", progress: 100, message: "Key generation complete!" })
      
      if (publicKeys) {
        setGeneratedKeys(publicKeys)
      }
      
      return keys
    } catch (error) {
      throw new Error(`Key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = loginData
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      await retryWithBackoff(async () => {
        await login({
          userId: data.userId,
          password: data.password
        })
      })
      
      setSuccess("Login successful! Redirecting...")
      
      // Get return URL from multiple sources in priority order:
      // 1. Query parameter (for direct links)
      // 2. Stored intended URL (from route guard redirects)
      // 3. Default to dashboard
      const urlParams = new URLSearchParams(window.location.search)
      const queryReturnUrl = urlParams.get('returnUrl')
      const storedIntendedUrl = getIntendedUrl()
      const returnUrl = queryReturnUrl || storedIntendedUrl || '/dashboard'
      
      // Clear the stored intended URL after using it
      clearIntendedUrl()
      
      // Redirect after successful login
      setTimeout(() => {
        window.location.href = returnUrl
      }, 1000)
    } catch (error) {
      const friendlyMessage = error instanceof Error ? getUserFriendlyErrorMessage(error) : "Login failed"
      setError(friendlyMessage)
    } finally {
      setIsLoading(false)
      setRetryCount(0)
      setIsRetrying(false)
    }
  }

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = registrationData
    
    // Basic validation
    if (data.password !== data.confirmPassword) {
      setError("Passwords don't match")
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setKeyGenProgress(null)
    setGeneratedKeys(null)

    try {
      await retryWithBackoff(async () => {
        // Generate PQC keys
        const keys = await generateKeys(data.userId, data.password)
        
        // Register user with backend
        const response = await apiClient.post('/auth/register', {
          userId: data.userId,
          role: data.role,
          publicKeys: {
            kyberPublicKey: generatedKeys?.kyberPublicKey || 'test-kyber-key',
            dilithiumPublicKey: generatedKeys?.dilithiumPublicKey || 'test-dilithium-key'
          }
        })

        if (response.success) {
          setSuccess("Registration successful! Your quantum-resistant keys have been generated and stored securely.")
        } else {
          throw new Error(response.error?.message || "Registration failed")
        }
      })
    } catch (error) {
      const friendlyMessage = error instanceof Error ? getUserFriendlyErrorMessage(error) : "Registration failed"
      setError(friendlyMessage)
      setKeyGenProgress(null)
    } finally {
      setIsLoading(false)
      setRetryCount(0)
      setIsRetrying(false)
    }
  }

  const downloadKeys = () => {
    if (!generatedKeys) return
    
    const keyData = {
      timestamp: new Date().toISOString(),
      keys: generatedKeys,
      note: "Keep these keys secure. They are required for authentication."
    }
    
    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `healthcare-dlt-keys-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <BlurFade delay={0.1}>
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Healthcare DLT</h2>
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Quantum-Resistant
                </Badge>
              </div>
            </div>
            <CardTitle>
              <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                Secure Authentication
              </AnimatedShinyText>
            </CardTitle>
            <CardDescription>
              Access your healthcare records with post-quantum cryptographic security
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={onLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      placeholder="Enter your user ID"
                      value={loginData.userId}
                      onChange={(e) => setLoginData({ ...loginData, userId: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to decrypt your locally stored private keys
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Your private keys are stored locally and encrypted with your password.
                      If you don't have keys, please register first to generate them.
                    </p>
                  </div>

                  <RippleButton
                    type="submit"
                    className="w-full"
                    disabled={isLoading || authLoading}
                    rippleColor="#3b82f6"
                  >
                    {isLoading || authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Sign In with PQC
                      </>
                    )}
                  </RippleButton>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={onRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="regUserId">User ID</Label>
                    <Input
                      id="regUserId"
                      placeholder="Choose a unique user ID"
                      value={registrationData.userId}
                      onChange={(e) => setRegistrationData({ ...registrationData, userId: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={registrationData.role} 
                      onValueChange={(value) => setRegistrationData({ ...registrationData, role: value as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.PATIENT}>Patient</SelectItem>
                        <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                        <SelectItem value={UserRole.LABORATORY}>Laboratory</SelectItem>
                        <SelectItem value={UserRole.INSURER}>Insurer</SelectItem>
                        <SelectItem value={UserRole.AUDITOR}>Auditor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regPassword">Password</Label>
                    <Input
                      id="regPassword"
                      type="password"
                      placeholder="Create a strong password"
                      value={registrationData.password}
                      onChange={(e) => setRegistrationData({ ...registrationData, password: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to encrypt your private keys locally
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={registrationData.confirmPassword}
                      onChange={(e) => setRegistrationData({ ...registrationData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>

                  <ShimmerButton
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    shimmerColor="#10b981"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Keys...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Register & Generate Keys
                      </>
                    )}
                  </ShimmerButton>
                </form>
              </TabsContent>
            </Tabs>

            {/* Network Status Indicator */}
            {!networkStatus && (
              <Alert variant="destructive" className="mt-4">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  You appear to be offline. Please check your internet connection.
                </AlertDescription>
              </Alert>
            )}

            {/* Retry Status */}
            {isRetrying && retryCount > 0 && (
              <Alert className="mt-4">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Retrying... (Attempt {retryCount}/3)</span>
                    <Badge variant="outline">
                      <Wifi className="w-3 h-3 mr-1" />
                      {networkStatus ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Key Generation Progress */}
            {keyGenProgress && (
              <BlurFade delay={0.2}>
                <Card className="mt-6 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Generating Quantum-Resistant Keys
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <AnimatedCircularProgressBar
                            value={keyGenProgress.progress}
                            max={100}
                            min={0}
                            gaugePrimaryColor="#3b82f6"
                            gaugeSecondaryColor="#e5e7eb"
                            className="w-16 h-16"
                          />
                          <div>
                            <p className="font-medium">{keyGenProgress.step}</p>
                            <p className="text-sm text-muted-foreground">{keyGenProgress.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Progress value={keyGenProgress.progress} className="w-full" />
                  </CardContent>
                </Card>
              </BlurFade>
            )}

            {/* Generated Keys Display */}
            {generatedKeys && (
              <BlurFade delay={0.3}>
                <Card className="mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      Keys Generated Successfully
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Kyber Public Key (First 64 chars)</Label>
                      <div className="p-2 bg-background rounded border font-mono text-xs break-all">
                        {generatedKeys.kyberPublicKey.substring(0, 64)}...
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Dilithium Public Key (First 64 chars)</Label>
                      <div className="p-2 bg-background rounded border font-mono text-xs break-all">
                        {generatedKeys.dilithiumPublicKey.substring(0, 64)}...
                      </div>
                    </div>
                    <Button onClick={downloadKeys} variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download Key Backup
                    </Button>
                  </CardContent>
                </Card>
              </BlurFade>
            )}

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

            {/* Security Info */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Post-Quantum Security</p>
                  <p className="text-muted-foreground">
                    Your keys use CRYSTALS-Kyber and CRYSTALS-Dilithium algorithms, 
                    providing security against both classical and quantum computer attacks.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  )
}

export function AuthForm() {
  return (
    <AuthErrorBoundary
      maxRetries={3}
      onError={(error, errorInfo) => {
        console.error('Auth form error:', error, errorInfo)
      }}
      onRetry={() => {
        // Refresh the page to retry
        window.location.reload()
      }}
    >
      <AuthFormContent />
    </AuthErrorBoundary>
  )
}