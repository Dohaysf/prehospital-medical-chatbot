const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatController');
const { escaladeUrgence } = require('../services/processMessageGroq');

// Route normale de chat
router.post('/', handleChat);

// Nouvelle route pour déclenchement manuel de l'urgence
router.post('/emergency-manual', async (req, res) => {
  try {
    const { sessionId, summary } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId requis' });
    }
    const result = await escaladeUrgence(summary || {}, sessionId, "Déclenchement manuel par bouton");
    res.json({ success: true, reply: result.reply });
  } catch (error) {
    console.error('Erreur urgence manuelle:', error);
    res.status(500).json({ error: 'Erreur lors de l’alerte' });
  }
});

module.exports = router;