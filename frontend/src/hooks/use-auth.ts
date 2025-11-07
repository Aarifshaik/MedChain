import { useAuth as useAuthContext } from '@/contexts/auth-context'

// Re-export the useAuth hook for convenience
export const useAuth = useAuthContext

// Export types
export type { AuthContextType, LoginCredentials } from '@/contexts/auth-context'