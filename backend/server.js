const express = require('express');
const cors = require('cors');
require('dotenv').config();
// const connectDB = require('./app/config/db');  // commenté
const chatRoutes = require('./app/routes/chat');

// connectDB(); // commenté

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('API du chatbot médical en fonctionnement');
});

app.listen(port, () => {
  console.log(`Serveur backend démarré sur http://localhost:${port}`);
});