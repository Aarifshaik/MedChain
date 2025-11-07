export const APP_CONFIG = {
  name: "Healthcare DLT",
  description: "Quantum-Resistant Medical Records Management",
  version: "1.0.0",
  
  // User roles in the system
  userRoles: {
    PATIENT: "patient",
    DOCTOR: "doctor", 
    LABORATORY: "laboratory",
    INSURER: "insurer",
    AUDITOR: "auditor",
    SYSTEM_ADMIN: "system_admin",
  } as const,

  // Navigation routes
  routes: {
    home: "/",
    dashboard: "/dashboard",
    records: "/records",
    upload: "/records/upload",
    consent: "/consent",
    audit: "/audit",
    users: "/users",
    approvals: "/approvals",
    settings: "/settings",
    claims: "/claims",
    compliance: "/compliance",
    login: "/auth/login",
    register: "/auth/register",
  } as const,

  // Cryptographic settings
  crypto: {
    keyExchangeAlgorithm: "CRYSTALS-Kyber",
    signatureAlgorithm: "CRYSTALS-Dilithium", 
    encryptionAlgorithm: "AES-256-GCM",
  } as const,

  // Theme configuration
  theme: {
    defaultTheme: "system",
    enableSystem: true,
    disableTransitionOnChange: false,
  } as const,

  // Data source configuration
  dataSource: {
    // Environment-based defaults
    useMockData: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false',
    apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    fallbackToMock: process.env.NEXT_PUBLIC_FALLBACK_TO_MOCK !== 'false',
    showMockIndicator: process.env.NEXT_PUBLIC_SHOW_MOCK_INDICATOR !== 'false',
    retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000'),
  } as const,
}

export type UserRole = typeof APP_CONFIG.userRoles[keyof typeof APP_CONFIG.userRoles]
export type AppRoute = typeof APP_CONFIG.routes[keyof typeof APP_CONFIG.routes]