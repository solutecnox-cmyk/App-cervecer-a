// mpsEngine.js – central data and calculation for PMP
export const mpsEngine = {
  productos: {}, // populated from state.inventoryFinal (or other source)
  // Initialize with existing product data
  init(productList) {
    productList.forEach(p => {
      this.productos[p.id] = {
        nombre: p.name,
        // Expected arrays per week; fallback to empty array
        inventarioInicial: p.stockArray || [],
        demandaPedidos: p.pedidoArray || [],
        demandaPronostico: p.pronosticoArray || []
      };
    });
  },
  // Compute PMP & Inventario Final for a given product/week
  compute(productId, weekIdx, overrides = {}) {
    const prod = this.productos[productId];
    if (!prod) return {};
    const invInicial = overrides.inventarioInicial ?? prod.inventarioInicial[weekIdx] ?? 0;
    const pedido = overrides.pedido ?? prod.demandaPedidos[weekIdx] ?? 0;
    const pronostico = overrides.pronostico ?? prod.demandaPronostico[weekIdx] ?? 0;
    const demanda = pedido + pronostico;
    const pmp = demanda <= invInicial ? 0 : 120; // constant can be parameterised later
    const inventarioFinal = invInicial - pmp - demanda;
    return { pedido, pronostico, inventarioInicial: invInicial, pmp, inventarioFinal };
  }
};
