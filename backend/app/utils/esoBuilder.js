// backend/app/utils/esoBuilder.js
class ESOBuilder {
  constructor() {
    this.data = {};
  }

  update(newInfo) {
    Object.assign(this.data, newInfo);
    this.data.severity = this.calculateSeverity();
    return this.data;
  }

  calculateSeverity() {
    const s = this.data;
    const intensity = parseInt(s.intensity);
    const duration = s.duration ? parseInt(s.duration) : 0;

    // Règles critiques
    if (s.symptom === 'douleur' && s.bodyPart === 'poitrine') return 'critique';
    if (s.symptom === 'dyspnée') return 'critique';
    if (s.symptom === 'saignement') return 'critique';
    if (s.symptom === 'perte_connaissance') return 'critique';
    if (intensity >= 8) return 'critique';
    if (intensity >= 5 && duration > 24) return 'critique';
    if (intensity >= 5) return 'moyenne';
    if (intensity >= 3) return 'faible';
    if (s.symptom) return 'faible';
    return 'inconnue';
  }

  getSummary() {
    return this.data;
  }

  // Ajout de localisation structurée
  addLocation(location) {
    if (!location) return;
    this.data.location = {
      city: location.city || null,
      region: location.region || null,
      country: location.country || null,
      formatted: location.formatted || null,
      latitude: location.latitude || null,
      longitude: location.longitude || null,
      detectedAt: new Date().toISOString()
    };
  }

  // Validation avant envoi PFA
  isValidForPFA() {
    const required = ['symptom', 'bodyPart', 'duration', 'age', 'patientLocation'];
    for (const field of required) {
      if (!this.data[field]) return false;
    }
    const age = Number(this.data.age);
    if (isNaN(age) || age < 0 || age > 120) return false;
    if (this.data.intensity !== undefined && this.data.intensity !== null) {
      const intensity = Number(this.data.intensity);
      if (isNaN(intensity) || intensity < 1 || intensity > 10) return false;
    }
    return true;
  }
}

module.exports = ESOBuilder;