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
    if (s.symptom === 'douleur' && s.location === 'poitrine') return 'haute';
    if (s.symptom === 'dyspnée') return 'haute';
    if (s.symptom === 'saignement') return 'haute';
    if (s.symptom === 'perte_connaissance') return 'haute';
    if (s.intensity && parseInt(s.intensity) >= 7) return 'haute';
    if (s.intensity && parseInt(s.intensity) >= 4) return 'moyenne';
    if (s.symptom) return 'basse';
    return 'inconnue';
  }

  getSummary() {
    return this.data;
  }
}

module.exports = ESOBuilder; // ← Export direct de la classe