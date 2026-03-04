import React from 'react';
import './ESOSummary.css';

const ESOSummary = ({ summary }) => {
  // Fonction pour formater les clés en français lisible
  const formatKey = (key) => {
    const map = {
      symptom: 'Symptôme',
      location: 'Localisation',
      duration: 'Durée',
      intensity: 'Intensité (/10)',
      medicalHistory: 'Antécédents',
      medication: 'Traitements',
      // Ajoutez d'autres correspondances
    };
    return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Vérifier si le résumé est vide
  const isEmpty = Object.keys(summary).length === 0;

  return (
    <div className="eso-summary-card">
      <div className="eso-summary-header">
        <h3>Résumé pré-ESO</h3>
        <span className="badge">{isEmpty ? 'En attente' : 'En cours'}</span>
      </div>
      <div className="eso-summary-body">
        {isEmpty ? (
          <p className="empty-message">Aucune information collectée pour l'instant.</p>
        ) : (
          <ul className="summary-list">
            {Object.entries(summary).map(([key, value]) => (
              <li key={key} className="summary-item">
                <span className="summary-key">{formatKey(key)}</span>
                <span className="summary-value">{value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ESOSummary;