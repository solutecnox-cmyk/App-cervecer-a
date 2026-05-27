/**
 * pmp-interactive.js
 * Módulo para la gestión interactiva del Programa Maestro de Producción (PMP)
 * 
 * Características:
 * - Celdas editables para Pedido, Pronóstico e Inventario Inicial
 * - Cálculo automático de PMP basado en regla de demanda
 * - Cálculo automático de Inventario Final
 * - Almacenamiento en localStorage
 * - Exportación a CSV
 */

export class PMPInteractiveTable {
    constructor(containerId = 'mps-table-container', config = {}) {
        this.containerId = containerId;
        this.WEEKS = config.weeks || 4;
        this.PMP_PRODUCTION = config.pmpProduction || 120;
        this.PMP_MINIMUM = config.pmpMinimum || 0;
        this.products = config.products || [];
        this.pmpData = {};
        this.initialized = false;

        // Almacenar referencia global
        window.pmpInteractiveTable = this;
    }

    /**
     * Inicializa la estructura de datos del PMP
     */
    initialize(products = []) {
        if (products.length > 0) {
            this.products = products;
        }

        this.pmpData = {};
        this.products.forEach(product => {
            this.pmpData[product.id] = {};
            for (let week = 0; week < this.WEEKS; week++) {
                this.pmpData[product.id][week] = {
                    pedido: 0,
                    pronostico: 0,
                    inventarioInicial: 50,
                    pmp: 0,
                    inventarioFinal: 0
                };
            }
        });

        this.loadFromStorage();
        this.calculateAllPMP();
        this.initialized = true;
    }

    /**
     * Calcula PMP e Inventario Final para una celda específica
     * 
     * LÓGICA:
     * - Demanda = máx(Pedido, Pronóstico)
     * - PMP: Si (Pedido + Pronóstico) <= Inventario Inicial => PMP_MINIMUM (0), sino PMP_PRODUCTION (120)
     * - Inv. Final: Inventario Inicial - PMP - Demanda
     */
    calculatePMP(productId, week) {
        if (!this.pmpData[productId] || !this.pmpData[productId][week]) {
            return null;
        }

        const row = this.pmpData[productId][week];
        const pedido = parseFloat(row.pedido) || 0;
        const pronostico = parseFloat(row.pronostico) || 0;
        const inventarioInicial = parseFloat(row.inventarioInicial) || 0;

        // Demanda = máximo entre pedido y pronóstico
        const demanda = Math.max(pedido, pronostico);

        // PMP: Si (Pedido + Pronóstico) <= Inv. Inicial, entonces 0, sino 120
        const sumaPedidoPronostico = pedido + pronostico;
        row.pmp = (sumaPedidoPronostico <= inventarioInicial) ? this.PMP_MINIMUM : this.PMP_PRODUCTION;

        // Inventario Final = Inv. Inicial - PMP - Demanda
        row.inventarioFinal = inventarioInicial - row.pmp - demanda;

        return row;
    }

    /**
     * Recalcula todos los valores de PMP
     */
    calculateAllPMP() {
        this.products.forEach(product => {
            for (let week = 0; week < this.WEEKS; week++) {
                this.calculatePMP(product.id, week);
            }
        });
    }

    /**
     * Actualiza un valor específico de la tabla
     */
    updateCell(productId, week, field, value) {
        if (!this.pmpData[productId] || !this.pmpData[productId][week]) {
            return false;
        }

        const numValue = parseFloat(value) || 0;
        
        if (['pedido', 'pronostico', 'inventarioInicial'].includes(field)) {
            this.pmpData[productId][week][field] = numValue;
            this.calculatePMP(productId, week);
            this.updateDisplay(productId, week);
            return true;
        }
        return false;
    }

    /**
     * Actualiza la visualización de una celda en el DOM
     */
    updateDisplay(productId, week) {
        const data = this.pmpData[productId][week];

        const pmpCell = document.getElementById(`pmp-${productId}-${week}-pmp`);
        if (pmpCell) {
            pmpCell.textContent = data.pmp;
        }

        const finalCell = document.getElementById(`pmp-${productId}-${week}-final`);
        if (finalCell) {
            finalCell.textContent = data.inventarioFinal.toFixed(2);

            // Indicador visual para inventario negativo
            if (data.inventarioFinal < 0) {
                finalCell.classList.add('pmp-negative-inventory');
                finalCell.title = 'Inventario proyectado negativo - requiere atención';
            } else {
                finalCell.classList.remove('pmp-negative-inventory');
                finalCell.title = '';
            }
        }
    }

