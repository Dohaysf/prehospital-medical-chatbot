const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messages: [
    {
      sender: {
        type: String,
        enum: ['user', 'bot'],
        required: true
      },
      text: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  esoSummary: {
    type: Object,
    default: {}
  },
  intent: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour faciliter les recherches par date
conversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);