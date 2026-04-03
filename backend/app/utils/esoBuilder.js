// backend/app/utils/esoBuilder.js

class ESOBuilder {
  constructor() {
    this.data = {};
  }

  update(newInfo) {
    Object.assign(this.data, newInfo);
    // Optionnel : calculer un niveau de gravité
    this.data.severity = this.calculateSeverity();
    return this.data;
  }

  calculateSeverity() {
    const s = this.data;
    if (s.symptom === 'douleur' && s.location === 'poitrine') return 'critique';
    if (s.symptom === 'dyspnée') return 'critique';
    if (s.symptom === 'saignement') return 'critique';
    if (s.symptom === 'perte_connaissance') return 'critique';
    if (s.intensity && parseInt(s.intensity) >= 7) return 'critique';
    if (s.intensity && parseInt(s.intensity) >= 4) return 'moyenne';
    if (s.symptom) return 'faible';
    return 'inconnue';
  }

  getSummary() {
    return this.data;
  }
}

module.exports = ESOBuilder; // ← Export direct de la classe