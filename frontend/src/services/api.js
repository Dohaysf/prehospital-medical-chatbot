import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const sendMessage = async (message, sessionId) => {
  try {
    const response = await axios.post(`${API_URL}/chat`, { message, sessionId });
    return response.data; // { reply, esoSummary, sessionId }
  } catch (error) {
    console.error('Erreur API', error);
    return { reply: "Désolé, l'assistant est indisponible." };
  }
};