"use client"

import { useState } from "react"
import { UserRole } from "@/types"
import { RoleSelector } from "./role-selector"
import { RoleRegistrationForm } from "./role-registration-form"

interface RegistrationFlowProps {
  onSuccess?: (data: any) => void
}

export function RegistrationFlow({ onSuccess }: RegistrationFlowProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [registrationComplete, setRegistrationComplete] = useState(false)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleRegistrationSuccess = (data: any) => {
    setRegistrationComplete(true)
    onSuccess?.(data)
  }

  const handleBack = () => {
    setSelectedRole(null)
    setRegistrationComplete(false)
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Your registration has been submitted successfully. You will receive an email notification once your account is approved.
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (selectedRole) {
    return (
      <RoleRegistrationForm
        selectedRole={selectedRole}
        onSuccess={handleRegistrationSuccess}
        onBack={handleBack}
      />
    )
  }

  return <RoleSelector onRoleSelect={handleRoleSelect} />
}