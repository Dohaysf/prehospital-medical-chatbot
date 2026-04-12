const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatController');
const auth = require('../middleware/auth');  // ← importer le middleware d'authentification

// Route POST /api/chat (protégée)
router.post('/', auth, handleChat);  // ← ajout de auth

module.exports = router;