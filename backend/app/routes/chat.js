const express = require('express');
const router = express.Router();
const { handleChat, resetChatSession, cleanupSessions } = require('../controllers/chatController');
const { escaladeUrgence } = require('../services/processMessageGroq');
const auth = require('../middleware/auth');

// Route normale de chat
router.post('/', handleChat);

// Route pour réinitialiser une session (créer une nouvelle conversation)
router.post('/reset-session', resetChatSession);

// Route pour déclenchement manuel de l'urgence (bouton 🚨)
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

// Route pour nettoyer les sessions inactives (admin uniquement)
router.post('/cleanup-sessions', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin/manager
    if (!req.user || req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Accès réservé aux managers' });
    }
    await cleanupSessions(req, res);
  } catch (error) {
    console.error('Erreur nettoyage sessions:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage' });
  }
});

module.exports = router;