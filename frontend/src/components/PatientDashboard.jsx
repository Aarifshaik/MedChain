import React, { useState, useEffect } from 'react';
import HealthcareAPI from '../services/healthcareAPI';

const PatientDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);

  const api = new HealthcareAPI();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await api.queryData({
        recordType: 'diagnosis'
      });
      
      // Extract unique patients
      const uniquePatients = response.data.reduce((acc, record) => {
        if (!acc.find(p => p.patientId === record.patientId)) {
          acc.push({
            patientId: record.patientId,
            name: record.name,
            age: record.age,
            department: record.department
          });
        }
        return acc;
      }, []);
      
      setPatients(uniquePatients);
    } catch (err) {
      setError('Failed to load patients: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientRecords = async (patientId) => {
    try {
      const response = await api.getPatientRecords(patientId);
      setPatientRecords(response.data || []);
      setSelectedPatient(patientId);
    } catch (err) {
      setError('Failed to load patient records: ' + err.message);
    }
  };

  if (loading) return <div className="loading">Loading patients...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="patient-dashboard">
      <h1>Healthcare DLT - Patient Dashboard</h1>
      
      <div className="dashboard-content">
        <div className="patient-list">
          <h2>Patients</h2>
          {patients.map(patient => (
            <div 
              key={patient.patientId} 
              className={patient-card }
              onClick={() => loadPatientRecords(patient.patientId)}
            >
              <h3>{patient.name}</h3>
              <p>ID: {patient.patientId}</p>
              <p>Age: {patient.age}</p>
              <p>Department: {patient.department}</p>
            </div>
          ))}
        </div>

        <div className="patient-details">
          {selectedPatient ? (
            <>
              <h2>Records for Patient {selectedPatient}</h2>
              {patientRecords.map((record, index) => (
                <div key={index} className="record-card">
                  <h4>{record.recordType.toUpperCase()}</h4>
                  {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
                  {record.treatment && <p><strong>Treatment:</strong> {record.treatment}</p>}
                  {record.severity && <p><strong>Severity:</strong> {record.severity}</p>}
                  {record.status && <p><strong>Status:</strong> {record.status}</p>}
                  <p><strong>Created:</strong> {new Date(record.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </>
          ) : (
            <p>Select a patient to view their records</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
