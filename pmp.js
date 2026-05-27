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

// Save edits from the modal and persist overrides
function saveMpsCellEditFromModal() {
  const productId = document.getElementById('mps-cell-edit-product-id').value;
  const weekIdx = parseInt(document.getElementById('mps-cell-edit-week-index').value);
  const pedido = parseFloat(document.getElementById('mps-cell-edit-pedido').value);
  const pronostico = parseFloat(document.getElementById('mps-cell-edit-pronostico').value);
  const inventarioInicial = parseFloat(document.getElementById('mps-cell-edit-inventario-inicial').value);

  // Store overrides in global arrays (ensure they exist)
  window.customWeeklyBarrilDemand = window.customWeeklyBarrilDemand || [];
  window.customWeeklyForecastLiters = window.customWeeklyForecastLiters || [];
  window.customInventarioInicialOverrides = window.customInventarioInicialOverrides || [];

  if (!isNaN(pedido)) {
    window.customWeeklyBarrilDemand[productId] = window.customWeeklyBarrilDemand[productId] || [];
    window.customWeeklyBarrilDemand[productId][weekIdx] = pedido;
  }
  if (!isNaN(pronostico)) {
    window.customWeeklyForecastLiters[productId] = window.customWeeklyForecastLiters[productId] || [];
    window.customWeeklyForecastLiters[productId][weekIdx] = pronostico;
  }
  if (!isNaN(inventarioInicial)) {
    window.customInventarioInicialOverrides[productId] = window.customInventarioInicialOverrides[productId] || [];
    window.customInventarioInicialOverrides[productId][weekIdx] = inventarioInicial;
  }

  // Persist state and re-render
  if (typeof window.saveData === 'function') {
    window.saveData();
  }
  renderPMPTable();
  closeMpsCellEditModal();
}

function closeMpsCellEditModal() {
  const modal = document.getElementById('mps-cell-edit-modal');
  if (modal) modal.classList.add('hidden');
}

// Hook into section navigation – showSection will be defined elsewhere
function showSection(sectionId) {
  // existing implementation might hide/show sections; we just call after
  const old = document.querySelector('.section.active');
  if (old) old.classList.remove('active');
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');
  if (sectionId === 'pmp') {
    renderPMP();
  }
}

// Export for global access (if needed)
window.mpsEngine = mpsEngine;
window.initEngine = initEngine;
window.renderPMP = renderPMP;
window.saveMpsCellEditFromModal = saveMpsCellEditFromModal;
window.closeMpsCellEditModal = closeMpsCellEditModal;
window.showSection = showSection;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initEngine();
});
