const fs = require("fs");
const path = require("path");

const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const intentsPath = path.join(__dirname, "../../data/intents.json");
let intentsData = [];
try {
  const rawData = fs.readFileSync(intentsPath, "utf8");
  intentsData = JSON.parse(rawData).intents;
} catch (err) {
  console.error("Erreur chargement intents.json :", err.message);
}

// --- 1. SYMPTÔMES enrichis ---
const SYMPTOM_KEYWORDS = {
  douleur: ["mal", "douleur", "douloureux", "douleurs"],
  dyspnee: ["respire", "essoufflement", "souffle", "oppression"],
  cardiaque: ["coeur", "cardiaque", "poitrine", "thorax"],
  nausee: ["nausée", "vomissement", "mal au coeur"],
  fievre: ["fièvre", "temperature", "chaud", "frissons"],
  traumatisme: ["chute", "accident", "coup", "blessure", "traumatisme"],
  saignement: ["saigne", "sang", "hémorragie", "ecoulement"],
  brulure: ["brûlure", "brulure", "crampe", "picotement", "engourdissement"],
};

// --- 2. PARTIES DU CORPS enrichies ---
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

// --- 3. Détection d'intent ---
const detectIntent = (message) => {
  const lower = removeAccents(message.toLowerCase());
  for (const intent of intentsData) {
    for (const pattern of intent.patterns) {
      if (lower.includes(removeAccents(pattern.toLowerCase()))) {
        return intent.name;
      }
    }
  }
  return "information_generale";
};

// --- 4. Conversion intensité naturelle ---
const naturalIntensity = (phrase) => {
  const map = {
    "très fort": 8,
    "fort": 7,
    "moyen": 5,
    "léger": 3,
    "très léger": 2,
    "insupportable": 10,
    "atroce": 10,
    "faible": 2,
    "modéré": 5,
  };
  for (const [key, val] of Object.entries(map)) {
    if (phrase.includes(key)) return val;
  }
  return null;
};

// --- 5. Validation ---
const isValidAge = (age) => {
  return Number.isInteger(age) && age >= 0 && age <= 120;
};
const isValidIntensity = (intensity) => {
  return Number.isInteger(intensity) && intensity >= 1 && intensity <= 10;
};

// --- 6. Extraction (multi-informations) ---
const extractInfo = (message, summary) => {
  const lower = removeAccents(message.toLowerCase());
  const info = {};

  // 6.1 Symptôme
  for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    const normalized = keywords.map((k) => removeAccents(k));
    if (normalized.some((k) => lower.includes(k))) {
      info.symptom = symptom;
      break;
    }
  }

  // 6.2 Partie du corps
  for (const [part, variants] of Object.entries(BODY_PARTS)) {
    const normalized = variants.map((v) => removeAccents(v));
    if (normalized.some((v) => lower.includes(v))) {
      info.bodyPart = part;
      break;
    }
  }

  // 6.3 Durée (expressions relatives + nombres)
  let durationStr = null;
  if (lower.includes("depuis hier")) durationStr = "1 jour";
  else if (lower.includes("depuis ce matin")) durationStr = "quelques heures";
  else if (lower.includes("depuis ce soir")) durationStr = "quelques heures";
  else if (lower.includes("depuis une heure")) durationStr = "1 heure";
  else if (lower.includes("depuis deux heures")) durationStr = "2 heures";
  else if (lower.includes("depuis trois heures")) durationStr = "3 heures";
  else {
    const durationMatch = lower.match(/(\d+)\s*(minute|minutes|heure|heures|jour|jours|h|min|j)/);
if (durationMatch) {
  let unit = durationMatch[2];
  const number = parseInt(durationMatch[1], 10);
  if (unit === 'jour' && number > 1) unit = 'jours';
  if (unit === 'minute' && number > 1) unit = 'minutes';
  if (unit === 'heure' && number > 1) unit = 'heures';
  info.duration = number + " " + unit;
}
  }
  if (durationStr) info.duration = durationStr;

  // 6.4 Intensité (nombre + naturel)
  let intensityVal = null;
  const intensityMatch = lower.match(/(\d+)\s*\/\s*10|(\d+)\s*sur\s*10/);
  if (intensityMatch) {
    intensityVal = parseInt(intensityMatch[1] || intensityMatch[2], 10);
  } else {
    intensityVal = naturalIntensity(lower);
  }
  // Validation : on ne garde que si valide
  if (intensityVal !== null && isValidIntensity(intensityVal)) {
    info.intensity = intensityVal;
  }

  // 6.5 Âge (nombre)
  const ageMatch = lower.match(/(\d+)\s*ans/);
  if (ageMatch) {
    const ageVal = parseInt(ageMatch[1], 10);
    if (isValidAge(ageVal)) {
      info.age = ageVal;
    }
  }

  // 6.6 Adresse (regex améliorée)
  const addressPattern = /(\d{1,5})\s+(\w+)\s+(\w+)\s+(\d{5})/i;
  const addressMatch = lower.match(addressPattern);
  if (addressMatch) {
    info.patientLocation = addressMatch[0];
  } else if (!summary.patientLocation) {
    if (lower.includes("rue") || lower.includes("quartier") ||
        lower.includes("oujda") || lower.includes("casablanca")) {
      info.patientLocation = message;
    }
  }

  return info;
};

// --- 7. Calcul sévérité (inchangé) ---
const evaluateSeverity = (summary) => {
  if (summary.symptom === "cardiaque") return "élevée";
  const intensity = Number(summary.intensity);
  if (intensity >= 8) return "élevée";
  if (intensity >= 5) return "moyenne";
  return "faible";
};

// --- 8. Génération réponse (inchangé) ---
const generateReply = (summary) => {
  if (!summary.symptom)
    return { text: "Quel est le problème principal ?", field: "symptom" };
  if (!summary.bodyPart)
    return { text: "Quelle partie du corps est concernée ?", field: "bodyPart" };
  if (!summary.duration)
    return { text: "Depuis combien de temps ?", field: "duration" };
  if (summary.intensity === undefined || summary.intensity === null)
    return { text: "Sur une échelle de 1 à 10, quelle est l'intensité ?", field: "intensity" };
  if (!summary.age)
    return { text: "Quel âge a le patient ?", field: "age" };
  if (!summary.patientLocation)
    return { text: "Où se trouve le patient ?", field: "patientLocation" };
  return { text: "Merci. Toutes les informations sont enregistrées.", field: null };
};

// --- 9. Processus principal ---
const processMessage = (userMessage, currentSummary = {}) => {
  const extractedInfo = extractInfo(userMessage, currentSummary);
  const updatedSummary = { ...currentSummary, ...extractedInfo };
  const intent = detectIntent(userMessage);
  const severity = evaluateSeverity(updatedSummary);
  const replyData = generateReply(updatedSummary);

  return {
    reply: replyData.text,
    intent,
    extractedInfo: {
      ...extractedInfo,
      severity,
      lastQuestion: replyData.field,
    },
  };
};

module.exports = {
  processMessage,
  extractInfo,
  evaluateSeverity,
  generateReply
};