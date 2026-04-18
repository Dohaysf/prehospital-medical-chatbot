import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../../../components/LayoutPublic/PublicLayout';
import './PublicHomePage.css';

const PublicHomePage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalConversations: 0, totalPatients: 0, criticalCount: 0, avgAge: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/api/public/stats')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <PublicLayout>
      <div className="home-page">
        {/* Bannière d'urgence */}
        <div className="emergency-banner">
          <div className="emergency-content">
            <span className="emergency-icon">🚨</span>
            <p>En cas d'urgence vitale (difficulté à respirer, douleur thoracique intense, perte de connaissance), appelez immédiatement le <strong>15 (SAMU)</strong> ou le <strong>112</strong>.</p>
          </div>
        </div>

        {/* Hero section */}
        <section className="home-hero">
          <div className="hero-content">
            <h1>Bienvenue sur MedAssist</h1>
            <p>Votre assistant médical d'urgence, accessible immédiatement sans inscription.</p>
            <button onClick={() => navigate('/public/chat')} className="cta-button">
              💬 Commencer une consultation
            </button>
          </div>
          <div className="hero-image">
            <span>🩺</span>
          </div>
        </section>

        {/* Statistiques clés */}
        <section className="stats-section">
          <h2>Quelques chiffres</h2>
          {loading ? (
            <p className="loading-text">Chargement des statistiques...</p>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{stats.totalConversations}</span>
                <span className="stat-label">Consultations totales</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.totalPatients}</span>
                <span className="stat-label">Patients inscrits</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.criticalCount}</span>
                <span className="stat-label">Urgences critiques</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.avgAge} ans</span>
                <span className="stat-label">Âge moyen</span>
              </div>
            </div>
          )}
        </section>

        {/* Fonctionnalités */}
        <section className="features-section">
          <h2>Pourquoi utiliser MedAssist ?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Chat médical instantané</h3>
              <p>Décrivez vos symptômes, obtenez des conseils de premiers secours en temps réel.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Suivi personnalisé</h3>
              <p>Créez un compte pour sauvegarder vos consultations et accéder à votre historique.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚨</div>
              <h3>Alerte aux secours</h3>
              <p>En cas d'urgence critique, le système alerte automatiquement les services adaptés.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Géolocalisation</h3>
              <p>Partagez votre position pour une intervention plus rapide.</p>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default PublicHomePage;