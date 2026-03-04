class ESOBuilder {
  constructor() {
    this.data = {};
  }

  update(newInfo) {
    // Fusionne les nouvelles infos (ex: symptôme, durée, etc.)
    Object.assign(this.data, newInfo);
    return this.data;
  }

  getSummary() {
    return this.data;
  }
}

module.exports = ESOBuilder;