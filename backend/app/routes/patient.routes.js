const express = require('express');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const router = express.Router();

// Récupérer toutes les conversations du patient connecté
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find(
  { userId: req.user.userId },
  '-__v'
).sort({ createdAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer uniquement les résumés ESO du patient
router.get('/eso', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId })
      .select('esoSummary createdAt')
      .sort({ createdAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;