// pmp.js – Handles PMP UI and interactions
import { renderPMPTable } from './production.js';
import { mpsEngine } from './mpsEngine.js';

// Initialize engine with basic product data (id and name)
function initEngine() {
  const products = window.inventory || [];
  const productList = products.map(p => ({
    id: p.id,
    name: p.name,
    stockArray: [],
    pedidoArray: [],
    pronosticoArray: []
  }));
  mpsEngine.init(productList);
}

// Render PMP table when the section is shown
function renderPMP() {
  renderPMPTable();
}

// Export for global access (if needed)
window.mpsEngine = mpsEngine;
window.initEngine = initEngine;
window.renderPMP = renderPMP;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initEngine();
});
