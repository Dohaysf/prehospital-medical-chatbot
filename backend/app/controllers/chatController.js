const { processMessage } = require('../services/nlpService');
const ESOBuilder = require('../utils/esoBuilder');
const Conversation = require('../models/Conversation');

const sessions = new Map();

const handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message invalide' });
    }

    const id = sessionId || Date.now().toString();
    console.log('🔑 Session ID:', id);

    // Récupérer ou créer le builder
    if (!sessions.has(id)) {
      sessions.set(id, new ESOBuilder());
    }
    const builder = sessions.get(id);

    // Appel NLP
    const { reply, extractedInfo, intent } = processMessage(message, builder.getSummary());
    console.log('💬 Réponse générée:', reply);

    // Mise à jour du résumé
    builder.update(extractedInfo);
    const summary = builder.getSummary();
    console.log('📊 Résumé mis à jour:', summary);

    // Sauvegarde MongoDB avec gestion d'erreur explicite
    console.log('⏳ Tentative de sauvegarde MongoDB...');
    try {
      const result = await Conversation.findOneAndUpdate(
        { sessionId: id },
        {
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
            intent: intent
          }
        },
        { upsert: true, new: true }
      );
      console.log('✅ Sauvegarde réussie, ID doc:', result._id);
    } catch (dbError) {
      console.error('❌ Erreur MongoDB spécifique:', dbError.message);
      // On ne bloque pas la réponse utilisateur
    }

    // Réponse
    res.json({
      reply,
      esoSummary: summary,
      sessionId: id,
      intent
    });

  } catch (error) {
    console.error('❌ Erreur générale dans handleChat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = { handleChat };