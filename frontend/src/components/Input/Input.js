import React, { useState } from 'react';
import './Input.css';

const Input = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

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
      <button type="submit" disabled={disabled}>
        Envoyer
      </button>
    </form>
  );
};

export default Input;