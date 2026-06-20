/**
 * dataProcessor.js — Módulo de procesamiento de datos Big Data
 * Proyecto: NASA BigData Dashboard
 * Integrantes: Bastian Alfaro, Brian Gomez
 *
 * Aplicación de las 5V de Big Data:
 *   Volumen  → miles de registros históricos de asteroides
 *   Velocidad → datos actualizados diariamente por NASA
 *   Variedad → datos numéricos, booleanos, strings, timestamps
 *   Veracidad → limpieza, validación y normalización de unidades
 *   Valor    → generación de KPIs, agregaciones y métricas BI
 */

const DataProcessor = {

  /**
   * LIMPIEZA Y NORMALIZACIÓN
   * Transforma el array crudo de NeoWs en registros limpios y tipados.
   * Elimina registros inválidos (sin datos de aproximación).
   *
   * @param {Object[]} rawNeos - Array crudo de la API
   * @returns {Object[]} - Array de registros normalizados
   */
clean(rawNeos) {
  const cleaned = [];

  for (const neo of rawNeos) {

  try {

    cleaned.push({
      id: neo._id || Math.random().toString(36).substring(2,8),

      nombre: neo.nombre || 'Sin nombre',

      fecha: neo.fecha,

      velocidad: Math.round(
        Number(neo.velocidad_kmh || 0)
      ),

      distancia: Math.round(
        Number(neo.distancia_km || 0)
      ),

      diametroMin: Number(
        neo.diametro_km || 0
      ),

      diametroMax: Number(
        neo.diametro_km || 0
      ),

      diametroMed: Number(
        neo.diametro_km || 0
      ),

      peligroso: Boolean(
        neo.peligroso
      ),

      magnitud: null,
      orbitaId: null,
      urlNASA: null
    });

  } catch(e) {
    console.warn(e);
  }

  }

  cleaned.sort(
  (a,b)=>a.fecha.localeCompare(b.fecha)
  );

  return cleaned;
},

  /**
   * CÁLCULO DE KPIs EJECUTIVOS
   * Genera más de 20 indicadores clave de negocio.
   *
   * @param {Object[]} records - Array de registros limpios
   * @returns {Object} - Objeto con todos los KPIs
   */
  calcularKPIs(records) {
    if (!records.length) return null;

    const peligrosos = records.filter(r => r.peligroso);
    const noPeligrosos = records.filter(r => !r.peligroso);

    const velocidades = records.map(r => r.velocidad);
    const distancias  = records.map(r => r.distancia);
    const diametros   = records.map(r => r.diametroMed);

    const velPeligrosos = peligrosos.map(r => r.velocidad);
    const velNoPeligrosos = noPeligrosos.map(r => r.velocidad);

    /* Helpers estadísticos */
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    const max = arr => arr.length ? Math.max(...arr) : 0;
    const min = arr => arr.length ? Math.min(...arr) : 0;

    const idxMaxVel  = velocidades.indexOf(max(velocidades));
    const idxMinDist = distancias.indexOf(min(distancias));
    const idxMaxDiam = diametros.indexOf(max(diametros));

    /* Distribución por mes */
    const porMes = this._agruparPorMes(records);

    return {
      /* Volumen */
      totalAsteroides:       records.length,
      totalPeligrosos:       peligrosos.length,
      totalNoPeligrosos:     noPeligrosos.length,
      pctPeligrosos:         parseFloat((peligrosos.length / records.length * 100).toFixed(1)),

      /* Velocidad */
      velocidadPromedio:     Math.round(avg(velocidades)),
      velocidadMaxima:       Math.round(max(velocidades)),
      velocidadMinima:       Math.round(min(velocidades)),
      velocidadPromPeligrosos:   Math.round(avg(velPeligrosos)),
      velocidadPromNoPeligrosos: Math.round(avg(velNoPeligrosos)),

      /* Distancia */
      distanciaPromedio:     Math.round(avg(distancias)),
      distanciaMinima:       Math.round(min(distancias)),
      distanciaMaxima:       Math.round(max(distancias)),

      /* Diámetro */
      diametroPromedio:      parseFloat(avg(diametros).toFixed(4)),
      diametroMaximo:        parseFloat(max(diametros).toFixed(4)),
      diametroMinimo:        parseFloat(min(diametros).toFixed(4)),

      /* Top Records */
      asteroideMasRapido:    records[idxMaxVel]?.nombre || '—',
      asteroideMasCercano:   records[idxMinDist]?.nombre || '—',
      asteroideMasGrande:    records[idxMaxDiam]?.nombre || '—',

      /* Temporal */
      diasConRegistros:      Object.keys(this._agruparPorDia(records)).length,
      promedioAsteroidesPorDia: parseFloat((records.length / Math.max(Object.keys(this._agruparPorDia(records)).length, 1)).toFixed(1)),
      mesConMasAsteroides:   porMes.reduce((a,b) => b.total > a.total ? b : a, {total:0}).mes || '—',
      fechaInicio:           records[0]?.fecha || '—',
      fechaFin:              records[records.length-1]?.fecha || '—',

      /* Para gráficos */
      _porDia:    this._agruparPorDia(records),
      _porMes:    porMes,
      _records:   records,
      _peligrosos: peligrosos,
      _noPeligrosos: noPeligrosos
    };
  },

  /* Agrupa registros por fecha (YYYY-MM-DD) */
  _agruparPorDia(records) {
    const map = {};
    for (const r of records) {
      map[r.fecha] = (map[r.fecha] || 0) + 1;
    }
    return map;
  },

  /* Agrupa por mes y devuelve array ordenado */
  _agruparPorMes(records) {
    const map = {};
    for (const r of records) {
      const mes = r.fecha.substring(0, 7);
      if (!map[mes]) map[mes] = { mes, total: 0, peligrosos: 0 };
      map[mes].total++;
      if (r.peligroso) map[mes].peligrosos++;
    }
    return Object.values(map).sort((a,b) => a.mes.localeCompare(b.mes));
  },

  /* Devuelve Top N por una propiedad numérica (descendente) */
  topN(records, prop, n = 10) {
    return [...records].sort((a,b) => b[prop] - a[prop]).slice(0, n);
  },

  /* Histograma: divide rango en buckets uniformes */
  histograma(values, buckets = 8) {
    if (!values.length) return { labels: [], counts: [] };
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const step = (mx - mn) / buckets || 1;
    const labels = [];
    const counts = new Array(buckets).fill(0);

    for (let i = 0; i < buckets; i++) {
      const lo = mn + i * step;
      const hi = lo + step;
      labels.push(`${lo.toFixed(2)}–${hi.toFixed(2)}`);
    }

    for (const v of values) {
      let idx = Math.floor((v - mn) / step);
      if (idx >= buckets) idx = buckets - 1;
      counts[idx]++;
    }

    return { labels, counts };
  },

  /* Genera insights automáticos a partir de los KPIs */
  generarInsights(kpis) {
    const insights = [];

    if (kpis.pctPeligrosos > 20) {
      insights.push({
        tipo: 'danger',
        titulo: 'Alto porcentaje de objetos peligrosos',
        cuerpo: `El ${kpis.pctPeligrosos}% de los asteroides del período analizado son potencialmente peligrosos, superando el umbral crítico del 20%.`
      });
    } else {
      insights.push({
        tipo: 'info',
        titulo: 'Nivel de riesgo controlado',
        cuerpo: `Solo el ${kpis.pctPeligrosos}% de los asteroides son potencialmente peligrosos. La NASA monitorea activamente todos estos objetos.`
      });
    }

    if (kpis.distanciaMinima < 1_000_000) {
      insights.push({
        tipo: 'warning',
        titulo: 'Aproximación muy cercana detectada',
        cuerpo: `El asteroide ${kpis.asteroideMasCercano} registró una distancia mínima de ${kpis.distanciaMinima.toLocaleString()} km — menos de 1 millón de km de la Tierra.`
      });
    }

    if (kpis.velocidadMaxima > 100_000) {
      insights.push({
        tipo: 'warning',
        titulo: 'Velocidad extrema registrada',
        cuerpo: `${kpis.asteroideMasRapido} alcanzó ${kpis.velocidadMaxima.toLocaleString()} km/h — velocidad inusualmente alta para un objeto cercano a la Tierra.`
      });
    }

    insights.push({
      tipo: 'info',
      titulo: 'Tendencia temporal',
      cuerpo: `El mes con mayor actividad fue ${kpis.mesConMasAsteroides}, con un promedio de ${kpis.promedioAsteroidesPorDia} asteroides por día.`
    });

    if (kpis.velocidadPromPeligrosos > kpis.velocidadPromNoPeligrosos) {
      insights.push({
        tipo: 'warning',
        titulo: 'Objetos peligrosos son más veloces',
        cuerpo: `Los asteroides peligrosos tienen una velocidad promedio de ${kpis.velocidadPromPeligrosos.toLocaleString()} km/h vs. ${kpis.velocidadPromNoPeligrosos.toLocaleString()} km/h de los no peligrosos.`
      });
    }

    insights.push({
      tipo: 'default',
      titulo: `${kpis.totalAsteroides} registros procesados`,
      cuerpo: `Período analizado: ${kpis.fechaInicio} al ${kpis.fechaFin}. Volumen de datos compatible con técnicas Big Data y BI.`
    });

    return insights;
  }
};
