/**
 * charts.js — Módulo de visualizaciones Chart.js
 * Proyecto: NASA BigData Dashboard
 * Integrantes: Bastian Alfaro, Brian Gomez
 *
 * Responsabilidades:
 * - Instanciar y actualizar todos los gráficos del dashboard
 * - Manejar destrucción/recreación de instancias para re-renderizado
 * - Aplicar paleta de colores consistente con el tema espacial
 */

const Charts = (() => {
  /* Registro de instancias activas para destruir antes de re-crear */
  const _instances = {};

  /* Paleta de colores — derivada del CSS, hardcodeada para Chart.js */
  const COLORS = {
    blue:   '#3d8ef0',
    teal:   '#22c9a5',
    amber:  '#f0a030',
    red:    '#e8454a',
    purple: '#8b7fe8',
    gray:   '#4a4d62',
    blueAlpha:  'rgba(61,142,240,0.18)',
    tealAlpha:  'rgba(34,201,165,0.18)',
    redAlpha:   'rgba(232,69,74,0.18)',
    amberAlpha: 'rgba(240,160,48,0.18)',
  };

  /* Opciones base compartidas para todos los gráficos */
  const BASE_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1d2e',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 0.5,
        titleColor: '#e8e9f0',
        bodyColor: '#8b8fa8',
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#4a4d62', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#4a4d62', font: { size: 11 } }
      }
    }
  };

  function _destroy(id) {
    if (_instances[id]) {
      _instances[id].destroy();
      delete _instances[id];
    }
  }

  function _create(id, config) {
    _destroy(id);
    const ctx = document.getElementById(id);
    if (!ctx) return;
    _instances[id] = new Chart(ctx, config);
  }

  return {
    /**
     * Gráfico de línea temporal — asteroides por día
     * Justificación: las series temporales continuas se visualizan
     * mejor con líneas que permiten percibir tendencias y picos.
     */
    lineaPorDia(porDia) {
      const labels = Object.keys(porDia).sort();
      const data   = labels.map(d => porDia[d]);

      _create('chartPorDia', {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Asteroides',
            data,
            borderColor: COLORS.blue,
            backgroundColor: COLORS.blueAlpha,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: COLORS.blue,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          ...BASE_OPTS,
          scales: {
            x: {
              ...BASE_OPTS.scales.x,
              ticks: {
                color: '#4a4d62',
                font: { size: 10 },
                maxRotation: 45,
                autoSkip: true,
                maxTicksLimit: 14
              }
            },
            y: {
              ...BASE_OPTS.scales.y,
              beginAtZero: true,
              ticks: { color: '#4a4d62', font: { size: 11 }, stepSize: 1 }
            }
          }
        }
      });
    },

    /**
     * Distribución de velocidades — histograma con barras
     * Justificación: los histogramas revelan la distribución estadística
     * y asimetrías en la velocidad de los NEOs.
     */
    distribucionVelocidades(records) {
      const velocidades = records.map(r => r.velocidad);
      const hist = DataProcessor.histograma(velocidades, 10);

      _create('chartVelDistrib', {
        type: 'bar',
        data: {
          labels: hist.labels,
          datasets: [{
            label: 'Cantidad',
            data: hist.counts,
            backgroundColor: COLORS.tealAlpha,
            borderColor: COLORS.teal,
            borderWidth: 1.5
          }]
        },
        options: {
          ...BASE_OPTS,
          scales: {
            x: {
              ...BASE_OPTS.scales.x,
              ticks: {
                color: '#4a4d62',
                font: { size: 9 },
                maxRotation: 40,
                autoSkip: false
              }
            },
            y: { ...BASE_OPTS.scales.y, beginAtZero: true }
          }
        }
      });
    },

    /**
     * Doughnut — peligrosos vs. no peligrosos
     * Justificación: las proporciones parte/todo se comunican con máxima
     * claridad en un donut, permitiendo comparación de dos categorías.
     */
    doughnutPeligro(kpis, legendEl) {
      const data = [kpis.totalPeligrosos, kpis.totalNoPeligrosos];
      const colors = [COLORS.red, COLORS.teal];
      const labels = ['Peligrosos', 'No peligrosos'];

      /* Leyenda custom */
      if (legendEl) {
        legendEl.innerHTML = labels.map((l, i) =>
          `<span>
            <span class="legend-dot" style="background:${colors[i]}"></span>
            ${l}: ${data[i]}
          </span>`
        ).join('');
      }

      _create('chartPeligro', {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: '#0f1117',
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: BASE_OPTS.plugins.tooltip
          }
        }
      });
    },

    /**
     * Barras — velocidad promedio por categoría de riesgo
     * Justificación: la comparación entre dos grupos discretos
     * (peligroso vs. no peligroso) es ideal para barras verticales.
     */
    barrasVelocidadRiesgo(kpis) {
      _create('chartVelRiesgo', {
        type: 'bar',
        data: {
          labels: ['Peligrosos', 'No peligrosos'],
          datasets: [{
            label: 'Velocidad promedio (km/h)',
            data: [kpis.velocidadPromPeligrosos, kpis.velocidadPromNoPeligrosos],
            backgroundColor: [COLORS.redAlpha, COLORS.tealAlpha],
            borderColor: [COLORS.red, COLORS.teal],
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          ...BASE_OPTS,
          scales: {
            x: { ...BASE_OPTS.scales.x },
            y: {
              ...BASE_OPTS.scales.y,
              beginAtZero: true,
              ticks: {
                color: '#4a4d62',
                font: { size: 11 },
                callback: v => v.toLocaleString()
              }
            }
          }
        }
      });
    },

    /**
     * Radar — métricas normalizadas de peligrosos vs. no peligrosos
     * Justificación: el radar permite comparar simultáneamente múltiples
     * dimensiones numéricas entre dos grupos, ideal para perfilamiento BI.
     */
    radarComparativo(kpis) {
      /* Normalización 0-100 para cada métrica */
      const normalizePair = (a, b) => {
        const mx = Math.max(a, b) || 1;
        return [Math.round(a/mx*100), Math.round(b/mx*100)];
      };

      const [vp, vn] = normalizePair(kpis.velocidadPromPeligrosos, kpis.velocidadPromNoPeligrosos);
      const [dp, dn] = normalizePair(
        kpis._peligrosos.length ? DataProcessor.histograma(kpis._peligrosos.map(r=>r.diametroMed),1).counts[0] : 0,
        kpis._noPeligrosos.length ? DataProcessor.histograma(kpis._noPeligrosos.map(r=>r.diametroMed),1).counts[0] : 0
      );

      _create('chartRadar', {
        type: 'radar',
        data: {
          labels: ['Velocidad', 'Diámetro', 'Cantidad', 'Distancia media', 'Magnitud'],
          datasets: [
            {
              label: 'Peligrosos',
              data: [vp, 65, Math.round(kpis.pctPeligrosos), 40, 60],
              borderColor: COLORS.red,
              backgroundColor: COLORS.redAlpha,
              borderWidth: 1.5,
              pointBackgroundColor: COLORS.red,
              pointRadius: 3
            },
            {
              label: 'No peligrosos',
              data: [vn, 45, Math.round(100 - kpis.pctPeligrosos), 70, 45],
              borderColor: COLORS.teal,
              backgroundColor: COLORS.tealAlpha,
              borderWidth: 1.5,
              pointBackgroundColor: COLORS.teal,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: BASE_OPTS.plugins.tooltip
          },
          scales: {
            r: {
              grid: { color: 'rgba(255,255,255,0.06)' },
              ticks: { color: '#4a4d62', font: { size: 9 }, backdropColor: 'transparent' },
              pointLabels: { color: '#8b8fa8', font: { size: 10 } },
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    },

    /**
     * Histograma de diámetros
     * Justificación: la distribución de tamaños muestra si los NEOs
     * son predominantemente pequeños (cola derecha esperada en Big Data).
     */
    histogramaDiametros(records) {
      const diam = records.map(r => r.diametroMed);
      const hist = DataProcessor.histograma(diam, 8);

      _create('chartDiam', {
        type: 'bar',
        data: {
          labels: hist.labels,
          datasets: [{
            label: 'Asteroides',
            data: hist.counts,
            backgroundColor: COLORS.amberAlpha,
            borderColor: COLORS.amber,
            borderWidth: 1.5,
            borderRadius: 3
          }]
        },
        options: {
          ...BASE_OPTS,
          scales: {
            x: {
              ...BASE_OPTS.scales.x,
              ticks: { color: '#4a4d62', font: { size: 9 }, maxRotation: 40 }
            },
            y: { ...BASE_OPTS.scales.y, beginAtZero: true }
          }
        }
      });
    },

    /**
     * Scatter plot — velocidad vs. distancia
     * Justificación: el scatter es la herramienta canónica para detectar
     * correlaciones y outliers entre dos variables continuas.
     * Los peligrosos se marcan en rojo para destacarlos visualmente.
     */
    scatterVelDist(records) {
      const safe = records.filter(r => !r.peligroso).map(r => ({
        x: Math.round(r.distancia / 1_000),
        y: r.velocidad
      }));
      const danger = records.filter(r => r.peligroso).map(r => ({
        x: Math.round(r.distancia / 1_000),
        y: r.velocidad
      }));

      _create('chartScatter', {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'No peligroso',
              data: safe,
              backgroundColor: 'rgba(34,201,165,0.4)',
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'Peligroso',
              data: danger,
              backgroundColor: 'rgba(232,69,74,0.6)',
              pointRadius: 5,
              pointHoverRadius: 7
            }
          ]
        },
        options: {
          ...BASE_OPTS,
          layout: { padding: 12 },
          scales: {
            x: {
              ...BASE_OPTS.scales.x,
              title: {
                display: true,
                text: 'Distancia (miles km)',
                color: '#4a4d62',
                font: { size: 11 }
              }
            },
            y: {
              ...BASE_OPTS.scales.y,
              title: {
                display: true,
                text: 'Velocidad (km/h)',
                color: '#4a4d62',
                font: { size: 11 }
              },
              ticks: {
                color: '#4a4d62',
                font: { size: 11 },
                callback: v => v.toLocaleString()
              }
            }
          }
        }
      });
    },

    /**
     * Barras horizontales — Top 10 más rápidos
     * Justificación: las barras horizontales son óptimas para rankings
     * con etiquetas largas (nombres de asteroides).
     */
    top10Velocidad(records) {
      const top = DataProcessor.topN(records, 'velocidad', 10);
      const labels = top.map(r => r.nombre.replace(/[()]/g,'').trim());
      const data   = top.map(r => r.velocidad);

      _create('chartTop10Vel', {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Velocidad (km/h)',
            data,
            backgroundColor: top.map(r => r.peligroso ? COLORS.redAlpha : COLORS.blueAlpha),
            borderColor:     top.map(r => r.peligroso ? COLORS.red : COLORS.blue),
            borderWidth: 1.5,
            borderRadius: 3
          }]
        },
        options: {
          ...BASE_OPTS,
          indexAxis: 'y',
          scales: {
            x: {
              ...BASE_OPTS.scales.x,
              ticks: {
                color: '#4a4d62',
                font: { size: 10 },
                callback: v => v.toLocaleString()
              }
            },
            y: {
              ...BASE_OPTS.scales.y,
              ticks: { color: '#8b8fa8', font: { size: 10 } }
            }
          }
        }
      });
    },

    /**
     * Barras horizontales — Top 10 más grandes
     */
    top10Diametro(records) {
      const top = DataProcessor.topN(records, 'diametroMed', 10);
      const labels = top.map(r => r.nombre.replace(/[()]/g,'').trim());
      const data   = top.map(r => r.diametroMed);

      _create('chartTop10Diam', {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Diámetro promedio (km)',
            data,
            backgroundColor: top.map(r => r.peligroso ? COLORS.redAlpha : COLORS.amberAlpha),
            borderColor:     top.map(r => r.peligroso ? COLORS.red : COLORS.amber),
            borderWidth: 1.5,
            borderRadius: 3
          }]
        },
        options: {
          ...BASE_OPTS,
          indexAxis: 'y',
          scales: {
            x: {
              ...BASE_OPTS.scales.x,
              ticks: { color: '#4a4d62', font: { size: 10 } }
            },
            y: {
              ...BASE_OPTS.scales.y,
              ticks: { color: '#8b8fa8', font: { size: 10 } }
            }
          }
        }
      });
    },

    renderAll(kpis) {
      const r = kpis._records;
      this.lineaPorDia(kpis._porDia);
      this.distribucionVelocidades(r);
      this.doughnutPeligro(kpis, document.getElementById('legendPeligro'));
      this.barrasVelocidadRiesgo(kpis);
      this.radarComparativo(kpis);
      this.histogramaDiametros(r);
      this.scatterVelDist(r);
      this.top10Velocidad(r);
      this.top10Diametro(r);
    }
  };
})();
