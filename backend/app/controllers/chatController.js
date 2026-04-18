const { processMessage } = require('../services/nlpService');
const ESOBuilder = require('../utils/esoBuilder');
const Conversation = require('../models/Conversation');

const { processMessageGroq } = require('../services/processMessageGroq');
console.log('✅ processMessageGroq importée');
const sessions = new Map();

const handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    // Récupération de l'utilisateur connecté (peut être undefined)
    const userId = req.user?.userId || null;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message invalide' });
    }

    const id = sessionId || Date.now().toString();
    console.log('🔑 Session ID:', id, 'pour utilisateur:', userId || 'anonyme');

    if (!sessions.has(id)) {
      sessions.set(id, new ESOBuilder());
    }
    const builder = sessions.get(id);

    const useGroq = process.env.USE_GROQ === 'true' && processMessageGroq !== null;
    console.log('🔍 USE_GROQ =', useGroq);

    let result;
    if (useGroq) {
      result = await processMessageGroq(message, builder.getSummary(), id);
    } else {
      result = processMessage(message, builder.getSummary());
    }

    const { reply, extractedInfo, intent } = result;

    builder.update(extractedInfo);
    const summary = builder.getSummary();

    // Sauvegarde en base
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
          intent: intent
        }
      };
      if (userId) {
        updateData.$set.userId = userId;
      } else {
        updateData.$set.tempUserId = id;
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
      intent
    });

  } catch (error) {
    console.error('❌ Erreur générale dans handleChat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = { handleChat };