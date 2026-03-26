// backend/app/services/processMessageGroq.js
console.log('✅ processMessageGroq.js chargé');
const { callGroq } = require('./groqService');
const { extractInfo, evaluateSeverity } = require('./nlpService');
const axios = require('axios');

function getNextQuestion(summary) {
  if (!summary.symptom) return "Quel est le problème principal ?";
  if (!summary.bodyPart) return "Quelle partie du corps est concernée ?";
  if (!summary.duration) return "Depuis combien de temps ?";
  if (summary.intensity === undefined || summary.intensity === null)
    return "Sur une échelle de 1 à 10, quelle est l'intensité ?";
  if (!summary.age) return "Quel âge a le patient ?";
  if (!summary.patientLocation) return "Où se trouve le patient ?";
  return null;
}

async function sendToPFA(esoSummary, sessionId) {
  const PFA_API_URL = 'http://localhost:3000/api/chatbot/emergency'; // Endpoint PFA
  try {
    const response = await axios.post(PFA_API_URL, { esoSummary, sessionId });
    console.log('✅ Données envoyées au PFA :', response.data);
  } catch (error) {
    console.error('❌ Erreur lors de l’envoi au PFA :', error.message);
  }
}

async function processMessageGroq(userMessage, currentSummary = {}, sessionId = null) {
  const extractedInfo = extractInfo(userMessage, currentSummary);
  const updatedSummary = { ...currentSummary, ...extractedInfo };
  const severity = evaluateSeverity(updatedSummary);

  const nextQuestion = getNextQuestion(updatedSummary);

  let reply;
  if (nextQuestion) {
    const prompt = `Tu es un assistant médical pré-hospitalier. Le patient a dit : "${userMessage}". Tu dois maintenant lui poser UNE SEULE question : "${nextQuestion}". Formule-la de manière naturelle et concise. Ne pose qu'une seule question.`;
    reply = await callGroq(prompt);
  } else {
    reply = "Merci. Toutes les informations sont enregistrées.";
    // Envoyer au PFA une fois la conversation terminée
    if (sessionId) {
      await sendToPFA(updatedSummary, sessionId);
    }
  }

  return {
    reply,
    extractedInfo: { ...extractedInfo, severity },
    intent: 'groq'
  };
}

module.exports = { processMessageGroq };