# 🍺 ERP Sistema de Gestión para Cervecería Artesanal

Sistema completo de Enterprise Resource Planning (ERP) especializado en planificación y gestión de inventarios para cervecería artesanal, con módulos de MPS, MRP, compras automáticas y dashboard ejecutivo.

## 📋 Características Principales

✅ **Módulo de Parámetros**: Configuración flexible del sistema
✅ **Gestión de Recetas (BOM)**: Definición de fórmulas por sabor
✅ **Master Production Schedule (MPS)**: Planificación de producción por demanda
✅ **Material Requirements Planning (MRP)**: Explosión de materiales automática
✅ **Canal de Gastrobares**: Planificación para ventas a granel
✅ **Canal de Botellas**: Planificación para ventas de botellas
✅ **Órdenes de Compra Automáticas**: Generación inteligente con redondeo
✅ **Gestión de Tanques**: Control de capacidad y cronograma
✅ **Bodegas y Lotes**: Trazabilidad completa
✅ **Alertas Inteligentes**: Validaciones automáticas
✅ **Dashboard Ejecutivo**: KPIs y métricas clave
✅ **API RESTful**: Interfaz completa

## 🏗️ Estructura del Proyecto

```
Aplicacion gestion de inventarios cerveceria/
├── backend/
│   ├── index.js                    # Servidor principal
│   ├── package.json               # Dependencias
│   ├── prisma/
│   │   └── schema.prisma          # Modelos de BD
│   ├── routes/                    # Endpoints de API
│   │   ├── parametros.js
│   │   ├── productos.js
│   │   ├── proveedores.js
│   │   ├── clientes.js
│   │   ├── recetas.js
│   │   ├── tanques.js
│   │   ├── bodegas.js
│   │   ├── mps.js
│   │   ├── mrp.js
│   │   ├── ordenesCompra.js
│   │   ├── alertas.js
│   │   └── dashboard.js
│   └── services/
│       └── calculosErp.js         # Lógica de negocio
├── frontend/
│   ├── Index.html                 # Interfaz principal
│   ├── funciones.js               # Lógica frontend
│   ├── styles.css                 # Estilos
│   └── ...
└── README.md
```

## 🚀 Instalación y Ejecución

### Requisitos
- Node.js v16+
- npm o yarn
- SQLite3

### Paso 1: Instalar dependencias del backend

```bash
cd backend
npm install
```

### Paso 2: Configurar base de datos

```bash
npm run prisma:push
```

### Paso 3: Iniciar el servidor

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:5000`

### Paso 4: Verificar salud del servidor

```bash
curl http://localhost:5000/api/health
```

## 📊 Módulos de Negocio

### MPS (Master Production Schedule)
- **Entrada**: Pedidos de clientes (CustomerOrder)
- **Lógica**: Si demanda > inventario disponible → producir 120L
- **Salida**: Plan de producción por semana
- **Overflow**: Cantidad que pasa al canal de botellas

### MRP (Material Requirements Planning)
- **Entrada**: Plan de producción (MPS)
- **Lógica**: Explosión de materiales según recetas
- **Cálculos**:
  - Necesidades brutas = producción × consumo/L
  - Necesidades netas = necesidades brutas - disponible
  - Lanzamiento de órdenes
- **Salida**: Plan de compras por semana

### Canal de Botellas
- **Conversión**: 1L = 3.025 botellas de 330mL
- **Semanas 1-2**: Procesa overflow del MPS
- **Semanas 3-4**: Producción dedicada (363 botellas/semana)
- **Proyección**: Inventario final de producto terminado

### Órdenes de Compra
- **Redondeo Automático**: TECHO según unidad de compra
  - Ejemplo: Necesita 17kg, unidad=25kg → Ordena 25kg
- **Campos**: Cantidad, cantidad UC, lead time, proveedor, fechas
- **Estado**: pendiente → emitida → recibida

## 🔧 API Endpoints

### Parámetros
```http
GET    /api/parametros              # Obtener parámetros
PUT    /api/parametros              # Actualizar parámetros
```

### Productos
```http
GET    /api/productos               # Listar productos
GET    /api/productos/:id           # Obtener producto
POST   /api/productos               # Crear producto
PUT    /api/productos/:id           # Actualizar producto
DELETE /api/productos/:id           # Eliminar producto
```

### MPS
```http
GET    /api/mps                     # Obtener MPS
POST   /api/mps/calcular            # Calcular MPS para semana
```

### MRP
```http
GET    /api/mrp                     # Obtener MRP
POST   /api/mrp/calcular            # Calcular MRP para semana
```

### Órdenes de Compra
```http
GET    /api/ordenes-compra          # Listar órdenes
POST   /api/ordenes-compra/generar  # Generar órdenes desde MRP
PUT    /api/ordenes-compra/:id      # Actualizar orden
```

### Dashboard
```http
GET    /api/dashboard/dashboard     # KPIs ejecutivos
POST   /api/dashboard/canal-botellas # Calcular canal botellas
POST   /api/dashboard/validar       # Generar alertas
```

## 📈 KPIs Principales

- **Litros Producidos**: Suma de producción en MPS
- **Botellas Producidas**: Inventario final de canal botellas
- **Inventario Proyectado**: Stock disponible total
- **Utilización de Tanques**: % tanques ocupados
- **Órdenes Pendientes**: Número de compras no procesadas
- **Alertas Críticas**: Problemas sin resolver

## ⚙️ Configuración de Parámetros

Editar en `/api/parametros`:

```json
{
  "numeroTanques": 6,
  "capacidadTanque": 120,
  "diasFermentacion": 7,
  "litrosPorLote": 120,
  "capacidadSemanal": 720,
  "operarioMaxSabores": 2,
  "capacidadOperaria": 120
}
```

## 🍺 Sabores de Cerveza Incluidos

1. **IPA Pijao** - India Pale Ale clásica
2. **IPA Honey** - IPA con miel
3. **Saison** - Tipo belga con miel
4. **Golden Ale** - Ale dorada
5. **Porter** - Oscura y robusta
6. **Irish Red Ale** - Roja irlandesa

## 📊 Datos Iniciales

El sistema incluye datos de ejemplo con:
- 2 proveedores configurados
- 10 materias primas
- 6 productos finales
- 6 recetas completas
- 2 clientes gastrobares
- Parámetros preconfigurados

## 🔍 Validaciones del Sistema

✓ Máximo 6 lotes simultáneos en tanques
✓ Fermentación se libera después de 7 días
✓ Máximo 2 sabores diferentes por día (operario)
✓ Alertas si inventario baja de stock seguridad
✓ Alertas si pedidos vencen (lead time)

## 🚨 Troubleshooting

### Error: "Cannot find Prisma Client"
```bash
npm install @prisma/client
```

### Error: "dev.db already exists"
```bash
npm run prisma:push
```

### Error de puerto en uso
```bash
# Cambiar puerto en .env
PORT=5001
```

## 📝 Notas de Desarrollo

- Base de datos SQLite automática
- Todas las cantidades en unidades base (L, kg, und)
- Fechas en ISO 8601
- Conversión automática de botellas: 1L = 3.025 × 330mL

## 📚 Documentación Adicional

Ver `/memories/repo/erp_cerveceria_structure.md` para detalles técnicos.

## 📄 Licencia

Proyecto privado para gestión de cervecería artesanal.
