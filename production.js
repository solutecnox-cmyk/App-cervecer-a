// production.js
// Implementaciones MPS/MRP y fórmulas matemáticas del Excel para la Cervecería

import { LITERS_PER_BOTTLE, getProductVolumePerUnit, getWeekIndexFromToday } from './utils.js';

// --- 1. CAPACIDAD DE PRODUCCIÓN ---
/**
 * Calcula la capacidad de producción total del sistema.
 * Fórmula Excel: =Número_Tanques*Capacidad_Tanque
 */
export function calcularCapacidadTotal(numeroTanques, capacidadTanque) {
    return numeroTanques * capacidadTanque;
}

// --- 2. PEDIDO FIJO SEMANAL ---
/**
 * Calcula la demanda fija semanal a partir de una demanda mensual.
 * Fórmula Excel: =Pedido_Mensual/2
 */
export function calcularPedidoSemanal(pedidoMensual) {
    return pedidoMensual / 2;
}

// --- 3. TOTAL DE PRODUCCIÓN REQUERIDA ---
/**
 * Calcula la producción total requerida sumando los pedidos por sabor y sabores.
 * Fórmula Excel: =Pedido_Por_Sabor*Numero_Sabores
 */
export function calcularProduccionTotal(pedidoPorSabor, numeroSabores) {
    return pedidoPorSabor * numeroSabores;
}

// --- 4. CAPACIDAD DISPONIBLE (OVERFLOW) ---
/**
 * Calcula el volumen sobrante (overflow) que excede la producción comprometida.
 * Fórmula Excel: =Capacidad_Total-Produccion_Comprometida
 */
export function calcularOverflow(capacidadTotal, produccionComprometida) {
    return capacidadTotal - produccionComprometida;
}

// --- 5. DISTRIBUCIÓN POR SABORES ---
/**
 * Distribuye los litros disponibles por igual entre los sabores de cerveza.
 * Fórmula Excel: =Litros_Disponibles/Numero_Sabores
 */
export function distribuirPorSabores(litrosDisponibles, numeroSabores) {
    return litrosDisponibles / numeroSabores;
}

// --- 6. CONVERSIÓN DE LITROS A MILILITROS ---
/**
 * Convierte un volumen en litros a mililitros.
 * Fórmula Excel: =Litros*1000
 */
export function litrosAMililitros(litros) {
    return litros * 1000;
}

// --- 7. CONVERSIÓN DE MILILITROS A BOTELLAS ---
/**
 * Calcula el número de botellas obtenidas a partir de mililitros y el tamaño de la botella en mL.
 * Fórmula Excel: =ML_Totales/Tamano_Botella
 */
export function calcularBotellas(mlTotales, tamanoBotella) {
    return Math.floor(mlTotales / tamanoBotella);
}

// --- 8. CÁLCULO TOTAL DE BOTELLAS DESDE LITROS ---
/**
 * Convierte litros directamente a unidades de botella según el tamaño de botella especificado en litros (ej: 0.33 L).
 * Fórmula Matemática: Botellas = (Litros * 1000) / (Tamano_Botella_en_L * 1000) = Litros / Tamano_Botella
 */
export function litrosABotellas(litros, tamanoBotella) {
    if (!tamanoBotella) return 0;
    return Math.floor(litros / tamanoBotella);
}

// --- 9. PROMEDIO DE DEMANDA ---
/**
 * Calcula el promedio de un arreglo de demandas.
 * Fórmula Excel: =AVERAGE(C5:F5)
 */
export function calcularPromedioDemanda(demandas) {
    if (!demandas || demandas.length === 0) return 0;
    const suma = demandas.reduce((acc, valor) => acc + valor, 0);
    return suma / demandas.length;
}

// --- 10. SUMA TOTAL DE DEMANDA ---
/**
 * Calcula la suma total de demandas.
 * Fórmula Excel: =SUM(C5:F5)
 */
export function calcularTotalDemanda(demandas) {
    if (!demandas) return 0;
    return demandas.reduce((acc, valor) => acc + valor, 0);
}

// --- 11. INVENTARIO FINAL PROYECTADO ---
/**
 * Calcula el inventario final proyectado basado en stock inicial, producción y demanda.
 * Fórmula Excel: =Inventario_Inicial+Produccion-Demanda
 */
