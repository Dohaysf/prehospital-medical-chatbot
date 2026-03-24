// Remplacer le bloc try/catch par un require direct pour voir l'erreur
const { processMessageGroq } = require('../services/processMessageGroq');
console.log('✅ processMessageGroq importée, type:', typeof processMessageGroq);