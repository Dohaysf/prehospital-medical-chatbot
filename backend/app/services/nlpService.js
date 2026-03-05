// backend/app/services/nlpService.js

const fs = require('fs');
const path = require('path');

// Fonction pour enlever les accents
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Charger les intents depuis le fichier JSON
const intentsPath = path.join(__dirname, '../../data/intents.json');
let intentsData;
try {
  const rawData = fs.readFileSync(intentsPath, 'utf8');
  intentsData = JSON.parse(rawData).intents;
} catch (err) {
  console.error('Erreur chargement intents.json :', err.message);
  intentsData = []; // fallback vide
}

// Liste de mots-clés pour les symptômes
const SYMPTOM_KEYWORDS = {
  douleur: ['mal', 'douleur', 'douloureux', 'fait mal'],
  dyspnée: ['respire', 'souffle', 'essoufflement', 'oppression'],
  cardiaque: ['cœur', 'cardiaque', 'poitrine', 'thorax'],
  nausée: ['nausée', 'vomit', 'vomissement', 'mal au cœur'],
  fièvre: ['fièvre', 'température', 'chaud'],
  traumatisme: ['chute', 'accident', 'coup', 'blessure'],
  perte_connaissance: ['évanouissement', 'inconscient', 'perdu connaissance'],
  saignement: ['saigne', 'sang', 'hémorragie'],
};

// Parties du corps avec variantes (avec et sans accents)
const BODY_PARTS = {
  tête: ['tête', 'tete'],
  ventre: ['ventre'],
  poitrine: ['poitrine', 'thorax'],
  dos: ['dos'],
  jambe: ['jambe'],
  bras: ['bras'],
  cou: ['cou'],
  abdomen: ['abdomen'],
  épaule: ['épaule', 'epaule'],
  genou: ['genou'],
  pied: ['pied'],
  main: ['main'],
  côte: ['côte', 'cote']
};

// Détection de l'intent à partir du message
const detectIntent = (message) => {
  const lower = removeAccents(message.toLowerCase());
  for (const intent of intentsData) {
    for (const pattern of intent.patterns) {
      if (lower.includes(removeAccents(pattern.toLowerCase()))) {
        return intent.name;
      }
    }
  }
  return 'information_generale'; // intent par défaut
};

const extractInfo = (message, currentSummary) => {
  const lower = removeAccents(message.toLowerCase());
  const info = {};

  // 1. Symptôme
  for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    const normalizedKeywords = keywords.map(k => removeAccents(k.toLowerCase()));
    if (normalizedKeywords.some(keyword => lower.includes(keyword))) {
      info.symptom = symptom;
      break;
    }
  }

  // 2. Localisation
  for (const [part, variants] of Object.entries(BODY_PARTS)) {
    const normalizedVariants = variants.map(v => removeAccents(v.toLowerCase()));
    if (normalizedVariants.some(v => lower.includes(v))) {
      info.location = part;
      break;
    }
  }

  // 3. Durée
  const durationMatch = lower.match(/(depuis\s+)?(\d+)\s*(heure|jour|minute|h|j)(s?)/i);
  if (durationMatch) {
    info.duration = durationMatch[2] + ' ' + durationMatch[3] + (durationMatch[4] ? 's' : '');
  }

  // 4. Intensité
  let intensityMatch = lower.match(/(\d+)\s*\/\s*10|(\d+)\s*sur\s*10|intensité\s*(\d+)|(\d+)\s*sur\s*une\s*échelle\s*de\s*\d+/i);
  if (!intensityMatch && !currentSummary.intensity) {
    const justNumber = lower.match(/^\s*(\d+)\s*$/);
    if (justNumber) {
      intensityMatch = justNumber;
    }
  }
  if (intensityMatch) {
    info.intensity = intensityMatch[1] || intensityMatch[2] || intensityMatch[3] || intensityMatch[4] || intensityMatch[1];
  }

  // 5. Âge
  const ageMatch = lower.match(/(\d+)\s*ans/);
  if (ageMatch) {
    info.age = ageMatch[1];
  } else if (!currentSummary.age && !info.intensity) {
    const justNumber = lower.match(/^\s*(\d+)\s*$/);
    if (justNumber) {
      info.age = justNumber[1];
    }
  }

  // 6. Sexe
  if (lower.includes('homme') || lower.includes('monsieur') || lower.includes('garçon')) {
    info.gender = 'homme';
  } else if (lower.includes('femme') || lower.includes('madame') || lower.includes('fille')) {
    info.gender = 'femme';
  }

  return info;
};

const generateReply = (currentSummary, newInfo, intent) => {
  // 1. Priorité aux intents urgents
  if (intent === 'douleur_poitrine') {
    return "Une douleur à la poitrine peut être grave. Ne bougez pas, nous envoyons une ambulance. Pouvez-vous me dire si vous avez des antécédents cardiaques ?";
  }
  if (intent === 'difficulte_respiratoire') {
    return "Avez-vous des antécédents respiratoires (asthme, BPCO) ? Essayez de rester assis et de respirer calmement.";
  }
  if (intent === 'accident') {
    return "Où avez-vous mal ? Y a-t-il une blessure visible ?";
  }

  // 2. Sinon, suivre la logique de collecte d'informations
  if (!currentSummary.symptom && !newInfo.symptom) {
    return "Quel est le problème ? Avez-vous une douleur, une gêne respiratoire, ou autre chose ?";
  }
  if (!currentSummary.location && !newInfo.location) {
    return "Où avez-vous mal ou ressentez-vous une gêne ?";
  }
  if (!currentSummary.duration && !newInfo.duration) {
    return "Depuis combien de temps cela dure-t-il ?";
  }
  if (!currentSummary.intensity && !newInfo.intensity) {
    return "Sur une échelle de 1 à 10, quelle est l'intensité ?";
  }
  if (!currentSummary.age && !newInfo.age) {
    return "Quel est votre âge ?";
  }

  // 3. Réponse générique si tout est collecté
  return "Merci, je note ces informations. Pouvez-vous me donner plus de détails ?";
};

const processMessage = (userMessage, currentSummary = {}) => {
  const extractedInfo = extractInfo(userMessage, currentSummary);
  const intent = detectIntent(userMessage);
  const reply = generateReply(currentSummary, extractedInfo, intent);
  return { reply, extractedInfo, intent };
};

module.exports = { processMessage };