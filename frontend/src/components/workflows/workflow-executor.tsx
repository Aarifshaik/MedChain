"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkflowProgress, MultiStepProgress } from "./workflow-progress"
import { WorkflowErrorBoundary } from "./error-boundary"
import { FeedbackManager, WorkflowFeedback, useFeedbackManager } from "./user-feedback"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { 
  workflowOrchestrator,
  WorkflowProgress as WorkflowProgressType,
  WorkflowOptions
} from "@/lib/workflows/workflow-orchestrator"
import { UserRole, RecordType, Permission } from "@/types"
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from "lucide-react"

export type WorkflowType = 
  | 'user-onboarding'
  | 'authentication'
  | 'record-management'
  | 'consent-management'
  | 'record-access'

interface WorkflowExecutorProps {
  workflowType: WorkflowType
  workflowData: any
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  autoStart?: boolean
  className?: string
}

export function WorkflowExecutor({
  workflowType,
  workflowData,
  onComplete,
  onError,
  autoStart = false,
  className
}: WorkflowExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState<WorkflowProgressType | null>(null)
  const [result, setResult] = useState<any>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  
  const feedbackManager = useFeedbackManager()

  useEffect(() => {
    if (autoStart && !isExecuting && !result && !executionError) {
      handleStart()
    }
  }, [autoStart])

  const generateExecutionId = () => {
    return `exec_${workflowType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const handleStart = useCallback(async () => {
    if (isExecuting) return

    const newExecutionId = generateExecutionId()
    setExecutionId(newExecutionId)
    setIsExecuting(true)
    setIsPaused(false)
    setProgress(null)
    setResult(null)
    setExecutionError(null)

    feedbackManager.showInfo(
      'Workflow Started',
      `Starting ${getWorkflowDisplayName(workflowType)} workflow...`
    )

    const options: WorkflowOptions = {
      onProgress: (progressData) => {
        setProgress(progressData)
      },
      onError: (error, step) => {
        setExecutionError(error)
        setIsExecuting(false)
        onError?.(error)
        feedbackManager.showError(
          'Workflow Error',
          `Error in ${step}: ${error}`,
          {
            actions: [
              {
                label: 'Retry',
                action: handleRetry,
                variant: 'default'
              },
              {
                label: 'Cancel',
                action: handleStop,
                variant: 'outline'
              }
            ]
          }
        )
      },
      onComplete: (workflowResult) => {
        setResult(workflowResult)
        setIsExecuting(false)
        onComplete?.(workflowResult)
        feedbackManager.showSuccess(
          'Workflow Complete',
          `${getWorkflowDisplayName(workflowType)} completed successfully!`
        )
      },
      retryAttempts: 3,
      retryDelay: 1000
    }

    try {
      let workflowResult
      
      switch (workflowType) {
        case 'user-onboarding':
          workflowResult = await workflowOrchestrator.executeUserOnboarding(workflowData, options)
          break
        case 'authentication':
          workflowResult = await workflowOrchestrator.executeAuthentication(workflowData, options)
          break
        case 'record-management':
          workflowResult = await workflowOrchestrator.executeRecordManagement(
            workflowData.recordData,
            workflowData.userId,
            workflowData.password,
            options
          )
          break
        case 'consent-management':
          workflowResult = await workflowOrchestrator.executeConsentManagement(
            workflowData.consentData,
            workflowData.patientId,
            options
          )
          break
        case 'record-access':
          workflowResult = await workflowOrchestrator.executeRecordAccess(
            workflowData.recordId,
            workflowData.userId,
            workflowData.password,
            options
          )
          break
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`)
      }

      if (!workflowResult.success) {
        throw new Error(workflowResult.error || 'Workflow execution failed')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setExecutionError(errorMessage)
      setIsExecuting(false)
      onError?.(errorMessage)
      
      feedbackManager.showError(
        'Workflow Failed',
        errorMessage,
        {
          actions: [
            {
              label: 'Retry',
              action: handleRetry,
              variant: 'default'
            }
          ]
        }
      )
    }
  }, [workflowType, workflowData, isExecuting, onComplete, onError, feedbackManager])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    feedbackManager.showWarning(
      'Workflow Paused',
      'The workflow has been paused. Click Resume to continue.'
    )
  }, [feedbackManager])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    feedbackManager.showInfo(
      'Workflow Resumed',
      'The workflow has been resumed.'
    )
  }, [feedbackManager])

  const handleStop = useCallback(() => {
    setIsExecuting(false)
    setIsPaused(false)
    setProgress(null)
    setExecutionError(null)
    feedbackManager.showWarning(
      'Workflow Stopped',
      'The workflow has been stopped.'
    )
  }, [feedbackManager])

  const handleRetry = useCallback(() => {
    setExecutionError(null)
    handleStart()
  }, [handleStart])

  const getWorkflowDisplayName = (type: WorkflowType): string => {
    switch (type) {
      case 'user-onboarding':
        return 'User Registration'
      case 'authentication':
        return 'User Authentication'
      case 'record-management':
        return 'Medical Record Management'
      case 'consent-management':
        return 'Consent Management'
      case 'record-access':
        return 'Record Access'
      default:
        return 'Workflow'
    }
  }

  const getWorkflowSteps = (type: WorkflowType) => {
    switch (type) {
      case 'user-onboarding':
        return [
          { id: 'keys', title: 'Generate Keys', description: 'Creating quantum-resistant cryptographic keys' },
          { id: 'register', title: 'Register User', description: 'Registering with blockchain network' },
          { id: 'approval', title: 'Await Approval', description: 'Waiting for role-based approval' }
        ]
      case 'authentication':
        return [
          { id: 'validate', title: 'Validate Keys', description: 'Checking stored cryptographic keys' },
          { id: 'authenticate', title: 'Authenticate', description: 'Signing authentication challenge' }
        ]
      case 'record-management':
        return [
          { id: 'encrypt', title: 'Encrypt Record', description: 'Encrypting medical record client-side' },
          { id: 'upload', title: 'Upload to IPFS', description: 'Storing encrypted file in decentralized storage' },
          { id: 'blockchain', title: 'Store Metadata', description: 'Recording metadata on blockchain' }
        ]
      case 'consent-management':
        return [
          { id: 'validate', title: 'Validate Provider', description: 'Verifying healthcare provider identity' },
          { id: 'create', title: 'Create Consent', description: 'Creating consent token on blockchain' }
        ]
      case 'record-access':
        return [
          { id: 'permission', title: 'Check Permissions', description: 'Verifying access permissions' },
          { id: 'retrieve', title: 'Retrieve File', description: 'Downloading encrypted file from IPFS' },
          { id: 'decrypt', title: 'Decrypt Record', description: 'Decrypting medical record client-side' }
        ]
      default:
        return []
    }
  }

  const getCurrentStepId = () => {
    if (!progress) return ''
    const steps = getWorkflowSteps(workflowType)
    const currentIndex = Math.min(progress.currentStep - 1, steps.length - 1)
    return steps[currentIndex]?.id || ''
  }

  const getStepsWithStatus = () => {
    const steps = getWorkflowSteps(workflowType)
    return steps.map((step, index) => ({
      ...step,
      status: (!progress ? 'pending' :
        executionError && index === progress.currentStep - 1 ? 'error' :
        index < progress.currentStep - 1 ? 'complete' :
        index === progress.currentStep - 1 ? 'active' : 'pending') as "pending" | "error" | "active" | "complete",
      errorMessage: executionError && progress && index === progress.currentStep - 1 ? executionError : undefined
    }))
  }

  return (
    <WorkflowErrorBoundary>
      <div className={className}>
        <FeedbackManager
          feedbacks={feedbackManager.feedbacks}
          onDismiss={feedbackManager.removeFeedback}
          position="top-right"
        />

        <BlurFade delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AnimatedShinyText className="inline-flex items-center justify-center">
                      {getWorkflowDisplayName(workflowType)}
                    </AnimatedShinyText>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {executionId && (
                      <Badge variant="outline" className="text-xs mr-2">
                        ID: {executionId.split('_').pop()}
                      </Badge>
                    )}
                    Execute the complete {getWorkflowDisplayName(workflowType).toLowerCase()} workflow
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isExecuting && !result && !executionError && (
                    <Button onClick={handleStart} className="gap-2">
                      <Play className="w-4 h-4" />
                      Start
                    </Button>
                  )}
                  
                  {isExecuting && !isPaused && (
                    <Button onClick={handlePause} variant="outline" className="gap-2">
                      <Pause className="w-4 h-4" />
                      Pause
                    </Button>
                  )}
                  
                  {isExecuting && isPaused && (
                    <Button onClick={handleResume} className="gap-2">
                      <Play className="w-4 h-4" />
                      Resume
                    </Button>
                  )}
                  
                  {isExecuting && (
                    <Button onClick={handleStop} variant="destructive" className="gap-2">
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  )}
                  
                  {(executionError || result) && (
                    <Button onClick={handleRetry} variant="outline" className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="progress" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="result">Result</TabsTrigger>
                </TabsList>

                <TabsContent value="progress" className="space-y-4">
                  {progress && (
                    <WorkflowProgress
                      progress={progress}
                      title="Workflow Execution"
                      description={`Executing ${getWorkflowDisplayName(workflowType)}`}
                      onCancel={isExecuting ? handleStop : undefined}
                      onRetry={executionError ? handleRetry : undefined}
                    />
                  )}
                  
                  {!progress && !isExecuting && !result && !executionError && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Click Start to begin the workflow</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="steps" className="space-y-4">
                  <MultiStepProgress
                    steps={getStepsWithStatus()}
                    currentStepId={getCurrentStepId()}
                  />
                </TabsContent>

                <TabsContent value="result" className="space-y-4">
                  {result && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Workflow Completed Successfully</span>
                      </div>
                      
                      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CardContent className="p-4">
                          <pre className="text-sm overflow-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  {executionError && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Workflow Failed</span>
                      </div>
                      
                      <Card className="bg-destructive/5 border-destructive/20">
                        <CardContent className="p-4">
                          <p className="text-sm text-destructive">{executionError}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  {!result && !executionError && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Workflow result will appear here</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Workflow Feedback */}
        {(result || executionError) && (
          <WorkflowFeedback
            workflowName={getWorkflowDisplayName(workflowType)}
            isActive={isExecuting}
            onFeedbackSubmit={(feedback) => {
              console.log('Workflow feedback:', feedback)
              feedbackManager.showSuccess(
                'Feedback Submitted',
                'Thank you for your feedback!'
              )
            }}
            className="mt-4"
          />
        )}
      </div>
    </WorkflowErrorBoundary>
  )
}