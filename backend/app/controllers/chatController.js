const { processMessage } = require('../services/nlpService');
const ESOBuilder = require('../utils/esoBuilder');
const Conversation = require('../models/Conversation');

// Pour stocker les résumés par session (simplifié, en mémoire)
// En production, utilisez une base de données ou des sessions.
const sessions = new Map();

const handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body; // sessionId optionnel pour identifier l'utilisateur

    // Si pas de sessionId, on en génère un (ex: timestamp)
    const id = sessionId || Date.now().toString();

    // Récupérer ou créer le builder pour cette session
    if (!sessions.has(id)) {
      sessions.set(id, new ESOBuilder());
    }
    const builder = sessions.get(id);

    // Traiter le message avec le NLP
    const { reply, extractedInfo } = processMessage(message);

    // Mettre à jour le résumé ESO
    builder.update(extractedInfo);

    // Optionnel : sauvegarder la conversation dans MongoDB
    // (si vous voulez enregistrer chaque message)
    // await Conversation.findOneAndUpdate(
    //   { sessionId: id },
    //   { $push: { messages: { sender: 'user', text: message } }, $set: { esoSummary: builder.getSummary() } },
    //   { upsert: true }
    // );

    // Répondre avec la réponse et le résumé actuel
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