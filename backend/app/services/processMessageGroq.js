// backend/app/services/processMessageGroq.js
const { callGroq } = require('./groqService');
const { evaluateSeverity } = require('./nlpService');
const { getRAGResponse } = require('./ragService');
const { calculateRAGConfidence, calculateGroqConfidence } = require('./confidenceService');
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
async function sendEmergencySMS(summary, sessionId, reason, confidence = null) {
    if (!D7_API_KEY) {
        console.error("❌ Impossible d'envoyer le SMS : D7_API_KEY manquante");
        return false;
    }

    const confidenceMsg = confidence ? `Confiance: ${Math.round(confidence * 100)}%` : '';
    const alertMessage = `🚨 URGENCE MEDICALE - Chatbot
Session: ${sessionId || 'inconnue'}
Symptôme: ${summary.symptom || 'Non renseigné'}
Zone: ${summary.bodyPart || 'Non renseigné'}
Âge: ${summary.age || 'Non renseigné'}
Lieu: ${summary.patientLocation || 'Non renseigné'}
Niveau: ${evaluateSeverity(summary)}
Raison: ${reason}
${confidenceMsg}`.trim();

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
async function escaladeUrgence(summary, sessionId, reason, confidence = null) {
    const confidenceMsg = confidence ? ` (confiance: ${Math.round(confidence * 100)}%)` : '';
    console.warn(`🚨 [ESCALADE URGENCE] Déclenchée - Raison: ${reason}${confidenceMsg}`);
    await sendEmergencySMS(summary, sessionId, reason, confidence);
    
    return {
        reply: `⚠️ **ALERTE MÉDICALE**\n\nNous rencontrons une situation qui nécessite une attention immédiate.\n\nPour votre sécurité, veuillez appeler immédiatement le **SAMU** au **141**.\n\nUn message d'alerte a été envoyé à notre équipe médicale.`,
        intent: "escalade_urgence",
        extractedInfo: {},
        confidence: confidence || 0
    };
}

// ================= EXTRACTION GROQ =================
async function extractWithGroq(message, currentSummary) {
    const prompt = `
Tu es un assistant médical.

Analyse le message et extrais les informations utiles.

Message:
"${message}"

Données actuelles:
${JSON.stringify(currentSummary)}

Règles IMPORTANTES:
- Si une information n'est PAS mentionnée dans le message, mets null
- N'invente JAMAIS de valeur
- Ne confonds pas "5 jours" avec un âge
- Réponds STRICTEMENT en JSON valide

Exemple de réponse valide:
{
  "symptom": "douleur",
  "bodyPart": "genou",
  "duration": "5 jours",
  "intensity": null,
  "age": null,
  "patientLocation": null
}

Réponds maintenant en JSON:
`;

    const response = await callGroq(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Erreur parsing JSON Groq:", e.message);
            return {};
        }
    }
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

// ================= EXTRACTION ÂGE AMÉLIORÉE =================
function extractAgeFromMessage(message) {
    const normalized = message.toLowerCase();
    
    // 1. Format explicite: "35 ans", "j'ai 35 ans", "âge 35 ans"
    const explicitAgeMatch = normalized.match(/(\d+)\s*(?:ans|années?)\b/);
    if (explicitAgeMatch) {
        const age = parseInt(explicitAgeMatch[1], 10);
        if (!isNaN(age) && age >= 0 && age <= 120) {
            console.log(`📝 Âge extrait (explicite): ${age}`);
            return age;
        }
    }
    
    // 2. Un nombre seul (réponse à la question "Quel âge ?")
    // MAIS: ne pas confondre avec "5 jours" ou "3 heures"
    const justNumber = normalized.match(/^\s*(\d+)\s*$/);
    if (justNumber) {
        const age = parseInt(justNumber[1], 10);
        if (!isNaN(age) && age >= 0 && age <= 120) {
            console.log(`📝 Âge extrait (nombre seul): ${age}`);
            return age;
        }
    }
    
    // 3. Éviter les faux positifs: "5 jours" ne doit pas être capturé comme âge
    // (déjà exclu par les patterns ci-dessus car ne finit pas par "ans" et n'est pas seul)
    
    return null;
}

// ================= PROCESSUS PRINCIPAL =================
async function processMessageGroq(userMessage, currentSummary = {}, sessionId = null) {
    // 1. Message vide ?
    const wasEmpty = !userMessage || userMessage.trim().length < 2;
    if (wasEmpty) {
        const missing = getMissing(currentSummary);
        const next = missing[0] || 'symptom';
        return {
            reply: await askQuestion(next, true),
            extractedInfo: {},
            intent: "reask",
            confidence: 0
        };
    }

    // 2. Détection du mot "urgence" → escalade immédiate
    const isUserEmergency = userMessage.toLowerCase().includes('urgence');
    if (isUserEmergency) {
        console.log("🚨 [URGENCE] Mot-clé détecté");
        return await escaladeUrgence(currentSummary, sessionId, "Mot-clé 'urgence' détecté", 1.0);
    }

    // 3. Extraction de l'âge (améliorée)
    const extractedAge = extractAgeFromMessage(userMessage);
    let updatedSummary = { ...currentSummary };
    
    if (extractedAge !== null && !updatedSummary.age) {
        updatedSummary.age = extractedAge;
        console.log(`📝 Âge ajouté au summary: ${extractedAge} ans`);
    }

    // 4. ÉTAPE RAG
    const ragResponse = await getRAGResponse(userMessage);
    const ragConfidence = calculateRAGConfidence(ragResponse, userMessage);
    
    // Cas critique RAG
    if (ragResponse.matched && ragResponse.urgency === true) {
        console.log(`📚 [RAG] Cas critique: ${ragResponse.key} (confiance: ${Math.round(ragConfidence * 100)}%)`);
        
        // Mise à jour du summary
        if (ragResponse.key === 'douleur_poitrine') {
            updatedSummary.symptom = 'douleur';
            updatedSummary.bodyPart = 'poitrine';
        } else if (ragResponse.key === 'respiration') {
            updatedSummary.symptom = 'dyspnee';
        } else if (ragResponse.key === 'accident') {
            updatedSummary.symptom = 'traumatisme';
        } else if (ragResponse.key === 'saignement') {
            updatedSummary.symptom = 'saignement';
        } else if (ragResponse.key === 'brulure') {
            updatedSummary.symptom = 'brulure';
        } else if (ragResponse.key === 'perte_connaissance') {
            updatedSummary.symptom = 'perte_connaissance';
        } else {
            updatedSummary.symptom = ragResponse.key;
        }
        
        await sendEmergencySMS(updatedSummary, sessionId, `URGENCE VITALE: ${ragResponse.key}`, ragConfidence);
        
        return {
            reply: `🚨 **URGENCE MÉDICALE**\n\n${ragResponse.reply}\n\n⚠️ **Question de sécurité** : ${ragResponse.followUpQuestion || 'Restez calme, les secours arrivent.'}`,
            intent: "rag_critical",
            extractedInfo: { symptom: updatedSummary.symptom, bodyPart: updatedSummary.bodyPart },
            confidence: ragConfidence
        };
    }
    
    // Cas non critique RAG
    if (ragResponse.matched && ragResponse.urgency === false) {
        console.log(`📚 [RAG] Conseil non urgent: ${ragResponse.key} (confiance: ${Math.round(ragConfidence * 100)}%)`);
        
        if (ragResponse.key === 'fievre') updatedSummary.symptom = 'fievre';
        if (ragResponse.key === 'mal_tete') updatedSummary.symptom = 'mal_tete';
        if (ragResponse.key === 'douleur_ventre') updatedSummary.symptom = 'douleur';
        
        if (updatedSummary.age) {
            const missing = getMissing(updatedSummary);
            if (missing.length === 0) {
                if (sessionId) await sendToPFA(updatedSummary, sessionId);
                return {
                    reply: `Merci. Informations complètes.\n🚨 Niveau d'urgence: ${evaluateSeverity(updatedSummary)}`,
                    extractedInfo: { symptom: updatedSummary.symptom },
                    intent: "complete",
                    confidence: ragConfidence
                };
            } else {
                return {
                    reply: await askQuestion(missing[0]),
                    extractedInfo: { symptom: updatedSummary.symptom },
                    intent: "collect",
                    confidence: ragConfidence
                };
            }
        } else {
            return {
                reply: await askQuestion('age'),
                extractedInfo: { symptom: updatedSummary.symptom },
                intent: "ask_age",
                confidence: ragConfidence
            };
        }
    }

    // 5. ÉTAPE GROQ
    console.log("🤖 [GROQ] Aucun match RAG, appel à Groq");
    let extracted = {};
    let lastError = null;
    let groqConfidence = 0.7;
    
    for (let i = 0; i < MAX_GROQ_RETRIES; i++) {
        try {
            extracted = await extractWithGroq(userMessage, updatedSummary);
            lastError = null;
            groqConfidence = calculateGroqConfidence(extracted, i);
            break;
        } catch (err) {
            lastError = err;
            console.error(`Tentative ${i+1}/${MAX_GROQ_RETRIES} échouée:`, err.message);
        }
    }
    
    if (lastError) {
        return await escaladeUrgence(updatedSummary, sessionId, "Groq failed after retries", 0.3);
    }

    const validated = validateExtracted(extracted);
    updatedSummary = { ...updatedSummary, ...validated };
    const severity = evaluateSeverity(updatedSummary);

    if (severity === 'critique') {
        console.warn(`🚨 [URGENCE] Situation critique (${severity}) - Envoi SMS`);
        await sendEmergencySMS(updatedSummary, sessionId, `Critique: ${severity}`, groqConfidence);
    } else {
        console.log(`✅ [INFO] Situation non critique (${severity}) - Pas de SMS`);
    }

    if (!updatedSummary.age) {
        return {
            reply: await askQuestion('age'),
            extractedInfo: validated,
            intent: "ask_age",
            confidence: groqConfidence
        };
    }

    const missing = getMissing(updatedSummary);
    
    if (missing.length === 0) {
        if (sessionId) await sendToPFA(updatedSummary, sessionId);
        return {
            reply: `Merci. Informations complètes.\n🚨 Niveau d'urgence: ${severity}`,
            extractedInfo: validated,
            intent: "complete",
            confidence: groqConfidence
        };
    }

    return {
        reply: await askQuestion(missing[0]),
        extractedInfo: validated,
        intent: "collect",
        confidence: groqConfidence
    };
}

module.exports = { processMessageGroq, escaladeUrgence };