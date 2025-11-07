"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  X,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  Zap
} from "lucide-react"

export type FeedbackType = 'success' | 'error' | 'warning' | 'info'
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical'

export interface UserFeedback {
  id: string
  type: FeedbackType
  priority: FeedbackPriority
  title: string
  message: string
  timestamp: Date
  duration?: number // Auto-dismiss after this many ms
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  }>
  dismissible?: boolean
  persistent?: boolean // Don't auto-dismiss
}

interface UserFeedbackProps {
  feedback: UserFeedback
  onDismiss?: (id: string) => void
  onAction?: (id: string, actionIndex: number) => void
  className?: string
}

export function UserFeedbackCard({ 
  feedback, 
  onDismiss, 
  onAction, 
  className 
}: UserFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (feedback.duration && !feedback.persistent) {
      setTimeRemaining(feedback.duration)
      
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 100) {
            clearInterval(interval)
            handleDismiss()
            return null
          }
          return prev - 100
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [feedback.duration, feedback.persistent])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(feedback.id), 300)
  }, [feedback.id, onDismiss])

  const handleAction = (actionIndex: number) => {
    feedback.actions?.[actionIndex]?.action()
    onAction?.(feedback.id, actionIndex)
  }

  const getIcon = () => {
    switch (feedback.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getVariant = (): "default" | "destructive" => {
    return feedback.type === 'error' ? 'destructive' : 'default'
  }

  const getPriorityColor = () => {
    switch (feedback.priority) {
      case 'critical':
        return 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800'
      case 'low':
        return 'bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-800'
    }
  }

  if (!isVisible) return null

  return (
    <BlurFade delay={0.1}>
      <Alert variant={getVariant()} className={`${className} ${getPriorityColor()}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getIcon()}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{feedback.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {feedback.priority}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {feedback.type}
                </Badge>
              </div>
              
              <AlertDescription className="text-sm">
                {feedback.message}
              </AlertDescription>

              {/* Auto-dismiss progress */}
              {timeRemaining !== null && feedback.duration && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Auto-dismiss in {Math.ceil(timeRemaining / 1000)}s</span>
                    <Clock className="w-3 h-3" />
                  </div>
                  <Progress 
                    value={(timeRemaining / feedback.duration) * 100} 
                    className="h-1"
                  />
                </div>
              )}

              {/* Action Buttons */}
              {feedback.actions && feedback.actions.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {feedback.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant || 'outline'}
                      onClick={() => handleAction(index)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground">
                {feedback.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          {feedback.dismissible !== false && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Alert>
    </BlurFade>
  )
}

interface FeedbackManagerProps {
  feedbacks: UserFeedback[]
  onDismiss?: (id: string) => void
  onAction?: (id: string, actionIndex: number) => void
  maxVisible?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  className?: string
}

export function FeedbackManager({
  feedbacks,
  onDismiss,
  onAction,
  maxVisible = 5,
  position = 'top-right',
  className
}: FeedbackManagerProps) {
  const visibleFeedbacks = feedbacks.slice(0, maxVisible)
  const hiddenCount = Math.max(0, feedbacks.length - maxVisible)

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50'
      case 'top-left':
        return 'fixed top-4 left-4 z-50'
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50'
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50'
      case 'center':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50'
      default:
        return 'fixed top-4 right-4 z-50'
    }
  }

  if (feedbacks.length === 0) return null

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <div className="space-y-3 w-96 max-w-[calc(100vw-2rem)]">
        {visibleFeedbacks.map((feedback) => (
          <UserFeedbackCard
            key={feedback.id}
            feedback={feedback}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
        
        {hiddenCount > 0 && (
          <Card className="bg-muted">
            <CardContent className="p-3">
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 mr-2" />
                {hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface WorkflowFeedbackProps {
  workflowName: string
  isActive: boolean
  onFeedbackSubmit?: (feedback: { rating: 'positive' | 'negative'; comment: string }) => void
  className?: string
}

export function WorkflowFeedback({ 
  workflowName, 
  isActive, 
  onFeedbackSubmit, 
  className 
}: WorkflowFeedbackProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isActive && !showFeedback) {
      // Show feedback form after workflow completion
      const timer = setTimeout(() => setShowFeedback(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [isActive, showFeedback])

  const handleSubmit = async () => {
    if (!rating) return

    setIsSubmitting(true)
    try {
      await onFeedbackSubmit?.({ rating, comment })
      setShowFeedback(false)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!showFeedback || isActive) return null

  return (
    <BlurFade delay={0.2}>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <AnimatedShinyText className="inline-flex items-center justify-center">
              How was your experience?
            </AnimatedShinyText>
          </CardTitle>
          <CardDescription>
            Help us improve the {workflowName} workflow
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Rating Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              variant={rating === 'positive' ? 'default' : 'outline'}
              onClick={() => setRating('positive')}
              className="flex-1"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Good
            </Button>
            <Button
              variant={rating === 'negative' ? 'destructive' : 'outline'}
              onClick={() => setRating('negative')}
              className="flex-1"
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Needs Work
            </Button>
          </div>

          {/* Comment Field */}
          {rating && (
            <div className="space-y-2">
              <Label htmlFor="feedback-comment">
                {rating === 'positive' ? 'What did you like?' : 'What can we improve?'}
              </Label>
              <Textarea
                id="feedback-comment"
                placeholder={
                  rating === 'positive' 
                    ? 'Tell us what worked well...' 
                    : 'Tell us what could be better...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Submit Button */}
          {rating && (
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-pulse" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowFeedback(false)}
              >
                Skip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  )
}

// Hook for managing feedback state
export function useFeedbackManager() {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([])

  const addFeedback = useCallback((feedback: Omit<UserFeedback, 'id' | 'timestamp'>) => {
    const newFeedback: UserFeedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    
    setFeedbacks(prev => [newFeedback, ...prev])
    return newFeedback.id
  }, [])

  const removeFeedback = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id))
  }, [])

  const clearAllFeedbacks = useCallback(() => {
    setFeedbacks([])
  }, [])

  // Convenience methods for different feedback types
  const showSuccess = useCallback((title: string, message: string, options?: Partial<UserFeedback>) => {
    return addFeedback({
      type: 'success',
      priority: 'medium',
      title,
      message,
      duration: 5000,
      dismissible: true,
      ...options
    })
  }, [addFeedback])

  const showError = useCallback((title: string, message: string, options?: Partial<UserFeedback>) => {
    return addFeedback({
      type: 'error',
      priority: 'high',
      title,
      message,
      persistent: true,
      dismissible: true,
      ...options
    })
  }, [addFeedback])

  const showWarning = useCallback((title: string, message: string, options?: Partial<UserFeedback>) => {
    return addFeedback({
      type: 'warning',
      priority: 'medium',
      title,
      message,
      duration: 8000,
      dismissible: true,
      ...options
    })
  }, [addFeedback])

  const showInfo = useCallback((title: string, message: string, options?: Partial<UserFeedback>) => {
    return addFeedback({
      type: 'info',
      priority: 'low',
      title,
      message,
      duration: 6000,
      dismissible: true,
      ...options
    })
  }, [addFeedback])

  return {
    feedbacks,
    addFeedback,
    removeFeedback,
    clearAllFeedbacks,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}