const { processMessage } = require('../services/nlpService');
const ESOBuilder = require('../utils/esoBuilder');
const Conversation = require('../models/Conversation');

const { processMessageGroq } = require('../services/processMessageGroq');
console.log('✅ processMessageGroq importée');

// Map des sessions actives en mémoire
const sessions = new Map();

// Nettoyage automatique des sessions inactives (toutes les 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of sessions.entries()) {
        if (data.lastAccess && (now - data.lastAccess) > 3600000) {
            sessions.delete(id);
            console.log(`🧹 Session ${id} supprimée (inactive depuis >1h)`);
        }
    }
}, 600000);

const handleChat = async (req, res) => {
  try {
    const { message, sessionId, resetSession } = req.body;
    const userId = req.user?.userId || null;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message invalide' });
    }

    // 🔑 Gestion de la session
    let id = sessionId;
    let isNewSession = false;
    
    // Si resetSession est true ou pas de sessionId, créer une NOUVELLE session
    if (resetSession || !id) {
      id = Date.now().toString();
      isNewSession = true;
      console.log('🆕 NOUVELLE session créée (vierge):', id);
    }
    
    console.log('🔑 Session ID:', id, 'pour utilisateur:', userId || 'anonyme');

    // 🔑 Gestion du builder ESO - TOUJOURS créer un nouveau builder pour une nouvelle session
    let sessionData = sessions.get(id);
    
    // Si la session n'existe pas OU si c'est une nouvelle session (resetSession=true)
    // alors on crée un NOUVEAU builder VIERGE
    if (!sessionData || resetSession) {
      const newBuilder = new ESOBuilder();
      sessions.set(id, { 
        builder: newBuilder, 
        lastAccess: Date.now(),
        createdAt: new Date()
      });
      sessionData = sessions.get(id);
      console.log('📋 Nouveau builder ESO créé (COMPLÈTEMENT VIERGE)');
      
      if (resetSession) {
        console.log('🔄 Réinitialisation demandée - Ancienne session supprimée de la mémoire');
      }
    } else {
      // Session existante, on met juste à jour le timestamp
      sessionData.lastAccess = Date.now();
    }
    
    const builder = sessionData.builder;
    
    // Log du résumé avant traitement (pour débogage)
    const beforeSummary = builder.getSummary();
    console.log('📋 [AVANT] Résumé ESO:', JSON.stringify(beforeSummary));

    const useGroq = process.env.USE_GROQ === 'true' && processMessageGroq !== null;
    console.log('🔍 USE_GROQ =', useGroq);

    let result;
    if (useGroq) {
      result = await processMessageGroq(message, builder.getSummary(), id);
    } else {
      result = processMessage(message, builder.getSummary());
    }

    const { reply, extractedInfo, intent, confidence } = result;

    // Mise à jour du builder avec les nouvelles informations
    builder.update(extractedInfo);
    const summary = builder.getSummary();
    
    console.log('📋 [APRÈS] Résumé ESO:', JSON.stringify(summary));
    if (confidence) console.log(`📊 Score de confiance: ${Math.round(confidence * 100)}%`);

    // Sauvegarde en base MongoDB
    console.log('⏳ Tentative de sauvegarde MongoDB...');
    try {
      const updateData = {
        $push: {
          messages: {
            $each: [
              { sender: 'user', text: message, timestamp: new Date() },
              { sender: 'bot', text: reply, timestamp: new Date() }
            ]
          }
        },
        $set: {
          esoSummary: summary,
          intent: intent,
          lastUpdated: new Date()
        }
      };
      
      if (userId) {
        updateData.$set.userId = userId;
      } else {
        updateData.$set.tempUserId = id;
      }
      
      if (isNewSession) {
        updateData.$set.createdAt = new Date();
      }

      const dbResult = await Conversation.findOneAndUpdate(
        { sessionId: id },
        updateData,
        { upsert: true, new: true }
      );
      console.log('✅ Sauvegarde réussie, ID doc:', dbResult._id);
    } catch (dbError) {
      console.error('❌ Erreur MongoDB spécifique:', dbError.message);
    }

    res.json({
      reply,
      esoSummary: summary,
      sessionId: id,
      intent,
      confidence: confidence || 0,
      isNewSession: isNewSession
    });

  } catch (error) {
    console.error('❌ Erreur générale dans handleChat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour réinitialiser une session (appelée depuis le frontend)
const resetChatSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId && sessions.has(sessionId)) {
      // Supprimer la session de la mémoire
      sessions.delete(sessionId);
      console.log(`🔄 Session ${sessionId} supprimée de la mémoire`);
    }
    
    res.json({ 
      success: true, 
      message: 'Session réinitialisée',
      newSessionId: Date.now().toString()
    });
  } catch (error) {
    console.error('❌ Erreur réinitialisation:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
};

// Fonction pour nettoyer toutes les sessions inactives (admin)
const cleanupSessions = async (req, res) => {
  const now = Date.now();
  let count = 0;
  for (const [id, data] of sessions.entries()) {
    if (data.lastAccess && (now - data.lastAccess) > 3600000) {
      sessions.delete(id);
      count++;
    }
  }
  console.log(`🧹 Nettoyage: ${count} sessions supprimées`);
  res.json({ success: true, sessionsDeleted: count, remainingSessions: sessions.size });
};

module.exports = { handleChat, resetChatSession, cleanupSessions };