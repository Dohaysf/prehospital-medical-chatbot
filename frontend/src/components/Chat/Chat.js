import React, { useState, useEffect, useRef } from 'react';
import Message from '../Message/Message';
import Input from '../Input/Input';
import ESOSummary from '../ESOSummary/ESOSummary'; // Import du nouveau composant
import { sendMessage } from '../../services/api';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([
    { text: "Bonjour, je suis l'assistant médical. Décrivez votre situation.", sender: 'bot' }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [esoSummary, setEsoSummary] = useState({}); // Nouvel état
  const messagesEndRef = useRef(null);

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
    setEsoSummary(data.esoSummary || {}); // Met à jour le résumé
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '80vh' }}>
      <div style={{ flex: 2 }}>
        <div className="chat-container" style={{ height: '100%' }}>
          <div className="messages">
            {messages.map((msg, index) => (
              <Message key={index} text={msg.text} sender={msg.sender} />
            ))}
            {loading && <Message text="..." sender="bot" />}
            <div ref={messagesEndRef} />
          </div>
          <Input onSend={handleSend} disabled={loading} />
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <ESOSummary summary={esoSummary} />
      </div>
    </div>
  );
};

export default Chat;