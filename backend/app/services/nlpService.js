// backend/app/services/nlpService.js
const fs = require("fs");
const path = require("path");

// Normalisation du texte
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève accents
    .replace(/[^\w\s]/g, " "); // remplace ponctuation par espace
};

// Chargement des intents (optionnel)
const intentsPath = path.join(__dirname, "../../data/intents.json");
let intentsData = [];
try {
  const rawData = fs.readFileSync(intentsPath, "utf8");
  intentsData = JSON.parse(rawData).intents;
} catch (err) {
  console.error("Erreur chargement intents.json :", err.message);
}

// Dictionnaires de mots-clés
const SYMPTOM_KEYWORDS = {
  douleur: ["mal", "douleur", "douloureux", "douleurs", "fait mal"],
  dyspnee: ["respire", "essoufflement", "souffle", "oppression"],
  cardiaque: ["coeur", "cardiaque", "poitrine", "thorax"],
  nausee: ["nausée", "vomissement", "mal au coeur"],
  fievre: ["fièvre", "temperature", "chaud", "frissons"],
  traumatisme: ["chute", "accident", "coup", "blessure", "traumatisme"],
  saignement: ["saigne", "sang", "hémorragie", "ecoulement"],
  brulure: ["brûlure", "brulure", "crampe", "picotement", "engourdissement"],
};

const BODY_PARTS = {
  tete: ["tête", "tete", "crâne", "front", "nuque"],
  poitrine: ["poitrine", "thorax", "sternum"],
  ventre: ["ventre", "abdomen", "estomac"],
  dos: ["dos", "lombaires"],
  jambe: ["jambe", "cuisse", "mollet", "genou"],
  bras: ["bras", "avant-bras", "coude", "épaule"],
  cou: ["cou", "nuque"],
  pied: ["pied", "cheville"],
  main: ["main", "poignet"],
};

// Fonction d'extraction
const extractInfo = (message, summary = {}) => {
  const normalized = normalizeText(message);
  const info = {};

  // Symptôme
  for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    if (keywords.some(k => normalized.includes(k))) {
      info.symptom = symptom;
      break;
    }
  }

  // Partie du corps
  for (const [part, variants] of Object.entries(BODY_PARTS)) {
    if (variants.some(v => normalized.includes(v))) {
      info.bodyPart = part;
      break;
    }
  }

  // Durée
  const durationMatch = normalized.match(/(\d+)\s*(minute|minutes|heure|heures|jour|jours|h|min|j)/);
  if (durationMatch) {
    let unit = durationMatch[2];
    const number = parseInt(durationMatch[1], 10);
    if (unit === 'jour' && number > 1) unit = 'jours';
    if (unit === 'minute' && number > 1) unit = 'minutes';
    if (unit === 'heure' && number > 1) unit = 'heures';
    info.duration = number + " " + unit;
  } else if (normalized.includes("hier")) {
    info.duration = "1 jour";
  } else if (normalized.includes("avant-hier")) {
    info.duration = "2 jours";
  }

  // Intensité (validation)
  let intensityMatch = normalized.match(/(\d+)\s*\/\s*10|(\d+)\s*sur\s*10/);
  if (intensityMatch) {
    const intensity = parseInt(intensityMatch[1] || intensityMatch[2], 10);
    if (intensity >= 1 && intensity <= 10) info.intensity = intensity;
  } else if (summary.lastQuestion === 'intensity') {
    const justNumber = normalized.match(/^\s*(\d+)\s*$/);
    if (justNumber) {
      const intensity = parseInt(justNumber[1], 10);
      if (intensity >= 1 && intensity <= 10) info.intensity = intensity;
    }
  }

  // Âge (validation)
  const ageMatch = normalized.match(/(\d+)\s*ans/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 0 && age <= 120) info.age = age;
  } else if (summary.lastQuestion === 'age') {
    const justNumber = normalized.match(/^\s*(\d+)\s*$/);
    if (justNumber) {
      const age = parseInt(justNumber[1], 10);
      if (age >= 0 && age <= 120) info.age = age;
    }
  }

  // Adresse (simple)
  const addressMatch = normalized.match(/(\d{1,5})\s+(\w+)\s+(\w+)\s+(\d{5})/);
  if (addressMatch) {
    info.patientLocation = addressMatch[0];
  } else if (normalized.includes("rue") || normalized.includes("quartier") ||
             normalized.includes("oujda") || normalized.includes("casablanca")) {
    info.patientLocation = message;
  }

  return info;
};

// Évaluation de la sévérité (améliorée, combinant intensité + durée)
const evaluateSeverity = (summary) => {
  const intensity = Number(summary.intensity);
  const duration = summary.duration ? parseInt(summary.duration) : 0;

  if (summary.symptom === 'cardiaque') return 'critique';
  if (summary.symptom === 'douleur' && summary.bodyPart === 'poitrine') return 'critique';
  if (summary.symptom === 'dyspnee') return 'critique';
  if (summary.symptom === 'saignement') return 'critique';
  if (summary.symptom === 'perte_connaissance') return 'critique';
  if (intensity >= 8) return 'critique';
  if (intensity >= 5 && duration > 24) return 'critique';
  if (intensity >= 5) return 'moyenne';
  if (intensity >= 3) return 'faible';
  if (summary.symptom) return 'faible';
  return 'inconnue';
};

// Génération de la réponse (pour le mode règles)
const generateReply = (summary) => {
  if (!summary.symptom) return "Quel est le problème principal ?";
  if (!summary.bodyPart) return "Où avez-vous mal ?";
  if (!summary.duration) return "Depuis combien de temps ?";
  if (summary.intensity === undefined || summary.intensity === null)
    return "Sur une échelle de 1 à 10, quelle est l'intensité ?";
  if (!summary.age) return "Quel âge a le patient ?";
  if (!summary.patientLocation) return "Où se trouve le patient ?";
  return null;
};

const processMessage = (userMessage, currentSummary = {}) => {
  const extractedInfo = extractInfo(userMessage, currentSummary);
  const updatedSummary = { ...currentSummary, ...extractedInfo };
  const intent = "rules";
  const severity = evaluateSeverity(updatedSummary);
  const reply = generateReply(updatedSummary);
  return {
    reply: reply || "Merci. Toutes les informations sont enregistrées.",
    intent,
    extractedInfo: { ...extractedInfo, severity, lastQuestion: reply ? reply.split('?')[0] : null }
  };
};

module.exports = {
  processMessage,
  extractInfo,
  evaluateSeverity,
  normalizeText
};