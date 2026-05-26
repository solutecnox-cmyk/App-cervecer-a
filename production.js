// production.js
// Implementaciones MPS/MRP y fórmulas matemáticas del Excel para la Cervecería

import { LITERS_PER_BOTTLE, getProductVolumePerUnit } from './utils.js';

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
    return inventarioInicial + produccion - demanda;
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
        const diffDays = Math.floor((new Date(o.dueDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
        const prod = window.inventory.find(p => p.id === o.productId);
        if (prod && prod.type !== 'raw') {
            barril[w] += o.qty * getProductVolumePerUnit(prod);
        }
    });

    window.forecasts.forEach(f => {
        const diffDays = Math.floor((new Date(f.targetDate) - today) / (1000 * 60 * 60 * 24));
        const w = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
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
