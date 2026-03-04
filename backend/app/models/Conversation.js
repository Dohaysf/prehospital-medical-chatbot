const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  messages: [
    {
      sender: { type: String, enum: ['user', 'bot'] },
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  esoSummary: { type: Object, default: {} }, // Résumé ESO
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);