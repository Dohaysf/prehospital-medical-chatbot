const fs = require("fs");
const path = require("path");

const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Normalisation pour l'arabe : supprime les diacritiques
const normalizeArabic = (str) => {
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
};

// ========== CHARGEMENT DES FICHIERS ==========
const intentsPath = path.join(__dirname, "../../data/intents.json");
let intentsData = [];
try {
  const rawData = fs.readFileSync(intentsPath, "utf8");
  intentsData = JSON.parse(rawData).intents;
} catch (err) {
  console.error("Erreur chargement intents.json :", err.message);
}

const keywordsDarijaPath = path.join(__dirname, "../../data/keywords_darija.json");
let keywordsDarija = {};
try {
  const rawData = fs.readFileSync(keywordsDarijaPath, "utf8");
  keywordsDarija = JSON.parse(rawData);
} catch (err) {
  console.error("Erreur chargement keywords_darija.json :", err.message);
}

// ========== DICTIONNAIRES FRANÇAIS ==========
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

// ========== UTILITAIRES ==========
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

const isValidAge = (age) => Number.isInteger(age) && age >= 0 && age <= 120;
const isValidIntensity = (intensity) => Number.isInteger(intensity) && intensity >= 1 && intensity <= 10;

// Recherche dans un dictionnaire de motifs (français ou darija) avec normalisation arabe
const matchKeyword = (dict, message) => {
  const normalizedMsg = normalizeArabic(message);
  for (const [key, patterns] of Object.entries(dict)) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeArabic(pattern);
      if (normalizedMsg.includes(normalizedPattern)) return key;
    }
  }
  return null;
};

// ========== EXTRACTION MULTI-INFORMATIONS ==========
const extractInfo = (message, summary) => {
  const lower = removeAccents(message.toLowerCase());
  const rawMessage = message;
  const info = {};

  // --- 1. Symptôme (français puis darija) ---
  for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    const normalized = keywords.map(k => removeAccents(k));
    if (normalized.some(k => lower.includes(k))) {
      info.symptom = symptom;
      break;
    }
  }
  if (!info.symptom && keywordsDarija.symptom) {
    const darijaSymptom = matchKeyword(keywordsDarija.symptom, rawMessage);
    if (darijaSymptom) info.symptom = darijaSymptom;
  }

  // --- 2. Partie du corps (français puis darija) ---
  for (const [part, variants] of Object.entries(BODY_PARTS)) {
    const normalized = variants.map(v => removeAccents(v));
    if (normalized.some(v => lower.includes(v))) {
      info.bodyPart = part;
      break;
    }
  }
  if (!info.bodyPart && keywordsDarija.bodyPart) {
    const darijaBody = matchKeyword(keywordsDarija.bodyPart, rawMessage);
    if (darijaBody) info.bodyPart = darijaBody;
  }

  // --- 3. Durée (français + darija) ---
  let durationStr = null;

  // Expressions françaises de durée
  if (lower.includes("hier") && !lower.includes("avant-hier")) {
    durationStr = "1 jour";
  } else if (lower.includes("avant-hier")) {
    durationStr = "2 jours";
  } else if (lower.includes("ce matin")) {
    durationStr = "quelques heures";
  } else if (lower.includes("ce soir")) {
    durationStr = "quelques heures";
  } else if (lower.includes("il y a")) {
    const ilYaMatch = lower.match(/il y a (\d+)\s*(jour|jours|heure|heures|minute|minutes)/);
    if (ilYaMatch) {
      let unit = ilYaMatch[2];
      const number = parseInt(ilYaMatch[1], 10);
      if (unit === 'jour' && number > 1) unit = 'jours';
      if (unit === 'heure' && number > 1) unit = 'heures';
      if (unit === 'minute' && number > 1) unit = 'minutes';
      durationStr = number + " " + unit;
    }
  } else if (lower.includes("depuis une heure")) {
    durationStr = "1 heure";
  } else if (lower.includes("depuis deux heures")) {
    durationStr = "2 heures";
  } else if (lower.includes("depuis trois heures")) {
    durationStr = "3 heures";
  } else {
    const durationMatch = lower.match(/(\d+)\s*(minute|minutes|heure|heures|jour|jours|h|min|j)/);
    if (durationMatch) {
      let unit = durationMatch[2];
      const number = parseInt(durationMatch[1], 10);
      if (unit === 'jour' && number > 1) unit = 'jours';
      if (unit === 'minute' && number > 1) unit = 'minutes';
      if (unit === 'heure' && number > 1) unit = 'heures';
      durationStr = number + " " + unit;
    }
  }

  // Darija
  if (!durationStr && keywordsDarija.duration) {
    const dur = matchKeyword(keywordsDarija.duration, rawMessage);
    if (dur === 'hours') durationStr = "quelques heures";
    else if (dur === 'days') durationStr = "quelques jours";
    else if (dur === 'minutes') durationStr = "quelques minutes";

    const darijaNumberMatch = rawMessage.match(/(\d+)\s*(ساعة|ساعات|يوم|أيام|دقيقة|دقائق)/);
    if (darijaNumberMatch) {
      const number = darijaNumberMatch[1];
      const unit = darijaNumberMatch[2];
      const unitFr = unit === 'ساعة' ? 'heure' : (unit === 'ساعات' ? 'heures' : (unit === 'يوم' ? 'jour' : (unit === 'أيام' ? 'jours' : (unit === 'دقيقة' ? 'minute' : 'minutes'))));
      durationStr = number + " " + unitFr;
    }
  }
  if (durationStr) info.duration = durationStr;

  // --- 4. Intensité (nombre + naturel) ---
  let intensityVal = null;
  const intensityMatch = lower.match(/(\d+)\s*\/\s*10|(\d+)\s*sur\s*10/);
  if (intensityMatch) {
    intensityVal = parseInt(intensityMatch[1] || intensityMatch[2], 10);
  } else {
    intensityVal = naturalIntensity(lower);
  }

  // Si toujours rien et que la dernière question posée était l'intensité, on tente un nombre seul
  if (!intensityVal && summary.lastQuestion === 'intensity') {
    const justNumber = lower.match(/^\s*(\d+)\s*$/);
    if (justNumber) {
      intensityVal = parseInt(justNumber[1], 10);
    }
  }

  if (!intensityVal && keywordsDarija.intensity) {
    const intens = matchKeyword(keywordsDarija.intensity, rawMessage);
    if (intens === 'very_high') intensityVal = 8;
    else if (intens === 'high') intensityVal = 7;
    else if (intens === 'medium') intensityVal = 5;
    else if (intens === 'low') intensityVal = 3;
  }
  if (intensityVal !== null && isValidIntensity(intensityVal)) {
    info.intensity = intensityVal;
  }

