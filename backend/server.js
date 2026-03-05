const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./app/config/db');
const chatRoutes = require('./app/routes/chat');
const esoRoutes = require('./app/routes/eso');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/eso', esoRoutes);

app.get('/', (req, res) => {
  res.send('API du chatbot médical en fonctionnement');
});

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