export function calcularInventarioFinal(inventarioInicial, produccion, demanda) {
    // No forzar a 0: permitimos valores negativos para mostrar déficit proyectado.
    return (Number(inventarioInicial) || 0) + (Number(produccion) || 0) - (Number(demanda) || 0);
}

// --- 12. PRODUCCIÓN NECESARIA ---
/**
 * Calcula la producción neta necesaria cuando la demanda excede el inventario actual.
 * Fórmula Excel: =Demanda-Inventario_Actual
 */
export function calcularProduccionNecesaria(demanda, inventarioActual) {
    return Math.max(0, demanda - inventarioActual);
}

// --- 13. REQUERIMIENTO DE MATERIA PRIMA ---
/**
 * Calcula el requerimiento bruto de un ingrediente según los lotes producidos.
 * Fórmula Excel: =Lotes*Consumo_Por_Lote
 */
export function calcularMateriaPrima(lotes, consumoPorLote) {
    return lotes * consumoPorLote;
}

// --- 14. CONVERSIÓN DE GRAMOS A KILOGRAMOS ---
/**
 * Convierte gramos a kilogramos.
 * Fórmula Excel: =Gramos/1000
 */
export function gramosAKilos(gramos) {
    return gramos / 1000;
}

// --- 15. CÁLCULO DE LEVADURA ---
/**
 * Calcula la cantidad de levadura necesaria en kg a partir de sobres de levadura.
 * Fórmula Excel: =(11.5*7)/1000
 */
export function calcularLevadura(gramosSobre, cantidadSobres) {
    return (gramosSobre * cantidadSobres) / 1000;
}

// --- 16. PRODUCCIÓN POR LOTES ---
/**
 * Calcula el número de lotes (redondeado al entero superior) para cubrir una cantidad de litros.
 * Fórmula Matemática: Lotes = CEIL(Produccion_Total / Litros_por_lote)
 */
export function calcularLotes(produccionTotal, litrosPorLote) {
    if (!litrosPorLote) return 0;
    return Math.ceil(produccionTotal / litrosPorLote);
}

// --- 17. UTILIZACIÓN DE CAPACIDAD ---
/**
 * Calcula el porcentaje de utilización de la capacidad.
 * Fórmula Matemática: (Produccion / Capacidad) * 100
 */
export function calcularUsoCapacidad(produccion, capacidadTotal) {
    if (!capacidadTotal) return 0;
    return (produccion / capacidadTotal) * 100;
}

// --- 18. PORCENTAJE DE OCUPACIÓN DE TANQUES ---
/**
 * Calcula el porcentaje de ocupación de tanques en fermentación.
 */
export function calcularOcupacionTanques(tanquesUsados, totalTanques) {
    if (!totalTanques) return 0;
    return (tanquesUsados / totalTanques) * 100;
}

// --- 19. ALERTA DE INVENTARIO BAJO ---
/**
 * Verifica si el inventario actual está por debajo del stock mínimo (alerta).
 */
export function verificarInventario(inventario, minimo) {
    return inventario < minimo;
}

// --- 20. COSTO TOTAL DE PRODUCCIÓN ---
/**
 * Calcula el costo total sumando materiales, mano de obra y otros costos.
 */
export function calcularCostoTotal(materiales, manoObra, otrosCostos) {
    return materiales + manoObra + otrosCostos;
}

