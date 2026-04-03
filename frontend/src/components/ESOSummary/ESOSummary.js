import React from "react";
import "./ESOSummary.css";
import {
  FaUser,
  FaMapMarkerAlt,
  FaClock,
  FaTachometerAlt,
  FaBirthdayCake,
  FaMapPin,
} from "react-icons/fa";

const ESOSummary = ({ summary }) => {
  // Normalisation des champs
  const normalized = {
    symptom: summary.symptom,
    bodyPart: summary.bodyPart,
    duration: summary.duration,
    intensity: summary.intensity,
    age: summary.age,
    patientLocation: summary.patientLocation,
    severity: summary.severity,
  };

  // Conversion pour compatibilité avec anciennes données
  const formatSeverity = (severity) => {
    if (!severity) return 'Non évalué';
    if (severity === 'élevée') return 'Critique';
    if (severity === 'moyenne') return 'Moyenne';
    if (severity === 'faible') return 'Faible';
    return severity;
  };

  const fields = [
    { key: "symptom", label: "Symptôme", icon: <FaUser /> },
    { key: "bodyPart", label: "Partie du corps", icon: <FaMapMarkerAlt /> },
    { key: "duration", label: "Durée", icon: <FaClock /> },
    { key: "intensity", label: "Intensité (/10)", icon: <FaTachometerAlt /> },
    { key: "age", label: "Âge", icon: <FaBirthdayCake /> },
    { key: "patientLocation", label: "Localisation du patient", icon: <FaMapPin /> },
    { key: "severity", label: "Niveau d'urgence", icon: null },
  ];

  const hasData = Object.values(normalized).some(
    (v) => v !== undefined && v !== null && v !== ""
  );

  return (
    <div className="eso-card">
      <div className="eso-header">
        <h3>📋 Résumé pré-ESO</h3>
        <span className={`status-badge ${!hasData ? "waiting" : "in-progress"}`}>
          {!hasData ? "En attente" : "En cours"}
        </span>
      </div>
      <div className="eso-body">
        {!hasData ? (
          <p className="empty-state">
            Aucune information pour l'instant.
            <br />
            Commencez la conversation avec l'assistant.
          </p>
        ) : (
          <ul className="eso-list">
            {fields.map(({ key, label, icon }) => {
              let value = normalized[key];
              if (key === 'severity') value = formatSeverity(value);
              if (!value) return null;
              return (
                <li key={key} className="eso-item">
                  <span className="eso-key">
                    {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
                    {label}
                  </span>
                  <span className="eso-value">{value}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ESOSummary;