    /**
     * Renderiza la tabla HTML con todas las celdas
     */
    render() {
        if (!this.initialized) {
            console.error('PMP Table: Llama a initialize() primero');
            return;
        }

        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`PMP Table: Contenedor con ID "${this.containerId}" no encontrado`);
            return;
        }

        let html = '<div class="pmp-table-wrapper">';
        html += '<table class="pmp-interactive-table">';
        
        // Header con semanas
        html += '<thead><tr><th colspan="1">Concepto</th>';
        for (let w = 0; w < this.WEEKS; w++) {
            html += `<th colspan="5" class="pmp-week-header">Semana ${w + 1}</th>`;
        }
        html += '</tr>';

        // Header con columnas
        html += '<tr><th>Producto</th>';
        for (let w = 0; w < this.WEEKS; w++) {
            html += '<th class="pmp-col-header">Pedido</th>';
            html += '<th class="pmp-col-header">Pronóstico</th>';
            html += '<th class="pmp-col-header">Inv. Inicial</th>';
            html += '<th class="pmp-col-header">PMP</th>';
            html += '<th class="pmp-col-header">Inv. Final</th>';
        }
        html += '</tr></thead>';

        // Cuerpo de la tabla
        html += '<tbody>';
        this.products.forEach(product => {
            html += `<tr><td class="pmp-product-cell"><strong>${product.name}</strong></td>`;

            for (let week = 0; week < this.WEEKS; week++) {
                const data = this.pmpData[product.id][week];

                // Pedido (editable)
                html += `<td><div class="pmp-editable-cell">
                    <input type="number" 
                           value="${data.pedido}" 
                           onchange="pmpInteractiveTable.updateCell('${product.id}', ${week}, 'pedido', this.value)"
                           step="0.01" 
                           min="0" 
                           placeholder="0"
                           title="Cantidad de pedidos en litros">
                </div></td>`;

                // Pronóstico (editable)
                html += `<td><div class="pmp-editable-cell">
                    <input type="number" 
                           value="${data.pronostico}" 
                           onchange="pmpInteractiveTable.updateCell('${product.id}', ${week}, 'pronostico', this.value)"
                           step="0.01" 
                           min="0" 
                           placeholder="0"
                           title="Cantidad de pronóstico de ventas en litros">
                </div></td>`;

                // Inventario Inicial (editable)
                html += `<td><div class="pmp-editable-cell">
                    <input type="number" 
                           value="${data.inventarioInicial}" 
                           onchange="pmpInteractiveTable.updateCell('${product.id}', ${week}, 'inventarioInicial', this.value)"
                           step="0.01" 
                           min="0" 
                           placeholder="0"
                           title="Stock inicial en litros">
                </div></td>`;

                // PMP (calculado)
                html += `<td><div class="pmp-calculated-cell" id="pmp-${product.id}-${week}-pmp">
                    ${data.pmp}
                </div></td>`;

                // Inventario Final (calculado)
                html += `<td><div class="pmp-calculated-cell ${data.inventarioFinal < 0 ? 'pmp-negative-inventory' : ''}" id="pmp-${product.id}-${week}-final">
                    ${data.inventarioFinal.toFixed(2)}
                </div></td>`;
            }

            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    /**
     * Obtiene los datos actuales del PMP
     */
    getData() {
        return JSON.parse(JSON.stringify(this.pmpData));
    }

    /**
     * Establece datos en la tabla
     */
    setData(data) {
        this.pmpData = JSON.parse(JSON.stringify(data));
        this.calculateAllPMP();
        this.render();
    }

    /**
     * Guarda los datos en localStorage
     */
    saveToStorage(key = 'pmp-interactive-data') {
        localStorage.setItem(key, JSON.stringify(this.pmpData));
    }

    /**
     * Carga los datos desde localStorage
     */
    loadFromStorage(key = 'pmp-interactive-data') {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.pmpData = data;
            } catch (e) {
                console.error('Error al cargar datos del PMP:', e);
            }
        }
    }

    /**
     * Exporta los datos a CSV
     */
    exportToCSV(filename = null) {
        if (!filename) {
            filename = `PMP_${new Date().toISOString().split('T')[0]}.csv`;
        }

        let csv = 'Producto,Semana,Pedido,Pronóstico,Inv. Inicial,PMP,Inv. Final\n';

        this.products.forEach(product => {
            for (let week = 0; week < this.WEEKS; week++) {
                const data = this.pmpData[product.id][week];
                csv += `${product.name},${week + 1},${data.pedido},${data.pronostico},${data.inventarioInicial},${data.pmp},${data.inventarioFinal.toFixed(2)}\n`;
            }
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Reinicia todos los datos a cero
     */
    reset() {
        this.products.forEach(product => {
            for (let week = 0; week < this.WEEKS; week++) {
                this.pmpData[product.id][week] = {
                    pedido: 0,
                    pronostico: 0,
                    inventarioInicial: 50,
                    pmp: 0,
                    inventarioFinal: 0
                };
            }
        });
        this.calculateAllPMP();
        this.render();
    }

    /**
     * Obtiene información de una semana específica
     */
    getWeekSummary(week) {
        const summary = {
            week,
            totalPedido: 0,
            totalPronostico: 0,
            totalPMP: 0,
            products: []
        };

        this.products.forEach(product => {
            const data = this.pmpData[product.id][week];
            summary.totalPedido += data.pedido;
            summary.totalPronostico += data.pronostico;
            summary.totalPMP += data.pmp;
            summary.products.push({
                name: product.name,
                ...data
            });
        });

        return summary;
    }
}

// Exportar para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PMPInteractiveTable;
}
