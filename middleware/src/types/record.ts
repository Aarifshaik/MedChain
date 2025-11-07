export interface MedicalRecord {
  recordId: string;
  patientId: string;
  providerId: string;
  recordType: RecordType;
  ipfsHash: string;
  encryptionKeyHash?: string;
  metadata: RecordMetadata;
  signature: string;
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface RecordMetadata {
  title: string;
  description: string;
  createdAt: string;
  fileSize: number;
  mimeType: string;
  tags?: string[];
}

export type RecordType = 
  | 'diagnosis' 
  | 'prescription' 
  | 'lab_result' 
  | 'imaging' 
  | 'consultation_note';

export interface RecordCreateRequest {
  recordId: string;
  patientId: string;
  ipfsHash: string;
  metadata: {
    title: string;
    description: string;
    recordType: RecordType;
    fileSize: number;
    mimeType: string;
    encryptionKeyHash?: string;
    tags?: string[];
  };
  providerSignature: string;
}

export interface RecordAccessRequest {
  recordId: string;
  providerId: string;
  providerSignature: string;
}

export interface RecordAccessResult {
  success: boolean;
  recordId: string;
  patientId: string;
  providerId: string;
  recordType: RecordType;
  ipfsHash: string;
  encryptionKeyHash?: string;
  metadata: RecordMetadata;
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  accessReason: string;
  message: string;
}

export interface RecordListItem {
  recordId: string;
  patientId: string;
  providerId: string;
  recordType: RecordType;
  metadata: RecordMetadata;
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface RecordQueryFilters {
  patientId?: string;
  providerId?: string;
  recordType?: RecordType;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface RecordUploadRequest {
  patientId: string;
  encryptedFile: Buffer;
  metadata: {
    title: string;
    description: string;
    recordType: RecordType;
    mimeType: string;
    encryptionKeyHash?: string;
    tags?: string[];
  };
  providerSignature: string;
}

export interface RecordUploadResult {
  success: boolean;
  recordId: string;
  patientId: string;
  providerId: string;
  recordType: RecordType;
  ipfsHash: string;
  createdAt: string;
  message: string;
}