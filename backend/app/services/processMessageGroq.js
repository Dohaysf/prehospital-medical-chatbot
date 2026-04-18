// backend/app/services/processMessageGroq.js
const { callGroq } = require('./groqService');
const { evaluateSeverity } = require('./nlpService');
const axios = require('axios');
require('dotenv').config();

// ================= CONFIGURATION =================
const D7_API_KEY = process.env.D7_API_KEY;
const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE || "+212602641467";
const MAX_GROQ_RETRIES = 2;

// ================= REQUIRED FIELDS =================
const REQUIRED_FIELDS = [
    "symptom",
    "bodyPart",
    "duration",
    "age",
    "patientLocation"
];

function getMissing(summary) {
    return REQUIRED_FIELDS.filter(f => !summary[f]);
}

// ================= ENVOI PFA =================
async function sendToPFA(summary, sessionId) {
    const missing = getMissing(summary);
    if (missing.length > 0) {
        console.warn(`⚠️ Envoi PFA ignoré, champs manquants : ${missing.join(', ')}`);
        return;
    }
    try {
        await axios.post('http://localhost:3000/api/chatbot/emergency', {
            esoSummary: summary,
            sessionId
        });
        console.log(`✅ PFA : données envoyées pour session ${sessionId}`);
    } catch (e) {
        console.error(`❌ Erreur PFA : ${e.message}`);
    }
}

// ================= ENVOI SMS D7 =================
async function sendEmergencySMS(summary, sessionId, reason) {
    if (!D7_API_KEY) {
        console.error("❌ Impossible d'envoyer le SMS : D7_API_KEY manquante");
        return false;
    }

    const alertMessage = `🚨 URGENCE MEDICALE - Chatbot
Session: ${sessionId || 'inconnue'}
Symptôme: ${summary.symptom || 'Non renseigné'}
Zone: ${summary.bodyPart || 'Non renseigné'}
Âge: ${summary.age || 'Non renseigné'}
Lieu: ${summary.patientLocation || 'Non renseigné'}
Niveau: ${evaluateSeverity(summary)}
Raison: ${reason}`.trim();

    try {
        await axios.post('https://api.d7networks.com/messages/v1/send', {
            messages: [{
                channel: "sms",
                recipients: [EMERGENCY_PHONE],
                content: alertMessage,
                msg_type: "text"
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${D7_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ SMS d'urgence envoyé avec succès via D7 Networks !");
        return true;
    } catch (error) {
        console.error("❌ Échec envoi SMS D7 :", error.response?.data || error.message);
        return false;
    }
}

// ================= ESCALADE URGENCE =================
async function escaladeUrgence(summary, sessionId, reason) {
    console.warn(`🚨 [ESCALADE URGENCE] Déclenchée - Raison: ${reason}`);
    await sendEmergencySMS(summary, sessionId, reason);
    return {
        reply: `⚠️ Nous rencontrons un problème technique temporaire.\n\nPour votre sécurité, veuillez appeler immédiatement le **SAMU** au **141**.\n\nUn message d'alerte a été envoyé à notre équipe.`,
        intent: "escalade_urgence",
        extractedInfo: {}
    };
}

// ================= EXTRACTION GROQ (réelle) =================
async function extractWithGroq(message, currentSummary) {
    const prompt = `
Tu es un assistant médical.

Analyse le message et extrais les informations utiles.

Message:
"${message}"

Données actuelles:
${JSON.stringify(currentSummary)}

Réponds STRICTEMENT en JSON:

{
  "symptom": "...",
  "bodyPart": "...",
  "duration": "...",
  "intensity": number,
  "age": number,
  "patientLocation": "..."
}

Règles:
- Compréhension intelligente (ex: "ça s'aggrave" → intensité élevée)
- Champs inconnus → null
- Pas de texte hors JSON
`;

    const response = await callGroq(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return {};
}

// ================= VALIDATION =================
function validateExtracted(extracted) {
    const validated = {};
    if (extracted.age !== undefined && extracted.age !== null) {
        const age = Number(extracted.age);
        if (!isNaN(age) && age >= 0 && age <= 120) validated.age = age;
        else console.warn(`Âge invalide rejeté : ${extracted.age}`);
    }
    if (extracted.intensity !== undefined && extracted.intensity !== null) {
        const intensity = Number(extracted.intensity);
        if (!isNaN(intensity) && intensity >= 1 && intensity <= 10) validated.intensity = intensity;
        else console.warn(`Intensité invalide rejetée : ${extracted.intensity}`);
    }
    for (const field of ['symptom', 'bodyPart', 'duration', 'patientLocation']) {
        if (extracted[field] && typeof extracted[field] === 'string' && extracted[field].trim()) {
            validated[field] = extracted[field].trim();
        }
    }
    return validated;
}

// ================= QUESTION =================
async function askQuestion(field, wasEmpty = false) {
    const questions = {
        symptom: "Quel est le problème principal ?",
        bodyPart: "Où avez-vous mal ?",
        duration: "Depuis quand ?",
        age: "Quel âge a le patient ?",
        patientLocation: "Où se trouve le patient ?"
    };
    return wasEmpty ? `Je n'ai pas bien compris. ${questions[field]}` : questions[field];
}

// ================= PROCESSUS PRINCIPAL (sans fallback règles) =================
async function processMessageGroq(userMessage, currentSummary = {}, sessionId = null) {
    // 1. Message vide ?
    const wasEmpty = !userMessage || userMessage.trim().length < 2;
    if (wasEmpty) {
        const missing = getMissing(currentSummary);
        const next = missing[0] || 'symptom';
        return {
            reply: await askQuestion(next, true),
            extractedInfo: {},
            intent: "reask"
        };
    }

    // 2. Détection du mot "urgence" → escalade immédiate
    if (userMessage.toLowerCase().includes('urgence')) {
        return await escaladeUrgence(currentSummary, sessionId, "Mot-clé 'urgence' détecté");
    }

    // 3. Extraction Groq (avec retry)
    let extracted = {};
    let lastError = null;
    for (let i = 0; i < MAX_GROQ_RETRIES; i++) {
        try {
            extracted = await extractWithGroq(userMessage, currentSummary);
            lastError = null;
            break;
        } catch (err) {
            lastError = err;
            console.error(`Tentative ${i+1}/${MAX_GROQ_RETRIES} échouée:`, err.message);
        }
    }
    if (lastError) {
        return await escaladeUrgence(currentSummary, sessionId, "Groq failed after retries");
    }

    const validated = validateExtracted(extracted);
    const updatedSummary = { ...currentSummary, ...validated };
    const severity = evaluateSeverity(updatedSummary);

    // 4. Âge obligatoire en premier
    if (!updatedSummary.age) {
        return {
            reply: await askQuestion('age'),
            extractedInfo: validated,
            intent: "ask_age"
        };
    }

    const missing = getMissing(updatedSummary);
    if (missing.length === 0) {
        if (sessionId) await sendToPFA(updatedSummary, sessionId);
        return {
            reply: `Merci. Informations complètes.\n🚨 Niveau d'urgence: ${severity}`,
            extractedInfo: validated,
            intent: "complete"
        };
    }

    const next = missing[0];
    return {
        reply: await askQuestion(next),
        extractedInfo: validated,
        intent: "collect"
    };
}
module.exports = { processMessageGroq, escaladeUrgence };