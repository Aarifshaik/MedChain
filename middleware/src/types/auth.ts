export interface User {
  userId: string;
  role: UserRole;
  publicKeys: {
    kyberPublicKey: string;
    dilithiumPublicKey: string;
  };
  registrationStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  createdAt: Date;
  approvedAt?: Date;
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  LABORATORY = 'laboratory',
  INSURER = 'insurer',
  AUDITOR = 'auditor',
  SYSTEM_ADMIN = 'system_admin'
}

export interface AuthRequest {
  userId: string;
  nonce: string;
  signature: string;
}

export interface RegisterRequest {
  userId: string;
  role: UserRole;
  publicKeys: {
    kyberPublicKey: string;
    dilithiumPublicKey: string;
  };
  approverSignature?: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: Date;
  user: {
    userId: string;
    role: string;
  };
}

export interface NonceResponse {
  nonce: string;
  expiresIn: number;
  timestamp: string;
}

export interface ProfileResponse {
  user: Omit<User, 'publicKeys'>;
  session: {
    issuedAt: Date;
    expiresAt: Date;
  };
}