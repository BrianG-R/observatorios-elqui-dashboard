# ☄ NASA NeoWs — Big Data & BI Dashboard

> Dashboard analítico universitario para el análisis de asteroides cercanos a la Tierra mediante técnicas de Big Data y Business Intelligence.

**Integrantes:** Bastian Alfaro · Brian Gomez  
**Asignatura:** Big Data & Business Intelligence  
**Tecnologías:** HTML5 · CSS3 · JavaScript ES6 · Chart.js · NASA NeoWs API  
**Despliegue:** GitHub Pages  

---

## Descripción

Este proyecto consume datos reales desde la **NASA NeoWs API (Near Earth Object Web Service)** y los transforma en un dashboard ejecutivo con KPIs, visualizaciones avanzadas e insights automáticos, aplicando principios de Big Data y Business Intelligence sin necesidad de bases de datos ni frameworks externos.

---

## Objetivos académicos

- Consumir y procesar datos desde una fuente real en tiempo real (NASA Open APIs)
- Aplicar las **5V del Big Data** sobre datos históricos de asteroides
- Implementar técnicas de **Business Intelligence**: KPIs, aggregaciones, perfilamiento de riesgo
- Construir una solución desplegable en **GitHub Pages** sin backend

---

## Justificación Big Data — Las 5V

| V | Aplicación en NeoWs |
|---|---|
| **Volumen** | Miles de registros históricos de NEOs disponibles desde 1900 hasta hoy |
| **Velocidad** | La NASA actualiza los datos diariamente; la API devuelve resultados en tiempo real |
| **Variedad** | Datos numéricos (velocidad, distancia, diámetro), booleanos (peligroso), timestamps y strings (nombre, órbita) |
| **Veracidad** | Fuente oficial NASA/JPL; el módulo `dataProcessor.js` limpia registros inválidos y normaliza unidades |
| **Valor** | Generación de KPIs ejecutivos, detección de riesgo, análisis de tendencias y hallazgos automáticos |

---

## Por qué es una solución BI

- Transforma datos brutos de la API en **indicadores de decisión** (KPIs ejecutivos)
- Permite **segmentación** por categoría de riesgo y comparación de grupos
- Genera **insights automáticos** basados en umbrales estadísticos
- Visualiza **tendencias temporales** y distribuciones físicas
- El modelo de datos normalizado puede exportarse a cualquier herramienta BI (Power BI, Tableau)

---

## Arquitectura de la solución

```
[NASA NeoWs API]
      ↓  HTTP GET (fetch + chunking por 7 días)
[api.js — Capa de acceso a datos]
      ↓  Array crudo de NEOs
[dataProcessor.js — ETL + KPIs]
      ↓  Registros limpios + 20+ KPIs calculados
[dashboard.js — Orquestador]
      ↓              ↓
[charts.js]    [Tabla analítica + Insights]
  Chart.js → Canvas renders
      ↓
[GitHub Pages — Despliegue estático]
```

---

## Estructura del repositorio

```
/NASA-BigData-Dashboard
│
├── index.html              # Página principal del dashboard
│
├── styles.css          # Estilos (tema espacial oscuro, responsive)
│
├── api.js
├── dataProcessor.js
├── charts.js
├── dashboard.js
│
├── assets/                 # Imágenes y recursos estáticos (futuro)
├── data/                   # JSONs de muestra para desarrollo offline (futuro)
├── docs/                   # Documentación técnica adicional
│
└── README.md               # Este archivo
```

**Función de cada carpeta:**
- `css/` — Separación de estilos para mantenibilidad y reutilización
- `js/` — Arquitectura modular: cada archivo tiene responsabilidad única (SRP)
- `assets/` — Recursos estáticos reutilizables (logos, íconos, imágenes)
- `data/` — Muestras de datos para desarrollo sin conexión a la API
- `docs/` — Entregables académicos, diagramas y documentación técnica

---

## Modelo de datos

Cada registro procesado por `dataProcessor.js` tiene la siguiente estructura:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador único NASA/JPL |
| `nombre` | string | Nombre oficial del asteroide |
| `fecha` | string (YYYY-MM-DD) | Fecha de aproximación más cercana |
| `velocidad` | number (km/h) | Velocidad relativa en km/h |
| `distancia` | number (km) | Distancia de máxima aproximación en km |
| `diametroMin` | number (km) | Diámetro estimado mínimo en km |
| `diametroMax` | number (km) | Diámetro estimado máximo en km |
| `diametroMed` | number (km) | Diámetro promedio (min+max)/2 |
| `peligroso` | boolean | Es potencialmente peligroso (PHO) |
| `magnitud` | number | Magnitud absoluta H |
| `orbitaId` | string | ID de órbita en base JPL |
| `urlNASA` | string | URL ficha técnica en NASA JPL |

---

## KPIs implementados

