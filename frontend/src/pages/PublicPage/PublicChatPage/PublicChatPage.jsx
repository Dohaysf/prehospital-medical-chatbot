import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // ← Ajout pour l’appel manuel
import PublicLayout from '../../../components/LayoutPublic/PublicLayout';
import Message from '../../../components/Message/Message';
import Input from '../../../components/Input/Input';
import ESOSummary from '../../../components/ESOSummary/ESOSummary';
import { sendMessage, attachConversation } from '../../../services/api';
import useSpeechSynthesis from '../../../hooks/useSpeechSynthesis';
import useGeolocation from '../../../hooks/useGeolocation';
import './PublicChatPage.css';

const PublicChatPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  const getCurrentLanguage = () => localStorage.getItem('language') || 'fr';
  const getWelcomeMessage = () => {
    const lang = getCurrentLanguage();
    return lang === 'ar'
      ? "مرحبًا، أنا المساعد الطبي. يرجى وصف حالتك."
      : "Bonjour, je suis l'assistant médical. Décrivez votre situation.";
  };

  const [messages, setMessages] = useState([{ text: getWelcomeMessage(), sender: 'bot' }]);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('currentSessionId') || null);
  const [loading, setLoading] = useState(false);
  const [esoSummary, setEsoSummary] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [emergencyDisabled, setEmergencyDisabled] = useState(false); // ← État pour désactiver le bouton
  const messagesEndRef = useRef(null);
  const { speak } = useSpeechSynthesis();
  const { location, loading: locLoading, error: locError, getLocation, resetError } = useGeolocation();
  const [locationSentInThisConversation, setLocationSentInThisConversation] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async (userMessage) => {
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setLoading(true);
    const data = await sendMessage(userMessage, sessionId);
    if (data.sessionId) {
      setSessionId(data.sessionId);
      localStorage.setItem('currentSessionId', data.sessionId);
    }
    setMessages(prev => [...prev, { text: data.reply, sender: 'bot' }]);
    setEsoSummary(data.esoSummary || {});
    setLoading(false);
    speak(data.reply);
  }, [sessionId, speak]);

  const locationSentRef = useRef(false);
  useEffect(() => {
    if (location && !locationSentRef.current) {
      locationSentRef.current = true;
      setLocationSentInThisConversation(true);
      handleSend(location);
      setInputValue('');
    }
  }, [location, handleSend]);

  const handleLocationClick = () => {
    resetError();
    getLocation();
  };

  const resetConversation = () => {
    setMessages([{ text: getWelcomeMessage(), sender: 'bot' }]);
    setSessionId(null);
    setEsoSummary({});
    localStorage.removeItem('currentSessionId');
    window.speechSynthesis?.cancel();
    locationSentRef.current = false;
    setLocationSentInThisConversation(false);
    resetError();
    setEmergencyDisabled(false); // ← Réactiver le bouton si besoin
  };

  const handleAttach = async () => {
    if (!sessionId) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await attachConversation(sessionId);
      alert('Conversation sauvegardée dans votre espace patient !');
      localStorage.removeItem('currentSessionId');
      navigate('/patient/chat');
    } catch (err) {
      alert('Erreur lors du rattachement : ' + (err.response?.data?.error || err.message));
    }
  };

  // === NOUVELLE FONCTION D’URGENCE MANUELLE ===
  const handleEmergency = async () => {
    if (!sessionId) {
      alert("Veuillez d'abord envoyer un message pour démarrer une session.");
      return;
    }
    const confirmSend = window.confirm("⚠️ Confirmez-vous l’envoi d’une alerte d’urgence ? Un SMS sera envoyé à l’équipe médicale.");
    if (!confirmSend) return;

    setEmergencyDisabled(true);
    try {
      const response = await axios.post('http://localhost:5000/api/chat/emergency-manual', {
        sessionId,
        summary: esoSummary
      });
      alert("Alerte envoyée. Un agent va vous contacter rapidement.");
      // Ajouter la réponse du bot dans le chat
      setMessages(prev => [...prev, { text: response.data.reply, sender: 'bot' }]);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de l'alerte. Veuillez réessayer.");
    } finally {
      // Réactiver après 5 secondes
      setTimeout(() => setEmergencyDisabled(false), 5000);
    }
  };

  return (
    <PublicLayout>
      <div className="public-chat-page">
        {/* Bandeau d'information publique */}
        <div className="public-badge">
          <span>🔓 Consultation publique et anonyme</span>
          {!isAuthenticated && (
            <button onClick={() => navigate('/login')} className="login-prompt">
              Se connecter pour sauvegarder
            </button>
          )}
        </div>

        <div className="chat-layout">
          {/* Zone principale de chat */}
          <div className="chat-main">
            <div className="chat-header">
              <h2>💬 Consultation express</h2>
              <button className="new-chat-btn" onClick={resetConversation}>+ Nouvelle conversation</button>
            </div>
            <div className="chat-container">
              <div className="messages">
                {messages.map((msg, idx) => (
                  <Message key={idx} text={msg.text} sender={msg.sender} />
                ))}
                {loading && <Message text="..." sender="bot" />}
                <div ref={messagesEndRef} />
              </div>
              <div className="input-area">
                <Input
                  onSend={handleSend}
                  disabled={loading}
                  value={inputValue}
                  onChange={setInputValue}
                  placeholder="Décrivez vos symptômes..."
                />
                <button
                  className="location-button"
                  onClick={handleLocationClick}
                  disabled={locLoading}
                  title="Me localiser"
                >
                  {locLoading ? '⏳' : '📍'}
                </button>
                {/* === BOUTON D’URGENCE === */}
                <button
                  className="emergency-button"
                  onClick={handleEmergency}
                  disabled={emergencyDisabled}
                  title="Alerte d'urgence immédiate"
                >
                  🚨
                </button>
              </div>
              {!locationSentInThisConversation && !locLoading && (
                <div className="location-prompt">
                  <p>📍 Partagez votre position pour une intervention plus rapide (optionnel)</p>
                </div>
              )}
              {locError && (
                <div className="location-error">
                  <p>{locError}</p>
                  <button onClick={() => window.location.reload()}>Recharger</button>
                </div>
              )}
            </div>

            {/* Section de rattachement (visible seulement si session en cours) */}
            {sessionId && (
              <div className="attach-section">
                {!isAuthenticated ? (
                  <div className="attach-prompt">
                    <p>💾 Sauvegardez cette conversation en créant un compte ou en vous connectant.</p>
                    <div className="attach-buttons">
                      <button onClick={() => navigate('/login')}>Se connecter</button>
                      <button onClick={() => navigate('/register')}>Créer un compte</button>
                      <button className="attach-btn" onClick={handleAttach}>Rattacher maintenant</button>
                    </div>
                  </div>
                ) : (
                  <button className="attach-btn" onClick={handleAttach}>
                    💾 Rattacher cette conversation à mon compte
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar droite : résumé médical */}
          <div className="chat-sidebar">
            <ESOSummary summary={esoSummary} />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicChatPage;