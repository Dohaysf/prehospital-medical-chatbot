// services/nlpService.js

// Fonction d'extraction basique (à améliorer avec des regex ou spaCy)
const extractInfo = (message) => {
  const lower = message.toLowerCase();
  const info = {};

  // Symptômes
  if (lower.includes('mal') || lower.includes('douleur')) {
    info.symptom = 'douleur';
  } else if (lower.includes('respire') || lower.includes('souffle')) {
    info.symptom = 'dyspnée';
  } else if (lower.includes('cardiaque') || lower.includes('cœur')) {
    info.symptom = 'cardiaque';
  } else if (lower.includes('vomit') || lower.includes('nausée')) {
    info.symptom = 'nausée';
  } // etc.

  // Localisation
  const locationKeywords = ['tête', 'ventre', 'poitrine', 'dos', 'jambe', 'bras', 'cou'];
  for (let loc of locationKeywords) {
    if (lower.includes(loc)) {
      info.location = loc;
      break;
    }
  }

  // Durée
  const durationMatch = lower.match(/(\d+)\s*(heure|jour|minute|h|j)/);
  if (durationMatch) {
    info.duration = durationMatch[0];
  }

  return info;
};

// Fonction pour générer la réponse en fonction du résumé actuel et des nouvelles infos
const generateReply = (currentSummary, newInfo) => {
  // Si on n'a pas encore de symptôme
  if (!currentSummary.symptom && !newInfo.symptom) {
    return "Quel est le problème ? Avez-vous une douleur, une gêne respiratoire, ou autre chose ?";
  }
  // Si on a un symptôme mais pas de localisation
  if (!currentSummary.location && !newInfo.location) {
    return "Où avez-vous mal ou ressentez-vous une gêne ?";
  }
  // Si on a symptôme et localisation mais pas de durée
  if (!currentSummary.duration && !newInfo.duration) {
    return "Depuis combien de temps cela dure-t-il ?";
  }
  // Si on a tout, on peut donner des conseils ou demander des précisions
  if (currentSummary.symptom === 'douleur' && currentSummary.location === 'poitrine') {
    return "Une douleur à la poitrine peut être grave. Ne bougez pas, nous envoyons une ambulance. Pouvez-vous prendre vos constantes ?";
  }
  // Sinon, réponse générique
  return "Merci, je note ces informations. Pouvez-vous me donner plus de détails ?";
};

const processMessage = (userMessage, currentSummary = {}) => {
  const extracted = extractInfo(userMessage);
  // Fusionner les nouvelles infos avec le résumé pour la génération de réponse
  const updatedSummary = { ...currentSummary, ...extracted };
  const reply = generateReply(currentSummary, extracted); // on utilise currentSummary pour décider
  return { reply, extractedInfo: extracted };
};

module.exports = { processMessage };