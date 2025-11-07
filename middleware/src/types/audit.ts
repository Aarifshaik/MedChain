/**
 * Audit-related type definitions for the Healthcare DLT system
 */

export interface AuditEntry {
  entryId: string;
  eventType: AuditEventType;
  userId: string;
  resourceId?: string;
  timestamp: string;
  details: Record<string, any>;
  signature: string;
  transactionId: string;
  mspId: string;
  blockNumber?: number;
  isImmutable: boolean;
}

export enum AuditEventType {
  USER_REGISTRATION = 'USER_REGISTRATION',
  USER_APPROVAL = 'USER_APPROVAL',
  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_ACCESSED = 'RECORD_ACCESSED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  AUDIT_QUERY = 'AUDIT_QUERY',
  COMPLIANCE_REPORT_GENERATED = 'COMPLIANCE_REPORT_GENERATED',
  SYSTEM_ACCESS = 'SYSTEM_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT'
}

export interface AuditFilters {
  eventType?: AuditEventType;
  userId?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  mspId?: string;
  page?: number;
  limit?: number;
}

export interface AuditTrailResponse {
  success: boolean;
  totalCount: number;
  filteredCount: number;
  entries: AuditEntry[];
  filters: AuditFilters;
}

export interface ComplianceReport {
  reportId: string;
  reportType: ComplianceReportType;
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedBy: string;
  signature: string;
}

export enum ComplianceReportType {
  HIPAA_COMPLIANCE = 'HIPAA_COMPLIANCE',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  USER_ACTIVITY = 'USER_ACTIVITY',
  CONSENT_MANAGEMENT = 'CONSENT_MANAGEMENT',
  SYSTEM_SECURITY = 'SYSTEM_SECURITY'
}

export interface ComplianceReportResponse {
  success: boolean;
  reportId: string;
  metadata: ComplianceReport;
  report: any;
}

export interface AuditExportRequest {
  exportFormat: 'JSON' | 'CSV';
  filters: AuditFilters;
  signature: string;
}

export interface AuditExportResponse {
  success: boolean;
  exportId: string;
  format: string;
  recordCount: number;
  data: string;
  exportedAt: string;
}

export interface LogEventRequest {
  eventType: AuditEventType;
  userId: string;
  resourceId?: string;
  details: Record<string, any>;
  signature: string;
}

export interface LogEventResponse {
  success: boolean;
  auditId: string;
  timestamp: string;
  message: string;
}