// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sendMessage = async (message, sessionId) => {
  try {
    const response = await api.post('/chat', { message, sessionId });
    return response.data;
  } catch (error) {
    console.error('Erreur API', error);
    return { reply: "Désolé, l'assistant est indisponible." };
  }
};