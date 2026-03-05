const mongoose = require('mongoose');
require('dotenv').config();

console.log('URI =', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connexion réussie !');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  });