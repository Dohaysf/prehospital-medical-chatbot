const { processMessage } = require('../services/nlpService');
const ESOBuilder = require('../utils/esoBuilder');
const Conversation = require('../models/Conversation');

let processMessageGroq = null;
try {
  processMessageGroq = require('../services/processMessageGroq').processMessageGroq;
  console.log('✅ processMessageGroq importée');
} catch (e) {
  console.log('⚠️ processMessageGroq non disponible, utilisation du système par défaut');
}

const sessions = new Map();

const handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    // Récupérer l'utilisateur authentifié (mis par le middleware auth)
    const userId = req.user.userId;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message invalide' });
    }

    const id = sessionId || Date.now().toString();
    console.log('🔑 Session ID:', id, 'pour utilisateur:', userId);

    if (!sessions.has(id)) {
      sessions.set(id, new ESOBuilder());
    }
    const builder = sessions.get(id);

    const useGroq = process.env.USE_GROQ === 'true' && processMessageGroq !== null;
    console.log('🔍 USE_GROQ =', useGroq);

    let result;
    if (useGroq) {
      console.log('🤖 Appel à processMessageGroq');
      result = await processMessageGroq(message, builder.getSummary(), id);
    } else {
      console.log('📞 Appel à processMessage (ancien système)');
      result = processMessage(message, builder.getSummary());
    }

    const { reply, extractedInfo, intent } = result;

    builder.update(extractedInfo);
    const summary = builder.getSummary();
    console.log('📊 Résumé mis à jour:', summary);

    // Sauvegarde MongoDB : on filtre par userId ET sessionId
    console.log('⏳ Tentative de sauvegarde MongoDB...');
    try {
      const dbResult = await Conversation.findOneAndUpdate(
        { sessionId: id, userId: userId },  // ← ajout du filtre userId
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
            intent: intent,
            userId: userId  // ← on s'assure que userId est présent (pour l'upsert)
          }
        },
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
      intent
    });

  } catch (error) {
    console.error('❌ Erreur générale dans handleChat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = { handleChat };