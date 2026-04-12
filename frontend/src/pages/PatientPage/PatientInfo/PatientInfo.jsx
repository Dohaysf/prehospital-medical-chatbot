import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './PatientInfo.css';

const PatientInfo = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setUser(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="patient-info">
      <h1>Mes informations personnelles</h1>
      <div className="info-card">
        <p><strong>Nom :</strong> {user.name}</p>
        <p><strong>Email :</strong> {user.email}</p>
        <p><strong>Rôle :</strong> {user.role === 'patient' ? 'Patient' : 'Manager'}</p>
        <p><strong>Date d'inscription :</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default PatientInfo;