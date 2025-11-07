/**
 * Audit Service
 * 
 * Handles audit trail operations, compliance reporting, and audit data export
 * for the Healthcare DLT system.
 */

import { blockchainManager } from '../utils/blockchainManager.js';
import { logger } from '../utils/logger.js';
import {
  AuditEntry,
  AuditEventType,
  AuditFilters,
  AuditTrailResponse,
  ComplianceReportType,
  ComplianceReportResponse,
  AuditExportRequest,
  AuditExportResponse,
  LogEventRequest,
  LogEventResponse
} from '../types/audit.js';

export class AuditService {
  private readonly contractName = 'AuditContract';
  private readonly channelName = 'healthcare-channel';

  /**
   * Log an audit event to the blockchain
   * @param request - Log event request
   * @returns Promise<LogEventResponse>
   */
  async logEvent(request: LogEventRequest): Promise<LogEventResponse> {
    try {
      logger.info('Logging audit event', {
        eventType: request.eventType,
        userId: request.userId,
        resourceId: request.resourceId
      });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        this.contractName,
        'logEvent',
        [
          request.eventType,
          request.userId,
          request.resourceId || '',
          JSON.stringify(request.details),
          request.signature
        ]
      );

      const response = JSON.parse(result.result);
      
      logger.info('Audit event logged successfully', {
        auditId: response.auditId,
        eventType: request.eventType
      });

      return response;
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw new Error(`Failed to log audit event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit trail with filtering and pagination
   * @param filters - Filter criteria
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<AuditTrailResponse>
   */
  async getAuditTrail(filters: AuditFilters, auditorSignature: string): Promise<AuditTrailResponse> {
    try {
      logger.info('Retrieving audit trail', { filters });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        this.contractName,
        'getAuditTrail',
        [
          JSON.stringify(filters),
          auditorSignature
        ]
      );

      const response = JSON.parse(result.result);
      
      logger.info('Audit trail retrieved successfully', {
        totalCount: response.totalCount,
        filteredCount: response.filteredCount
      });

      return response;
    } catch (error) {
      logger.error('Failed to retrieve audit trail:', error);
      throw new Error(`Failed to retrieve audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate compliance report
   * @param reportType - Type of compliance report
   * @param startDate - Report start date (ISO string)
   * @param endDate - Report end date (ISO string)
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<ComplianceReportResponse>
   */
  async generateComplianceReport(
    reportType: ComplianceReportType,
    startDate: string,
    endDate: string,
    auditorSignature: string
  ): Promise<ComplianceReportResponse> {
    try {
      logger.info('Generating compliance report', {
        reportType,
        startDate,
        endDate
      });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        this.contractName,
        'generateComplianceReport',
        [
          reportType,
          startDate,
          endDate,
          auditorSignature
        ]
      );

      const response = JSON.parse(result.result);
      
      logger.info('Compliance report generated successfully', {
        reportId: response.reportId,
        reportType
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw new Error(`Failed to generate compliance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export audit data for compliance purposes
   * @param request - Export request
   * @returns Promise<AuditExportResponse>
   */
  async exportAuditData(request: AuditExportRequest): Promise<AuditExportResponse> {
    try {
      logger.info('Exporting audit data', {
        format: request.exportFormat,
        filters: request.filters
      });

      const blockchainService = blockchainManager.getBlockchainService();
      const result = await blockchainService.submitTransaction(
        this.contractName,
        'exportAuditData',
        [
          request.exportFormat,
          JSON.stringify(request.filters),
          request.signature
        ]
      );

      const response = JSON.parse(result.result);
      
      logger.info('Audit data exported successfully', {
        exportId: response.exportId,
        format: request.exportFormat,
        recordCount: response.recordCount
      });

      return response;
    } catch (error) {
      logger.error('Failed to export audit data:', error);
      throw new Error(`Failed to export audit data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query audit entries by event type
   * @param eventType - Event type to filter by
   * @param limit - Maximum number of entries to return
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<AuditEntry[]>
   */
  async getAuditEntriesByEventType(
    eventType: AuditEventType,
    limit: number = 100,
    auditorSignature: string
  ): Promise<AuditEntry[]> {
    const filters: AuditFilters = {
      eventType,
      limit
    };

    const response = await this.getAuditTrail(filters, auditorSignature);
    return response.entries;
  }

  /**
   * Query audit entries by user ID
   * @param userId - User ID to filter by
   * @param limit - Maximum number of entries to return
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<AuditEntry[]>
   */
  async getAuditEntriesByUser(
    userId: string,
    limit: number = 100,
    auditorSignature: string
  ): Promise<AuditEntry[]> {
    const filters: AuditFilters = {
      userId,
      limit
    };

    const response = await this.getAuditTrail(filters, auditorSignature);
    return response.entries;
  }

  /**
   * Query audit entries by resource ID
   * @param resourceId - Resource ID to filter by
   * @param limit - Maximum number of entries to return
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<AuditEntry[]>
   */
  async getAuditEntriesByResource(
    resourceId: string,
    limit: number = 100,
    auditorSignature: string
  ): Promise<AuditEntry[]> {
    const filters: AuditFilters = {
      resourceId,
      limit
    };

    const response = await this.getAuditTrail(filters, auditorSignature);
    return response.entries;
  }

  /**
   * Query audit entries by date range
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @param limit - Maximum number of entries to return
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<AuditEntry[]>
   */
  async getAuditEntriesByDateRange(
    startDate: string,
    endDate: string,
    limit: number = 100,
    auditorSignature: string
  ): Promise<AuditEntry[]> {
    const filters: AuditFilters = {
      startDate,
      endDate,
      limit
    };

    const response = await this.getAuditTrail(filters, auditorSignature);
    return response.entries;
  }

  /**
   * Get audit statistics for a given time period
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @param auditorSignature - Auditor's digital signature
   * @returns Promise<any>
   */
  async getAuditStatistics(
    startDate: string,
    endDate: string,
    auditorSignature: string
  ): Promise<any> {
    try {
      const filters: AuditFilters = {
        startDate,
        endDate,
        limit: 10000 // Get all entries for statistics
      };

      const response = await this.getAuditTrail(filters, auditorSignature);
      const entries = response.entries;

      // Calculate statistics
      const statistics = {
        totalEvents: entries.length,
        eventsByType: {} as Record<string, number>,
        eventsByUser: {} as Record<string, number>,
        eventsByMSP: {} as Record<string, number>,
        timeRange: {
          startDate,
          endDate
        }
      };

      entries.forEach(entry => {
        // Count by event type
        statistics.eventsByType[entry.eventType] = 
          (statistics.eventsByType[entry.eventType] || 0) + 1;

        // Count by user
        statistics.eventsByUser[entry.userId] = 
          (statistics.eventsByUser[entry.userId] || 0) + 1;

        // Count by MSP
        statistics.eventsByMSP[entry.mspId] = 
          (statistics.eventsByMSP[entry.mspId] || 0) + 1;
      });

      return statistics;
    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      throw new Error(`Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate audit filters
   * @param filters - Filters to validate
   * @throws Error if filters are invalid
   */
  validateFilters(filters: AuditFilters): void {
    // Validate date range
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format. Use ISO date strings.');
      }
      
      if (start >= end) {
        throw new Error('Start date must be before end date');
      }
    }

    // Validate pagination
    if (filters.page && filters.page < 1) {
      throw new Error('Page number must be greater than 0');
    }

    if (filters.limit && (filters.limit < 1 || filters.limit > 1000)) {
      throw new Error('Limit must be between 1 and 1000');
    }

    // Validate event type
    if (filters.eventType && !Object.values(AuditEventType).includes(filters.eventType)) {
      throw new Error(`Invalid event type: ${filters.eventType}`);
    }
  }

  /**
   * Validate compliance report type
   * @param reportType - Report type to validate
   * @throws Error if report type is invalid
   */
  validateReportType(reportType: string): void {
    if (!Object.values(ComplianceReportType).includes(reportType as ComplianceReportType)) {
      throw new Error(`Invalid report type: ${reportType}`);
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();