| # | KPI | Tipo |
|---|-----|------|
| 1 | Total de asteroides registrados | Volumen |
| 2 | Total potencialmente peligrosos | Riesgo |
| 3 | Total no peligrosos | Riesgo |
| 4 | % de asteroides peligrosos | Riesgo |
| 5 | Velocidad promedio (km/h) | Física |
| 6 | Velocidad máxima registrada | Física |
| 7 | Velocidad mínima registrada | Física |
| 8 | Velocidad promedio — peligrosos | Comparativo |
| 9 | Velocidad promedio — no peligrosos | Comparativo |
| 10 | Distancia promedio de aproximación (km) | Física |
| 11 | Distancia mínima registrada (km) | Riesgo |
| 12 | Distancia máxima registrada (km) | Física |
| 13 | Diámetro promedio (km) | Física |
| 14 | Diámetro máximo registrado (km) | Física |
| 15 | Diámetro mínimo registrado (km) | Física |
| 16 | Asteroide más rápido (nombre) | Record |
| 17 | Asteroide más cercano (nombre) | Record |
| 18 | Asteroide más grande (nombre) | Record |
| 19 | Días con registros en el período | Temporal |
| 20 | Promedio de asteroides por día | Temporal |
| 21 | Mes con mayor actividad de NEOs | Temporal |
| 22 | Fecha de inicio del dataset | Metadata |
| 23 | Fecha de fin del dataset | Metadata |

---

## Visualizaciones

| Gráfico | Tipo Chart.js | KPIs que responde | Justificación |
|---------|--------------|-------------------|---------------|
| Asteroides por día | Line | KPI 20, 22, 23 | Series temporales continuas → tendencias y picos |
| Distribución de velocidades | Bar (histograma) | KPI 5, 6, 7 | Distribución estadística → asimetrías y outliers |
| Peligrosos vs. no peligrosos | Doughnut | KPI 2, 3, 4 | Proporciones parte/todo → máxima claridad visual |
| Velocidad por riesgo | Bar | KPI 8, 9 | Comparación de dos grupos discretos → barras verticales |
| Radar de métricas | Radar | Multi-KPI | Comparación multidimensional entre dos perfiles |
| Distribución de diámetros | Bar (histograma) | KPI 13, 14, 15 | Distribución de tamaños → cola larga esperada |
| Velocidad vs. distancia | Scatter | KPI 5, 10, 11 | Correlación y outliers entre dos variables continuas |
| Top 10 más rápidos | Horizontal Bar | KPI 16 | Rankings con etiquetas largas → barras horizontales |
| Top 10 más grandes | Horizontal Bar | KPI 18 | Rankings con etiquetas largas → barras horizontales |

---

## Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/NASA-BigData-Dashboard.git
cd NASA-BigData-Dashboard

# 2. Abrir con Live Server (VS Code) o cualquier servidor local
# No requiere npm install ni dependencias adicionales

# 3. O simplemente abrir index.html en un navegador moderno
open index.html
```

> **Nota:** La API key `BWRPXC4efdZ9lo9TzmcWWd6QQT3aduBAGsfd1aUf` incluida es válida para pruebas (30 req/hora).  
> Para uso intensivo, obtén tu clave gratuita en https://api.nasa.gov/

---

## Despliegue en GitHub Pages

```bash
# 1. Subir al repositorio GitHub
git add .
git commit -m "feat: dashboard NASA NeoWs Big Data"
git push origin main

# 2. En GitHub: Settings → Pages → Source: main branch → / (root) → Save

# 3. El dashboard queda disponible en:
# https://TU_USUARIO.github.io/NASA-BigData-Dashboard/
```

---

## Conclusiones académicas

**Big Data:** NeoWs provee datos con alto Volumen (millones de registros históricos), Velocidad (actualizaciones diarias en tiempo real), Variedad (tipos numéricos, booleanos, texto, timestamps), Veracidad (fuente oficial NASA/JPL con ETL propio) y Valor demostrado mediante KPIs ejecutivos y detección de riesgo. El procesamiento en cliente con JavaScript ES6 demuestra que el paradigma Big Data no requiere necesariamente infraestructura pesada cuando el volumen se gestiona con técnicas adecuadas de paginación y agregación.

**Business Intelligence:** El dashboard transforma datos astronómicos brutos en información de decisión: identifica objetos de alto riesgo, detecta tendencias temporales, perfila grupos por peligrosidad y genera insights automáticos. Estos son los pilares de cualquier solución BI profesional.

**Extensiones futuras:**
- Integrar APOD API para correlacionar eventos astronómicos con noticias
- Añadir exportación a CSV/Excel para análisis en herramientas BI tradicionales
- Implementar predicción de trayectorias con ML (TensorFlow.js)
- Añadir mapa orbital 3D con Three.js
- Comparar con datos históricos almacenados en localStorage

---

## Referencias

- NASA NeoWs API: https://api.nasa.gov/
- Chart.js Documentation: https://www.chartjs.org/docs/
- NASA JPL Small-Body Database: https://ssd.jpl.nasa.gov/
- Microsoft Azure Documentation: https://learn.microsoft.com/azure/


## Nueva arquitectura ETL

NASA NeoWs API + Open-Meteo API

1. Extracción de asteroides.
2. Extracción de condiciones meteorológicas.
3. Transformación: generación de índice de riesgo e índice de observación.
4. Carga en localStorage.
5. Consumo desde almacenamiento local.
6. Actualización manual mediante botón "Actualizar NASA".



## Dashboard BI Final
Incluye NASA NeoWs + Open-Meteo + localStorage + índice de observación + alertas.


## Modo Desarrollo (sin consumir APIs)

Editar config.js:

DEV_MODE: true

El dashboard utiliza:
data/snapshot.json

DEV_MODE: false

Permite consumir NASA + Open-Meteo y actualizar el snapshot.
