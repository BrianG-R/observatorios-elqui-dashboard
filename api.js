/**
 * api.js — Módulo de acceso a NASA NeoWs API
 * Proyecto: NASA BigData Dashboard
 * Integrantes: Bastian Alfaro, Brian Gomez
 *
 * Responsabilidades:
 * - Gestionar llamadas a la NASA NeoWs API
 * - Manejar paginación y rangos de fechas (máx. 7 días por llamada)
 * - Gestionar errores de red y de API
 */

const NASA_API = {
  /* La BWRPXC4efdZ9lo9TzmcWWd6QQT3aduBAGsfd1aUf tiene límite de 30 req/hora. Para producción
     reemplazar con clave personal obtenida en https://api.nasa.gov/ */
  KEY: 'BWRPXC4efdZ9lo9TzmcWWd6QQT3aduBAGsfd1aUf',
  BASE_URL: 'https://api.nasa.gov/neo/rest/v1/feed',

  /**
   * Obtiene asteroides de un rango de fechas.
   * La API acepta máximo 7 días por request.
   * Si el rango supera 7 días, se divide en chunks y se encadenan.
   *
   * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} endDate   - Fecha fin   (YYYY-MM-DD)
   * @returns {Promise<Object[]>} - Array plano de registros de asteroides
   */
  async fetchRange(startDate, endDate) {
    const chunks = this._splitDateRange(startDate, endDate, 7);
    let allAsteroids = [];

    for (const [start, end] of chunks) {
      const batch = await this._fetchChunk(start, end);
      allAsteroids = allAsteroids.concat(batch);
    }

    return allAsteroids;
  },

  /**
   * Llama a un chunk de máximo 7 días.
   */
  async _fetchChunk(startDate, endDate) {
    const url = `${this.BASE_URL}?start_date=${startDate}&end_date=${endDate}&api_key=${this.KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`NASA API error ${response.status}: ${errBody}`);
    }

    const json = await response.json();
    return this._flattenResponse(json);
  },

  /**
   * Convierte la respuesta jerárquica por fecha en un array plano.
   * Cada objeto incluye la fecha de aproximación como propiedad extra.
   */
  _flattenResponse(json) {
    const neosByDate = json.near_earth_objects || {};
    const flat = [];

    for (const [date, neos] of Object.entries(neosByDate)) {
      for (const neo of neos) {
        neo._fecha = date;
        flat.push(neo);
      }
    }

    return flat;
  },

  /**
   * Divide un rango de fechas en sub-rangos de maxDays días.
   * @returns {Array<[string, string]>} - Array de pares [inicio, fin]
   */
  _splitDateRange(startDate, endDate, maxDays) {
    const chunks = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());

      chunks.push([
        this._formatDate(current),
        this._formatDate(chunkEnd)
      ]);

      current = new Date(chunkEnd);
      current.setDate(current.getDate() + 1);
    }

    return chunks;
  },

  _formatDate(d) {
    return d.toISOString().split('T')[0];
  }
};



const WeatherAPI = {
  async fetchWeather(lat=-30.6, lon=-71.2){
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,wind_speed_10m`;
    const r=await fetch(url);
    return await r.json();
  }
};

const LocalStore = {
  save(data){ localStorage.setItem('neo_dashboard_data', JSON.stringify(data)); },
  load(){ return JSON.parse(localStorage.getItem('neo_dashboard_data') || 'null'); },
  clear(){ localStorage.removeItem('neo_dashboard_data'); }
};
