import React, { useState, useEffect, useRef } from 'react';
import Message from '../Message/Message';
import Input from '../Input/Input';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([
    { text: "Bonjour, je suis l'assistant médical. Décrivez votre situation.", sender: 'bot' },
    { text: "Ceci est un message test de l'utilisateur.", sender: 'user' },
    { text: "Je peux répondre à vos questions médicales.", sender: 'bot' }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotReply = (userMessage) => `Vous avez dit : "${userMessage}". Pouvez-vous préciser ?`;

  const handleSend = (userMessage) => {
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setTimeout(() => {
      const botReply = getBotReply(userMessage);
      setMessages(prev => [...prev, { text: botReply, sender: 'bot' }]);
    }, 500);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <Message key={index} text={msg.text} sender={msg.sender} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Input onSend={handleSend} />
    </div>
  );
};

export default Chat;