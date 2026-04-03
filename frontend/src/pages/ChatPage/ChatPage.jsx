import React, { useState, useEffect, useRef } from 'react';
import Message from '../../components/Message/Message';
import Input from '../../components/Input/Input';
import ESOSummary from '../../components/ESOSummary/ESOSummary';
import { sendMessage } from '../../services/api';
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis';
import './ChatPage.css';

const ChatPage = () => {
  // Récupérer la langue depuis localStorage (par défaut 'fr')
  const getCurrentLanguage = () => {
    return localStorage.getItem('language') || 'fr';
  };

  // Message d'accueil selon la langue
  const getWelcomeMessage = () => {
    const lang = getCurrentLanguage();
    if (lang === 'ar') {
      return "مرحبًا، أنا المساعد الطبي. يرجى وصف حالتك.";
    }
    return "Bonjour, je suis l'assistant médical. Décrivez votre situation.";
  };

  const [messages, setMessages] = useState([
    { text: getWelcomeMessage(), sender: 'bot' }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [esoSummary, setEsoSummary] = useState({});
  const messagesEndRef = useRef(null);
  const { speak } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (userMessage) => {
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setLoading(true);

    const data = await sendMessage(userMessage, sessionId);
    if (data.sessionId) setSessionId(data.sessionId);
    setMessages(prev => [...prev, { text: data.reply, sender: 'bot' }]);
    setEsoSummary(data.esoSummary || {});
    setLoading(false);

    speak(data.reply);
  };

  const resetConversation = () => {
    // Réinitialiser avec le message d'accueil de la langue courante
    setMessages([{ text: getWelcomeMessage(), sender: 'bot' }]);
    setSessionId(null);
    setEsoSummary({});
    window.speechSynthesis?.cancel();
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
          <Input onSend={handleSend} disabled={loading} />
        </div>
      </div>
      <div className="chat-sidebar">
        <ESOSummary summary={esoSummary} />
      </div>
    </div>
  );
};

export default ChatPage;