import React, { useEffect } from 'react';
import PatientSidebar from '../PatientSidebar/PatientSidebar';
import './PatientLayout.css';

const PatientLayout = ({ children }) => {
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, []);

  return (
    <div className="patient-layout">
      <PatientSidebar />
      <div className="patient-main-content">
        <div className="patient-page-container">{children}</div>
      </div>
    </div>
  );
};

export default PatientLayout;