// --- 5. Âge (français + darija) ---
let ageVal = null;

// Français : "XX ans"
const ageMatch = lower.match(/(\d+)\s*ans/);
if (ageMatch) {
  ageVal = parseInt(ageMatch[1], 10);
}

// Darija : "XX سنة", "XX سنين", "XX عام", etc.
if (!ageVal) {
  const darijaAgeMatch = rawMessage.match(/(\d+)\s*(سنة|سنين|عام|اعوام)/);
  if (darijaAgeMatch) {
    ageVal = parseInt(darijaAgeMatch[1], 10);
  }
}



if (ageVal !== null && isValidAge(ageVal)) {
  info.age = ageVal;
}
  // --- 6. Adresse ---
  // --- 6. Adresse ---
const addressPattern = /(\d{1,5})\s+(\w+)\s+(\w+)\s+(\d{5})/i;
const addressMatch = lower.match(addressPattern);
if (addressMatch) {
  info.patientLocation = addressMatch[0];
} else if (!summary.patientLocation) {
  // Mots-clés français et darija pour la localisation
  const locationKeywords = [
    "rue", "quartier", "oujda", "casablanca", "ville","HAY",
    "زنقة", "حي", "شارع", "مدينة", "طريق"
  ];
  if (locationKeywords.some(keyword => lower.includes(keyword) || rawMessage.includes(keyword))) {
    info.patientLocation = message;
  }
}

  return info;
};

// ========== CALCUL SÉVÉRITÉ ==========
const evaluateSeverity = (summary) => {
  if (summary.symptom === "cardiaque") return "critique";
  const intensity = Number(summary.intensity);
  if (intensity >= 8) return "critique";
  if (intensity >= 5) return "moyenne";
  return "faible";
};

// ========== GÉNÉRATION RÉPONSE ==========
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

// ========== PROCESSUS PRINCIPAL ==========
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