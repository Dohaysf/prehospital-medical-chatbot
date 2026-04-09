import React, { useState, useEffect, useRef, useCallback } from 'react';
import Message from '../../components/Message/Message';
import Input from '../../components/Input/Input';
import ESOSummary from '../../components/ESOSummary/ESOSummary';
import { sendMessage } from '../../services/api';
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis';
import useGeolocation from '../../hooks/useGeolocation';
import './ChatPage.css';

const ChatPage = () => {
  const getCurrentLanguage = () => localStorage.getItem('language') || 'fr';
  const getWelcomeMessage = () => {
    const lang = getCurrentLanguage();
    return lang === 'ar' 
      ? "مرحبًا، أنا المساعد الطبي. يرجى وصف حالتك."
      : "Bonjour, je suis l'assistant médical. Décrivez votre situation.";
  };

  const [messages, setMessages] = useState([{ text: getWelcomeMessage(), sender: 'bot' }]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [esoSummary, setEsoSummary] = useState({});
  const [inputValue, setInputValue] = useState('');
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
    if (data.sessionId) setSessionId(data.sessionId);
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
    window.speechSynthesis?.cancel();
    locationSentRef.current = false;
    setLocationSentInThisConversation(false);
    resetError();
  };

  return (
    <div className="chat-page">
      <div className="chat-main">
        <div className="chat-header">
          <h2>💬 Nouvelle conversation</h2>
          <button className="new-chat-btn" onClick={resetConversation}>+ Nouveau</button>
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
            />
            <button 
              className="location-button" 
              onClick={handleLocationClick}
              disabled={locLoading}
              title="Me localiser"
            >
              {locLoading ? '⏳' : '📍'}
            </button>
          </div>
          {/* Message d'invitation à la localisation (affiché tant qu'aucune position n'est partagée) */}
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
      </div>
      <div className="chat-sidebar">
        <ESOSummary summary={esoSummary} />
      </div>
    </div>
  );
};

export default ChatPage;