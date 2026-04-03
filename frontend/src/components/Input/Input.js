import React, { useState, useEffect } from 'react';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import './Input.css';

const Input = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const { transcript, listening, startListening, stopListening } = useSpeechRecognition();

  // Lorsqu'un transcript est reçu, remplir le champ
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Décrivez la situation..."
        disabled={disabled}
      />
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className="microphone-button"
        title={listening ? "Arrêter l'écoute" : "Parler"}
      >
        🎤
      </button>
      <button type="submit" disabled={disabled}>
        Envoyer
      </button>
    </form>
  );
};

export default Input;