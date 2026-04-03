import { useState, useEffect } from 'react';

const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setSupported(true);
    } else {
      console.warn('SpeechSynthesis non supporté');
    }
  }, []);

  const speak = (text) => {
    // Vérifier si la voix est activée dans les paramètres
    const voiceEnabled = localStorage.getItem('voiceEnabled') !== 'false';
    if (!supported || !voiceEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const cancel = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return { speak, cancel, speaking, supported };
};

export default useSpeechSynthesis;