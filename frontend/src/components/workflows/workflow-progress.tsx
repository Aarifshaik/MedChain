"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { BlurFade } from "@/components/ui/blur-fade"
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Clock, 
  ArrowRight,
  RefreshCw,
  X
} from "lucide-react"
import { WorkflowProgress as WorkflowProgressType } from "@/lib/workflows/workflow-orchestrator"

interface WorkflowProgressProps {
  progress: WorkflowProgressType | null
  title: string
  description?: string
  onCancel?: () => void
  onRetry?: () => void
  showSteps?: boolean
  className?: string
}

export function WorkflowProgress({
  progress,
  title,
  description,
  onCancel,
  onRetry,
  showSteps = true,
  className
}: WorkflowProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    if (progress) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress.progress)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [progress?.progress])

  if (!progress) {
    return null
  }

  const getStatusIcon = () => {
    if (progress.hasError) {
      return <AlertCircle className="w-5 h-5 text-destructive" />
    }
    if (progress.isComplete) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    }
    return <Loader2 className="w-5 h-5 animate-spin text-primary" />
  }

  const getStatusColor = () => {
    if (progress.hasError) return "destructive"
    if (progress.isComplete) return "default"
    return "secondary"
  }

  return (
    <BlurFade delay={0.1}>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && (
                  <CardDescription className="mt-1">{description}</CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor()}>
                {progress.hasError ? 'Error' : progress.isComplete ? 'Complete' : 'In Progress'}
              </Badge>
              {onCancel && !progress.isComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Visualization */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {progress.stepDescription}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(animatedProgress)}%
                </span>
              </div>
              <Progress value={animatedProgress} className="h-2" />
            </div>
            
            <AnimatedCircularProgressBar
              value={animatedProgress}
              max={100}
              min={0}
              gaugePrimaryColor={progress.hasError ? "#ef4444" : progress.isComplete ? "#22c55e" : "#3b82f6"}
              gaugeSecondaryColor="#e5e7eb"
              className="w-16 h-16"
            />
          </div>

          {/* Step Progress */}
          {showSteps && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Step {progress.currentStep} of {progress.totalSteps}
              </span>
              {progress.currentStep < progress.totalSteps && (
                <>
                  <ArrowRight className="w-3 h-3" />
                  <span>Next: Step {progress.currentStep + 1}</span>
                </>
              )}
            </div>
          )}

          {/* Error Display */}
          {progress.hasError && progress.errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {progress.errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {(progress.hasError || progress.isComplete) && (
            <div className="flex gap-2 pt-2">
              {progress.hasError && onRetry && (
                <Button onClick={onRetry} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
              {progress.isComplete && (
                <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              )}
            </div>
          )}

          {/* Success Message */}
          {progress.isComplete && !progress.hasError && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Workflow completed successfully!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  )
}

interface MultiStepProgressProps {
  steps: Array<{
    id: string
    title: string
    description?: string
    status: 'pending' | 'active' | 'complete' | 'error'
    errorMessage?: string
  }>
  currentStepId: string
  className?: string
}

export function MultiStepProgress({ steps, currentStepId, className }: MultiStepProgressProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStepId)
  
  return (
    <div className={className}>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId
          const isComplete = step.status === 'complete'
          const hasError = step.status === 'error'
          const isPending = step.status === 'pending'
          
          return (
            <BlurFade key={step.id} delay={index * 0.1}>
              <div className="flex items-start gap-4">
                {/* Step Indicator */}
                <div className="flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isComplete ? 'bg-green-600 text-white' : ''}
                    ${hasError ? 'bg-destructive text-destructive-foreground' : ''}
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isPending ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : hasError ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      w-0.5 h-8 mt-2
                      ${index < currentIndex ? 'bg-green-600' : 'bg-muted'}
                    `} />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                      {step.title}
                    </h4>
                    <Badge 
                      variant={
                        isComplete ? 'default' : 
                        hasError ? 'destructive' : 
                        isActive ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {step.status}
                    </Badge>
                  </div>
                  
                  {step.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {step.description}
                    </p>
                  )}
                  
                  {hasError && step.errorMessage && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {step.errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </BlurFade>
          )
        })}
      </div>
    </div>
  )
}