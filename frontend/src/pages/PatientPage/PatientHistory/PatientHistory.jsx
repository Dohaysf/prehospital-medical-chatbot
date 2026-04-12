import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './PatientHistory.css';

const PatientHistory = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:5000/api/patient/conversations', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setConversations(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Chargement...</div>;

  // Fonction pour normaliser la partie du corps (ex: "tete" → "tête")
  const formatBodyPart = (part) => {
    if (!part) return 'Non spécifiée';
    const map = {
      tete: 'tête',
      poitrine: 'poitrine',
      ventre: 'ventre',
      dos: 'dos',
      jambe: 'jambe',
      bras: 'bras',
      cou: 'cou',
      pied: 'pied',
      main: 'main'
    };
    return map[part] || part;
  };

  return (
    <div className="patient-history">
      <h1>Mon historique médical</h1>
      {conversations.length === 0 && <p>Aucune conversation pour le moment.</p>}
      <div className="history-list">
        {conversations.map(conv => (
          <div key={conv._id} className="history-card">
            <div className="history-date">{new Date(conv.createdAt).toLocaleString()}</div>
            <div className="history-summary">
              <span><strong>Symptôme :</strong> {conv.esoSummary?.symptom || '?'}</span>
              <span><strong>Partie du corps :</strong> {formatBodyPart(conv.esoSummary?.bodyPart)}</span>
              <span><strong>Gravité :</strong> {conv.esoSummary?.severity || '?'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientHistory;