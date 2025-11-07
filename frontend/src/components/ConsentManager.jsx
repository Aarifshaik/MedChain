import React, { useState, useEffect } from 'react';
import HealthcareAPI from '../services/healthcareAPI';

const ConsentManager = () => {
  const [consents, setConsents] = useState([]);
  const [expiringConsents, setExpiringConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const api = new HealthcareAPI();

  useEffect(() => {
    loadConsents();
    loadExpiringConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const response = await api.getActiveConsents();
      setConsents(response.data || []);
    } catch (err) {
      setError('Failed to load consents: ' + err.message);
    }
  };

  const loadExpiringConsents = async () => {
    try {
      const response = await api.getExpiringConsents(7);
      setExpiringConsents(response.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load expiring consents: ' + err.message);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilExpiry = (expirationTime) => {
    const now = new Date();
    const expiry = new Date(expirationTime);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) return <div className="loading">Loading consents...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="consent-manager">
      <h1>Consent Management</h1>

      <div className="consent-sections">
        <div className="expiring-consents">
          <h2>Expiring Soon ({expiringConsents.length})</h2>
          {expiringConsents.map((consent, index) => (
            <div key={index} className="consent-card expiring">
              <h3>Patient: {consent.patientId}</h3>
              <p><strong>Purpose:</strong> {consent.purpose}</p>
              <p><strong>Expires:</strong> {formatDate(consent.expirationTime)}</p>
              <p><strong>Days remaining:</strong> {getDaysUntilExpiry(consent.expirationTime)}</p>
              <p><strong>Status:</strong> {consent.status}</p>
            </div>
          ))}
          {expiringConsents.length === 0 && (
            <p>No consents expiring in the next 7 days</p>
          )}
        </div>

        <div className="active-consents">
          <h2>All Active Consents ({consents.length})</h2>
          {consents.map((consent, index) => (
            <div key={index} className="consent-card">
              <h3>Patient: {consent.patientId}</h3>
              <p><strong>Consent ID:</strong> {consent.consentId}</p>
              <p><strong>Purpose:</strong> {consent.purpose}</p>
              <p><strong>Granted:</strong> {formatDate(consent.grantedAt)}</p>
              <p><strong>Expires:</strong> {formatDate(consent.expirationTime)}</p>
              <p><strong>Status:</strong> {consent.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConsentManager;
