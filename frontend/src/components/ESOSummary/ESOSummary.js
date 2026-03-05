import React from 'react';
import './ESOSummary.css';

const ESOSummary = ({ summary }) => {
  // Mapping des clés techniques vers des libellés français
  const formatKey = (key) => {
    const labels = {
      symptom: 'Symptôme',
      location: 'Localisation',
      duration: 'Durée',
      intensity: 'Intensité (/10)',
      age: 'Âge',
      gender: 'Sexe',
      medicalHistory: 'Antécédents',
      medication: 'Traitements en cours',
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Valeur par défaut si aucune info
  const isEmpty = Object.keys(summary).length === 0;

  return (
    <div className="eso-card">
      <div className="eso-header">
        <h3>📋 Résumé pré-ESO</h3>
        <span className={`status-badge ${isEmpty ? 'waiting' : 'in-progress'}`}>
          {isEmpty ? 'En attente' : 'En cours'}
        </span>
      </div>

      <div className="eso-body">
        {isEmpty ? (
          <p className="empty-state">
            Aucune information pour l'instant.<br />
            Commencez la conversation avec l'assistant.
          </p>
        ) : (
          <ul className="eso-list">
            {Object.entries(summary).map(([key, value]) => (
              <li key={key} className="eso-item">
                <span className="eso-key">{formatKey(key)}</span>
                <span className="eso-value">{value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ESOSummary;