const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./app/config/db');
const chatRoutes = require('./app/routes/chat');
const esoRoutes = require('./app/routes/eso');
const authRoutes = require('./app/routes/auth.routes'); // ← Ajout

console.log('📌 Vérification des variables d\'environnement :');
console.log('📌 GROQ_API_KEY présente ?', process.env.GROQ_API_KEY ? 'Oui' : 'Non');
console.log('📌 USE_GROQ =', process.env.USE_GROQ);
console.log('📌 PORT =', process.env.PORT);
console.log('📌 MONGO_URI =', process.env.MONGO_URI ? 'Définie' : 'Non définie');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/eso', esoRoutes);
app.use('/api/auth', authRoutes); 
const patientRoutes = require('./app/routes/patient.routes');
app.use('/api/patient', patientRoutes);
app.get('/', (req, res) => {
  res.send('API du chatbot médical en fonctionnement');
});

// Connexion MongoDB puis démarrage du serveur uniquement si on exécute directement ce fichier
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(port, () => {
        console.log(`Serveur backend démarré sur http://localhost:${port}`);
      });
    })
    .catch(err => {
      console.error('Impossible de démarrer le serveur:', err);
      process.exit(1);
    });
}

module.exports = app;