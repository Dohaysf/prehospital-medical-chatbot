// backend/app/services/ragService.js
const fs = require('fs');
const path = require('path');

// Configuration
const RAG_DATA_PATH = path.join(__dirname, '../../data/rag_knowledge_base.json');
const VECTOR_STORE_PATH = path.join(__dirname, '../../data/vector_store/');

let ragKnowledgeBase = {};
let vectorStore = null; // Pour FAISS/ChromaDB (optionnel)

// Chargement de la base RAG JSON
try {
    const data = fs.readFileSync(RAG_DATA_PATH, 'utf8');
    ragKnowledgeBase = JSON.parse(data);
    console.log('✅ RAG Knowledge Base chargée avec', Object.keys(ragKnowledgeBase).length, 'entrées');
} catch (err) {
    console.error('❌ Erreur chargement RAG JSON:', err.message);
}

// Normalisation du texte pour la recherche
const normalizeText = (text) => {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ");
};

// Recherche par mots-clés (fallback si vector store non disponible)
function searchByKeywords(message) {
    const normalizedMessage = normalizeText(message);
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, data] of Object.entries(ragKnowledgeBase)) {
        for (const keyword of data.mots_cles) {
            if (normalizedMessage.includes(keyword)) {
                const score = keyword.length;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        matched: true,
                        key: key,
                        data: data,
                        matchedKeyword: keyword,
                        confidence: Math.min(score / 10, 0.95)
                    };
                }
            }
        }
    }
    return bestMatch || { matched: false, confidence: 0 };
}

// Recherche vectorielle (à implémenter avec FAISS ou ChromaDB)
async function searchByVector(message) {
    // TODO: Implémenter avec ChromaDB ou FAISS
    // Pour l'instant, fallback vers mots-clés
    return searchByKeywords(message);
}

// Récupération réponse RAG
async function getRAGResponse(message) {
    const result = await searchByVector(message);
    
    if (result.matched) {
        return {
            matched: true,
            reply: result.data.conseil,
            urgency: result.data.urgence,
            priority: result.data.priority,
            key: result.key,
            confidence: result.confidence,
            followUpQuestion: result.data.question_secours || null,
            source: result.data.source || 'Base de connaissances'
        };
    }
    return { matched: false, confidence: 0 };
}

// Chargement des protocoles PDF (pour ingestion)
async function loadProtocolsFromPDF(pdfPath) {
    // TODO: Implémenter avec PyPDF ou pdf-parse
    console.log('📄 Chargement des protocoles depuis:', pdfPath);
    return [];
}

module.exports = { 
    getRAGResponse, 
    searchByKeywords, 
    searchByVector, 
    ragKnowledgeBase,
    loadProtocolsFromPDF
};