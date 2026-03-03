import React from 'react';
import './Message.css';

const Message = ({ text, sender }) => {
  return (
    <div className={`message ${sender}`}>
      <div className="bubble">{text}</div>
    </div>
  );
};

export default Message;