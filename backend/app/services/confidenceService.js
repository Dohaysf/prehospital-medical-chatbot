// backend/app/services/confidenceService.js

/**
 * Calcule le score de confiance d'une réponse RAG
 * @param {Object} ragResult - Résultat de la recherche RAG
 * @param {string} userMessage - Message original
 * @returns {number} Score entre 0 et 1
 */
function calculateRAGConfidence(ragResult, userMessage) {
    if (!ragResult || !ragResult.matched) return 0;
    
    let confidence = ragResult.confidence || 0.5;
    
    // Bonus si le mot-clé est long (plus précis)
    if (ragResult.matchedKeyword && ragResult.matchedKeyword.length > 5) {
        confidence += 0.1;
    }
    
    // Bonus pour les cas critiques (priorité 1)
    if (ragResult.data && ragResult.data.priority === 1) {
        confidence += 0.15;
    }
    
    // Pénalité si le message est trop court
    if (userMessage && userMessage.length < 10) {
        confidence -= 0.1;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Calcule le score de confiance d'une réponse Groq
 * @param {Object} extractedInfo - Informations extraites par Groq
 * @param {number} retryCount - Nombre de tentatives
 * @returns {number} Score entre 0 et 1
 */
function calculateGroqConfidence(extractedInfo, retryCount = 0) {
    let confidence = 0.7; // Base
    
    // Moins de confiance après retry
    confidence -= retryCount * 0.1;
    
    // Plus de confiance si plusieurs champs extraits
    const extractedFields = Object.values(extractedInfo || {}).filter(v => v !== null && v !== undefined && v !== '').length;
    if (extractedFields >= 3) confidence += 0.1;
    if (extractedFields >= 5) confidence += 0.1;
    
    return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Calcule le score de confiance global
 * @param {Object} ragResult - Résultat RAG
 * @param {Object} groqResult - Résultat Groq
 * @returns {number}
 */
function calculateGlobalConfidence(ragResult, groqResult) {
    let ragScore = ragResult?.matched ? (ragResult.confidence || 0.5) : 0;
    let groqScore = groqResult?.confidence || 0.5;
    
    // Si RAG a matché, on lui donne plus de poids (source fiable)
    if (ragResult?.matched) {
        return Math.min(ragScore + 0.1, 1);
    }
    
    return (ragScore + groqScore) / 2;
}

/**
 * Vérifie si l'escalade humaine est nécessaire
 * @param {number} confidence - Score de confiance
 * @param {boolean} isCritical - Situation critique ?
 * @returns {boolean}
 */
function isHumanEscalationNeeded(confidence, isCritical = false) {
    const THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.6;
    return confidence < THRESHOLD || isCritical;
}

/**
 * Initialise le service de confiance
 * @returns {Object}
 */
function initConfidenceService() {
    const threshold = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.6;
    console.log(`✅ Confidence Service initialisé (seuil: ${threshold})`);
    return { threshold };
}

module.exports = {
    calculateRAGConfidence,
    calculateGroqConfidence,
    calculateGlobalConfidence,
    isHumanEscalationNeeded,
    initConfidenceService
};