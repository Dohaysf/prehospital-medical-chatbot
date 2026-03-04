const { processMessage } = require('../services/nlpService');
const ESOBuilder = require('../utils/esoBuilder');
const Conversation = require('../models/Conversation');

// Pour stocker les résumés par session (simplifié, en mémoire)
const sessions = new Map();

const handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    const id = sessionId || Date.now().toString();

    if (!sessions.has(id)) {
      sessions.set(id, new ESOBuilder());
    }
    const builder = sessions.get(id);

    // Appel au service NLP avec le résumé actuel
    const { reply, extractedInfo } = processMessage(message, builder.getSummary());

    // Mise à jour du résumé avec les nouvelles informations
    builder.update(extractedInfo);

    // (Optionnel) Sauvegarde MongoDB commentée

    res.json({
      reply,
      esoSummary: builder.getSummary(),
      sessionId: id
    });

  } catch (error) {
    console.error('Erreur dans le contrôleur chat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = { handleChat };