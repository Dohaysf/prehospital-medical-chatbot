// backend/app/services/processMessageGroq.js
console.log('✅ processMessageGroq.js chargé');
const { callGroq } = require('./groqService');
const { extractInfo, evaluateSeverity } = require('./nlpService');

/**
 * Détermine la prochaine question à poser en fonction du résumé.
 * Renvoie la question textuelle (français) correspondant au premier champ manquant.
 */
function getNextQuestion(summary) {
  if (!summary.symptom) return "Quel est le problème principal ?";
  if (!summary.bodyPart) return "Quelle partie du corps est concernée ?";
  if (!summary.duration) return "Depuis combien de temps ?";
  if (summary.intensity === undefined || summary.intensity === null)
    return "Sur une échelle de 1 à 10, quelle est l'intensité ?";
  if (!summary.age) return "Quel âge a le patient ?";
  if (!summary.patientLocation) return "Où se trouve le patient ?";
  return null; // plus de questions
}

/**
 * Traite un message utilisateur.
 * - Extrait les informations avec les règles classiques.
 * - Met à jour le résumé.
 * - Génère une seule question pour le champ manquant (si besoin).
 */
async function processMessageGroq(userMessage, currentSummary = {}) {
  // 1. Extraction classique pour le résumé
  const extractedInfo = extractInfo(userMessage, currentSummary);
  const updatedSummary = { ...currentSummary, ...extractedInfo };
  const severity = evaluateSeverity(updatedSummary);

  // 2. Déterminer la prochaine question
  const nextQuestion = getNextQuestion(updatedSummary);

  let reply;
  if (nextQuestion) {
    // Option A : utiliser Groq pour reformuler la question naturellement
    const prompt = `Tu es un assistant médical pré-hospitalier. Le patient a dit : "${userMessage}". Tu dois maintenant lui poser UNE SEULE question : "${nextQuestion}". Formule-la de manière naturelle et concise. Ne pose qu'une seule question.`;
    reply = await callGroq(prompt);

    // Option B (alternative) : utiliser directement la question prédéfinie (plus rapide)
    // reply = nextQuestion;
  } else {
    reply = "Merci. Toutes les informations sont enregistrées.";
  }

  return {
    reply,
    extractedInfo: { ...extractedInfo, severity },
    intent: 'groq'
  };
}

module.exports = { processMessageGroq };