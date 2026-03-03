import React, { useState } from 'react';
import './Input.css';

const Input = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
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
      />
      <button type="submit">Envoyer</button>
    </form>
  );
};

export default Input;