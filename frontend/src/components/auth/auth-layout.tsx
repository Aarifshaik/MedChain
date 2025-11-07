import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/ui/blur-fade"
import { Activity, Shield } from "lucide-react"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
}

export function AuthLayout({ 
  children, 
  title = "Healthcare DLT", 
  description = "Quantum-resistant healthcare data management",
  className 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <BlurFade delay={0.1}>
        <div className={className}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Quantum-Resistant
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground">{description}</p>
          </div>

          {/* Content */}
          {children}

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Protected by NIST Post-Quantum Cryptography Standards</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              CRYSTALS-Kyber • CRYSTALS-Dilithium • AES-256-GCM
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  )
}