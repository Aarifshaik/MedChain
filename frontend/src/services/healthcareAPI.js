// Healthcare DLT API Service
// Handles communication with the blockchain middleware

class HealthcareAPI {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setAuthToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear authentication token
  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Make authenticated API request
  async makeRequest(endpoint, options = {}) {
    const url = ${this.baseURL};
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = Bearer ;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(HTTP error! status: );
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async getHealth() {
    return this.makeRequest('/health');
  }

  // Query blockchain data
  async queryData(selector, options = {}) {
    const body = {
      selector,
      sort: options.sort || [{ createdAt: 'desc' }],
      limit: options.limit || 20,
      ...options
    };

    return this.makeRequest('/api/query', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // Submit transaction
  async submitTransaction(contractName, functionName, args) {
    const body = {
      contractName,
      functionName,
      args
    };

    return this.makeRequest('/api/invoke', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // Patient-specific queries
  async getPatientRecords(patientId) {
    return this.queryData({ patientId });
  }

  async getPatientDiagnoses(patientId) {
    return this.queryData({
      patientId,
      recordType: 'diagnosis'
    });
  }

  async getPatientTreatments(patientId) {
    return this.queryData({
      patientId,
      recordType: 'treatment'
    });
  }

  async getPatientConsents(patientId) {
    return this.queryData({
      patientId,
      recordType: 'consent'
    });
  }

  // Department queries
  async getDepartmentRecords(department, recordType = null) {
    const selector = { department };
    if (recordType) {
      selector.recordType = recordType;
    }
    return this.queryData(selector);
  }

  // Consent management
  async getActiveConsents() {
    return this.queryData({
      recordType: 'consent',
      status: 'active'
    });
  }

  async getExpiringConsents(days = 7) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return this.queryData({
      recordType: 'consent',
      status: 'active',
      expirationTime: {
        '$gte': now.toISOString(),
        '$lte': futureDate.toISOString()
      }
    });
  }

  // Create new records
  async createPatientRecord(patientData) {
    return this.submitTransaction(
      'HealthcareContract',
      'createPatientRecord',
      [patientData.patientId, JSON.stringify(patientData)]
    );
  }

  async createConsentRecord(consentData) {
    return this.submitTransaction(
      'HealthcareContract',
      'createConsentRecord',
      [consentData.patientId, JSON.stringify(consentData)]
    );
  }

  async createTreatmentRecord(treatmentData) {
    return this.submitTransaction(
      'HealthcareContract',
      'createTreatmentRecord',
      [treatmentData.patientId, JSON.stringify(treatmentData)]
    );
  }

  // Advanced queries
  async searchRecords(searchTerm, recordType = null) {
    const selector = {
      '$or': [
        { name: { '$regex': (?i).*.* } },
        { diagnosis: { '$regex': (?i).*.* } },
        { treatment: { '$regex': (?i).*.* } }
      ]
    };

    if (recordType) {
      selector.recordType = recordType;
    }

    return this.queryData(selector);
  }

  async getRecordsByDateRange(startDate, endDate, recordType = null) {
    const selector = {
      createdAt: {
        '$gte': startDate,
        '$lte': endDate
      }
    };

    if (recordType) {
      selector.recordType = recordType;
    }

    return this.queryData(selector);
  }

  async getRecordsBySeverity(severity) {
    return this.queryData({
      recordType: 'diagnosis',
      severity
    });
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HealthcareAPI;
}

// Global instance for direct use
window.healthcareAPI = new HealthcareAPI();