export function renderPMPTable(containerId) {
  if (containerId === undefined) containerId = 'pmp-table-container';
  var container = document.getElementById(containerId);
  if (!container) return;

  var inventory = window.inventory || [];
  var finalProducts = inventory.filter(function(p) { return p.type !== 'raw'; });

  if (finalProducts.length === 0) {
    container.innerHTML = '<div class="flex flex-col items-center justify-center py-12 text-center">' +
      '<i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>' +
      '<p class="text-lg font-semibold text-gray-500">No hay productos finales registrados</p>' +
      '<p class="text-sm text-gray-400 mt-1">Agrega productos en Gesti\u00f3n de Inventario para ver el PMP.</p>' +
      '</div>';
    return;
  }

  var capacidadLote = (window.systemParameters && window.systemParameters.capacidadTanque) || 120;

  function getOv(map, id, w) {
    if (!map) return 0;
    var row = map[id] || map[String(id)];
    if (!row) return 0;
    return Number(row[w]) || 0;
  }

  function calcCell(pedido, pronostico, invInicial) {
    var demanda = pedido + pronostico;
    var pmp = demanda <= invInicial ? 0 : capacidadLote;
    var invFinal = invInicial - pmp - demanda;
    return { pmp: pmp, invFinal: invFinal };
  }

  function wLabel(w) {
    try {
      if (typeof window.getWeekLabel === 'function' && typeof window.getDateForWeekOffset === 'function') {
        return window.getWeekLabel(window.getDateForWeekOffset(w));
      }
    } catch(e) {}
    return 'Semana ' + (w + 1);
  }

  var html = '<div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">' +
    '<table class="w-full text-xs border-collapse">' +
    '<thead>' +
    '<tr style="background:linear-gradient(to right,#003d26,#005B3A);color:white;">' +
    '<th class="border border-green-900 p-3 text-left font-bold text-sm" style="min-width:150px">' +
    '<i class="fas fa-beer mr-1"></i> Producto</th>';

  for (var w = 0; w < 4; w++) {
    html += '<th colspan="5" class="border border-green-900 p-2 text-center font-bold">' + wLabel(w) + '</th>';
  }

  html += '</tr><tr style="background:#004a28;color:white;font-size:11px;">' +
    '<th class="border border-green-900 p-2 text-left text-green-300">\u2014</th>';

  for (var w2 = 0; w2 < 4; w2++) {
    html += '<th class="border border-green-900 p-1 text-center text-green-200" title="Datos de pedido \u2014 editable">Pedido</th>' +
      '<th class="border border-green-900 p-1 text-center text-blue-200" title="Pron\u00f3stico \u2014 editable">Pron\u00f3stico</th>' +
      '<th class="border border-green-900 p-1 text-center text-purple-200" title="Inventario inicial \u2014 editable">Inv. Ini.</th>' +
      '<th class="border border-green-900 p-1 text-center text-yellow-200" title="PMP calculado">PMP</th>' +
      '<th class="border border-green-900 p-1 text-center text-orange-200" title="Inventario final calculado">Inv. Final</th>';
  }

  html += '</tr></thead><tbody>';

  finalProducts.forEach(function(prod, rowIdx) {
    var id = prod.id;
    var rowBg = rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb';
    html += '<tr style="background:' + rowBg + ';">' +
      '<td class="border border-gray-200 p-2 font-semibold text-gray-800" style="background:#f9fafb;min-width:150px;">' +
      '<div class="flex items-center gap-2">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:#005B3A;flex-shrink:0;display:inline-block;"></span>' +
      '<span>' + prod.name + '</span></div>' +
      (prod.sku ? '<div style="font-size:10px;color:#9ca3af;padding-left:16px;">' + prod.sku + '</div>' : '') +
      '</td>';

    for (var wi = 0; wi < 4; wi++) {
      var pedido     = getOv(window.customWeeklyBarrilDemand, id, wi);
      var pronostico = getOv(window.customWeeklyForecastLiters, id, wi);
      var invInicial = getOv(window.customInventarioInicialOverrides, id, wi);
      if (invInicial === 0 && wi === 0) {
        var vol = (prod.volumePerUnit && prod.volumePerUnit > 0) ? prod.volumePerUnit : 1;
        invInicial = (prod.quantity || 0) * vol;
      }
      var res = calcCell(pedido, pronostico, invInicial);
      var pmp     = res.pmp;
      var invFinal = res.invFinal;

      var pmpStyle    = pmp > 0 ? 'font-weight:700;color:#047857;background:#ecfdf5;' : 'color:#9ca3af;background:#fefce8;';
      var invFStyle   = invFinal < 0 ? 'font-weight:700;color:#b91c1c;background:#fef2f2;' : 'font-weight:600;color:#92400e;background:#fffbeb;';
      var onclick     = 'onclick="window.editMPS(' + id + ',' + wi + ')"';

      var fmt = function(n) { return n % 1 === 0 ? String(n) : n.toFixed(1); };

      html += '<td class="border border-gray-200 p-1 text-center cursor-pointer" style="background:#f0fdf4;" ' +
          onclick + ' title="Clic para editar pedido" onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'#f0fdf4\'">' +
          '<span style="font-weight:600;color:#15803d;">' + fmt(pedido) + '</span></td>' +
        '<td class="border border-gray-200 p-1 text-center cursor-pointer" style="background:#eff6ff;" ' +
          onclick + ' title="Clic para editar pron\u00f3stico" onmouseenter="this.style.background=\'#dbeafe\'" onmouseleave="this.style.background=\'#eff6ff\'">' +
          '<span style="font-weight:600;color:#1d4ed8;">' + fmt(pronostico) + '</span></td>' +
        '<td class="border border-gray-200 p-1 text-center cursor-pointer" style="background:#faf5ff;" ' +
          onclick + ' title="Clic para editar inventario inicial" onmouseenter="this.style.background=\'#ede9fe\'" onmouseleave="this.style.background=\'#faf5ff\'">' +
          '<span style="font-weight:600;color:#6d28d9;">' + fmt(invInicial) + '</span></td>' +
        '<td class="border border-gray-200 p-1 text-center"><span style="' + pmpStyle + '">' + pmp + '</span></td>' +
        '<td class="border border-gray-200 p-1 text-center"><span style="' + invFStyle + '">' + fmt(invFinal) + '</span></td>';
    }
    html += '</tr>';
  });

  html += '<tr style="background:#f3f4f6;border-top:2px solid #d1d5db;">' +
    '<td class="p-2" colspan="' + (1 + 4 * 5) + '" style="font-size:10px;color:#6b7280;">' +
    '<span style="display:inline-flex;flex-wrap:wrap;gap:16px;">' +
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#bbf7d0;margin-right:4px;"></span>' +
    'Pedido / Pron\u00f3stico / Inv. Ini. \u2014 clic para editar</span>' +
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#fef08a;margin-right:4px;"></span>' +
    'PMP = 0 si demanda \u2264 Inv. Ini.; si no, PMP = ' + capacidadLote + ' L</span>' +
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#fecaca;margin-right:4px;"></span>' +
    'Inv. Final = Inv. Ini. \u2212 PMP \u2212 (Pedido + Pron\u00f3stico)</span>' +
    '</span></td></tr>';

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// --- 21. UTILIDAD ESTIMADA ---
/**
 * Calcula la utilidad restando costos de las ventas.
 */
export function calcularUtilidad(ventas, costos) {
    return ventas - costos;
}

// --- 22. PRODUCCIÓN MENSUAL ---
/**
 * Suma la producción de varias semanas para obtener el acumulado mensual.
 */
export function calcularProduccionMensual(semanas) {
    return semanas.reduce((acc, valor) => acc + valor, 0);
}

// --- 23. VALIDACIÓN DE CAPACIDAD ---
/**
 * Valida si la producción programada es menor o igual a la capacidad máxima.
 */
export function validarCapacidad(produccion, capacidad) {
    return produccion <= capacidad;
}

// --- 24. REQUERIMIENTO TOTAL MRP ---
/**
 * Consolida la suma de requerimientos netos.
 */
export function calcularMRP(requerimientos) {
    return requerimientos.reduce((acc, valor) => acc + valor, 0);
}

// --- 25. CÁLCULO DE STOCK DE SEGURIDAD ---
/**
 * Calcula el stock de seguridad sugerido en base al promedio de demanda.
 */
export function calcularStockSeguridad(promedioDemanda, porcentaje) {
    return promedioDemanda * porcentaje;
}

// --- 26. PUNTO DE REORDEN ---
/**
 * Calcula el punto de reorden para compras de materias primas.
 */
export function calcularPuntoReorden(demandaDiaria, tiempoEntrega, stockSeguridad) {
    return (demandaDiaria * tiempoEntrega) + stockSeguridad;
}

// --- 27. TIEMPO DE FERMENTACIÓN ---
/**
 * Calcula los días de disponibilidad del tanque en una semana (ej: 7 días menos tiempo fermentación).
 */
export function calcularDisponibilidadTanque(diasFermentacion, diasSemana = 7) {
    return diasSemana - diasFermentacion;
}

// --- NUEVO: CÁLCULO PMP (Producción Mínima por Planificación) ---
/**
 * Calcula la producción semanal mínima (PMP) basada en pedidos y pronóstico.
 * Regla industrial: si DemandaTotal <= loteMinimo => producir loteMinimo, sino producir loteCompleto.
 * @param {number} pedidos Litros de pedidos fijos (barril)
 * @param {number} pronostico Litros de pronóstico (botellas convertidos a L)
 * @param {Object} parametros sistema: { loteMinimo, capacidadTanque }
 */
export function calcularPMP(pedidos, pronostico, parametros = {}) {
    const p = Number(pedidos) || 0;
    const pr = Number(pronostico) || 0;
    const demandaTotal = p + pr;
    const loteMinimo = (parametros.loteMinimo !== undefined) ? Number(parametros.loteMinimo) : 80;
    const loteCompleto = (parametros.capacidadTanque !== undefined) ? Number(parametros.capacidadTanque) : 120;

    if (demandaTotal <= loteMinimo) return loteMinimo;
    return loteCompleto;
}

// --- 28. PRODUCCIÓN DISPONIBLE PARA BOTELLAS ---
/**
 * Calcula el volumen destinado a botellas de la capacidad libre (overflow).
 */
export function calcularProduccionBotellas(capacidadLibre, porcentajeBotellas = 1.0) {
    return capacidadLibre * porcentajeBotellas;
}

// --- 29. PROYECCIÓN DE DEMANDA ---
/**
 * Proyecta la demanda futura aplicando un porcentaje de crecimiento.
 */
export function proyectarDemanda(demandaActual, crecimiento) {
    return demandaActual * (1 + crecimiento);
}

// --- 30. CÁLCULO GENERAL MPS ---
/**
 * Ejecuta el cálculo macro del MPS para obtener capacidad, comprometido y overflow.
 */
export function ejecutarMPS(parametros) {
    const capacidad = calcularCapacidadTotal(
        parametros.tanques,
        parametros.capacidadTanque
    );
    const produccionComprometida = calcularProduccionTotal(
        parametros.pedidoPorSabor,
        parametros.numeroSabores
    );
    const overflow = calcularOverflow(
        capacidad,
        produccionComprometida
    );
    return {
        capacidad,
        produccionComprometida,
        overflow
    };
}

// --- 31. CÁLCULO GENERAL MRP ---
/**
 * Ejecuta la explosión del MRP para una receta y nivel de producción.
 */
export function ejecutarMRP(recetas, produccion) {
    return recetas.map(receta => {
        return {
            productId: receta.productId,
            ingredients: receta.ingredients.map(ing => {
                return {
                    ingredientProductId: ing.ingredientProductId,
                    requiredQty: ing.qtyPerUnit * produccion
                };
            })
        };
    });
}

// --- 32. CÁLCULO DE DEMANDA SEMANAL DESDE PEDIDOS ---
export function computeWeeklyDemandFromOrders() {
    const barril = [0, 0, 0, 0];
    const forecastL = [0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    window.orders.forEach(o => {
        const w = getWeekIndexFromToday(o.dueDate);
        const prod = window.inventory.find(p => p.id === o.productId);
        if (prod && prod.type !== 'raw') {
            barril[w] += o.qty * getProductVolumePerUnit(prod);
        }
    });

    window.forecasts.forEach(f => {
        const w = getWeekIndexFromToday(f.targetDate);
        const prod = window.inventory.find(p => p.id === f.productId);
        if (prod && prod.type !== 'raw') {
            forecastL[w] += f.qty * getProductVolumePerUnit(prod);
        }
    });

    return { barril, forecastL };
}

export function loadMRP() {
    // Implementación visual o de logs si es necesario
    console.log("MRP calculations module loaded");
}

// --- 33. CÁLCULO DE PRODUCCIÓN SEGÚN PRONÓSTICO ---
/**
 * Calcula la producción necesaria según el pronóstico de demanda por lotes completos.
 */
export function calcularProduccionPronostico(demanda, litrosPorLote) {
    if (!litrosPorLote) return 0;
    const lotes = Math.ceil(demanda / litrosPorLote);
    return lotes * litrosPorLote;
}

// --- 34. CÁLCULO DE DEMANDA SEMANAL PARA UN PRODUCTO INDIVIDUAL ---
export function computeWeeklyDemandForProduct(productId) {
    const barril = [0, 0, 0, 0];
    const forecastL = [0, 0, 0, 0];

    window.orders.forEach(o => {
        if (Number(o.productId) !== Number(productId)) return;
        const w = getWeekIndexFromToday(o.dueDate);
        if (w >= 0 && w <= 3) {
            const prod = window.inventory.find(p => p.id === o.productId);
            if (prod) {
                barril[w] += o.qty * getProductVolumePerUnit(prod);
            }
        }
    });

    window.forecasts.forEach(f => {
        if (Number(f.productId) !== Number(productId)) return;
        const w = getWeekIndexFromToday(f.targetDate);
        if (w >= 0 && w <= 3) {
            const prod = window.inventory.find(p => p.id === f.productId);
            if (prod) {
                forecastL[w] += f.qty * getProductVolumePerUnit(prod);
            }
        }
    });

    return { barril, forecastL };
}
