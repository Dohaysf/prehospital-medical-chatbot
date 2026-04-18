const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
    default: null
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [
    {
      sender: { type: String, enum: ['user', 'bot'], required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  esoSummary: { type: Object, default: {} },
  intent: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  tempUserId: { type: String, index: true }   // index via la propriété
});

// Index composé pour les utilisateurs connectés
conversationSchema.index({ userId: 1, createdAt: -1 });
// Pas d'index supplémentaire sur tempUserId pour éviter le doublon

module.exports = mongoose.model('Conversation', conversationSchema);