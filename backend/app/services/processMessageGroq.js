// backend/app/services/processMessageGroq.js
console.log('✅ processMessageGroq.js chargé');
const { callGroq } = require('./groqService');
const { extractInfo, evaluateSeverity } = require('./nlpService');
const axios = require('axios');

// Détection de la langue (français ou arabe)
function detectLanguage(text) {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'fr';
}

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
  const PFA_API_URL = 'http://localhost:3000/api/chatbot/emergency';
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
  const lang = detectLanguage(userMessage);
  const targetLanguage = lang === 'ar' ? 'en arabe standard' : 'en français';

  let reply;
  if (nextQuestion) {
    const prompt = `Tu es un assistant médical pré-hospitalier.
Le patient a dit : "${userMessage}".
Informations déjà collectées : ${JSON.stringify(updatedSummary)}.
La seule information manquante est : "${nextQuestion}".
Pose UNE SEULE question ${targetLanguage} pour obtenir cette information. Ne demande rien d'autre. Ne répète pas les informations déjà connues.`;
    const groqReply = await callGroq(prompt);
    const firstQuestion = groqReply.split('?')[0] + '?';
    reply = firstQuestion;
    if (groqReply.includes('?') && groqReply.split('?').length > 2) {
      console.log('⚠️ Groq a donné plusieurs questions, fallback à la question prédéfinie');
      reply = nextQuestion;
    }
  } else {
    // Message de fin dans la langue de l'utilisateur
    if (lang === 'ar') {
      reply = "شكرًا لك. تم تسجيل جميع المعلومات.";
    } else {
      reply = "Merci. Toutes les informations sont enregistrées.";
    }
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