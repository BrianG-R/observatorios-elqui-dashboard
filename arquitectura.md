# Documentación técnica — NASA NeoWs Big Data Dashboard

## Arquitectura detallada

### Diagrama textual de flujo de datos

```
┌─────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                    │
│                         index.html                          │
│   Header (filtros de fecha) → Main (secciones) → Footer    │
└────────────────────────┬────────────────────────────────────┘
                         │ Eventos de usuario
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORQUESTADOR (dashboard.js)                │
│   loadData() → filterTable() → _renderKPIs() → _renderTable │
└────┬───────────────┬───────────────┬────────────────────────┘
     │               │               │
     ▼               ▼               ▼
┌────────┐    ┌──────────────┐  ┌──────────┐
│ api.js │    │dataProcessor │  │ charts.js│
│        │    │    .js       │  │          │
│ fetch  │    │ clean()      │  │ Chart.js │
│ chunk  │    │ calcKPIs()   │  │ 9 tipos  │
│ split  │    │ insights()   │  │ de viz   │
└────────┘    └──────────────┘  └──────────┘
     │               │
     ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FUENTE DE DATOS                           │
│        NASA NeoWs API — api.nasa.gov/neo/rest/v1/feed       │
│   Rate limit: 30 req/h (BWRPXC4efdZ9lo9TzmcWWd6QQT3aduBAGsfd1aUf) / 1000 req/h (personal)  │
└─────────────────────────────────────────────────────────────┘
```

### Procesamiento ETL (Extract, Transform, Load)

**Extract:** `api.js` divide rangos >7 días en chunks, hace fetch secuencial y aplana la respuesta jerárquica por fecha en un array plano.

**Transform:** `dataProcessor.js` aplica:
1. Validación de existencia de `close_approach_data`
2. Parseo y validación de floats (velocidad, distancia, diámetros)
3. Filtrado de valores negativos o cero
4. Normalización de unidades (todo en km y km/h)
5. Cálculo de diámetro medio
6. Ordenamiento cronológico

**Load:** Los registros limpios se pasan directamente a los módulos de visualización y tabla — no se persisten (arquitectura stateless client-side).

---

## Guía de extensión del proyecto

### Añadir un nuevo KPI

1. En `dataProcessor.js`, agregar el cálculo dentro de `calcularKPIs()`
2. En `index.html`, agregar una tarjeta `.kpi-card` con el `id` correspondiente
3. En `dashboard.js`, actualizar `_renderKPIs()` con la llamada a `set('nuevoId', valor)`

### Añadir un nuevo gráfico

1. En `index.html`, agregar el bloque `<div class="chart-card">` con el `<canvas id="chartNuevo">`
2. En `charts.js`, agregar el método con la lógica Chart.js
3. En `charts.js`, llamar al método desde `renderAll(kpis)`

### Cambiar la API key

En `js/api.js`, línea 13:
```javascript
KEY: 'TU_CLAVE_PERSONAL',
```

### Ampliar el rango máximo de fechas

En `js/dashboard.js`, línea 42:
```javascript
if (diffDays > 60) {  // Cambiar a 90 o más según límites de rate
```

---

## KPIs — Fórmulas de cálculo

| KPI | Fórmula |
|-----|---------|
| Velocidad promedio | `Σ velocidad[i] / n` |
| % Peligrosos | `(peligrosos / total) × 100` |
| Diámetro medio | `(diamMin + diamMax) / 2` |
| Histograma | `bucket = floor((v - min) / stepSize)` |
| Top N | `sort desc por campo → slice(0, N)` |

---

## Limitaciones conocidas

- La BWRPXC4efdZ9lo9TzmcWWd6QQT3aduBAGsfd1aUf de NASA tiene un límite de **30 requests/hora**. Rangos superiores a 30 días pueden agotar el cupo.
- Chart.js no acepta variables CSS: los colores están hardcodeados en `charts.js`.
- El scatter plot puede verse congestionado con más de 500 puntos; se recomienda un máximo de 30 días para visualizaciones óptimas.
- No hay persistencia de datos entre sesiones (sin localStorage ni backend).
