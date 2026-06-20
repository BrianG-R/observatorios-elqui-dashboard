/**
 * dashboard.js — Módulo orquestador del Dashboard
 * Proyecto: NASA BigData Dashboard
 * Integrantes: Bastian Alfaro, Brian Gomez
 *
 * Responsabilidades:
 * - Coordinar la carga de datos (api.js)
 * - Disparar el procesamiento (dataProcessor.js)
 * - Actualizar KPIs y gráficos (charts.js)
 * - Renderizar tabla analítica e insights
 * - Gestionar estado de la UI (loading, error, empty)
 */

// Local storage helper

const API_BASE = window.location.origin;
const LocalStore = {
  save(data){ localStorage.setItem('neo_dashboard_data', JSON.stringify(data)); },
  load(){ try { return JSON.parse(localStorage.getItem('neo_dashboard_data') || 'null'); } catch(e){ return null; } },
  clear(){ localStorage.removeItem('neo_dashboard_data'); }
};

/* Estado global del dashboard */
let _allRecords  = [];
let _filteredRecs = [];
let _kpis        = null;

/* === INICIALIZACIÓN === */
document.addEventListener('DOMContentLoaded', () => {
  _setDefaultDates();
});

function _setDefaultDates() {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  document.getElementById('dateEnd').value   = _fmtDate(today);
  document.getElementById('dateStart').value = _fmtDate(weekAgo);
}

/* === CARGA PRINCIPAL === */
async function loadData() {
  const start = document.getElementById('dateStart').value;
  const end   = document.getElementById('dateEnd').value;

  if (!start || !end) {
    _showStatus('Selecciona un rango de fechas válido.', true);
    return;
  }

  if (new Date(start) > new Date(end)) {
    _showStatus('La fecha de inicio debe ser anterior a la fecha de fin.', true);
    return;
  }

  const diffDays = (new Date(end) - new Date(start)) / 86400000;
  if (diffDays > 60) {
    _showStatus('Para evitar límites de la API, selecciona un rango máximo de 60 días.', true);
    return;
  }

  _setLoading(true);
  _showStatus(`Consultando datos desde MongoDB...`);

  try {
    const response = await fetch(
    `${API_BASE}/api/asteroids?start=${start}&end=${end}`
    );

    const raw = await response.json();
    console.log("RAW API:", raw);
    _allRecords    = DataProcessor.clean(raw);
    console.log("LIMPIOS:", _allRecords);

    if (!_allRecords.length) {
      _showStatus('La API no devolvió registros para el rango seleccionado.', true);
      _setLoading(false);
      return;
    }

    _kpis         = DataProcessor.calcularKPIs(_allRecords);
    _filteredRecs = [..._allRecords];

    _renderKPIs(_kpis);
    Charts.renderAll(_kpis);
    _renderInsights(_kpis);
    _renderTable(_allRecords);

    _showStatus(`✓ ${_allRecords.length} asteroides cargados y procesados correctamente.`);
    setTimeout(() => _hideStatus(), 3500);

  } catch (err) {
    console.error('[Dashboard]', err);
    _showStatus(`Error al conectar con el backend: ${err.message}`, true);
  } finally {
    _setLoading(false);
  }
}

/* === RENDERIZADO DE KPIs === */
function _renderKPIs(kpis) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('kpiTotal',    kpis.totalAsteroides.toLocaleString());
  set('kpiPeligrosos', kpis.totalPeligrosos.toLocaleString());
  set('kpiPct',      kpis.pctPeligrosos + '%');
  set('kpiVelProm',  kpis.velocidadPromedio.toLocaleString());
  set('kpiVelMax',   kpis.velocidadMaxima.toLocaleString());
  set('kpiDistProm', kpis.distanciaPromedio.toLocaleString());
  set('kpiDistMin',  kpis.distanciaMinima.toLocaleString());
  set('kpiDiamProm', kpis.diametroPromedio);
}

/* === RENDERIZADO DE INSIGHTS === */
function _renderInsights(kpis) {
  const container = document.getElementById('insightsContainer');
  if (!container) return;

  const insights = DataProcessor.generarInsights(kpis);
  container.innerHTML = insights.map(ins => `
    <div class="insight-card ${ins.tipo !== 'default' ? ins.tipo : ''}">
      <p class="insight-title">${ins.titulo}</p>
      <p class="insight-body">${ins.cuerpo}</p>
    </div>
  `).join('');
}

/* === TABLA ANALÍTICA === */
function _renderTable(records) {
  const tbody = document.getElementById('tableBody');
  const count = document.getElementById('tableCount');

  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Sin registros para los filtros aplicados.</td></tr>';
    if (count) count.textContent = '';
    return;
  }

  if (count) count.textContent = `${records.length} registros`;

  tbody.innerHTML = records.map(r => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:11px;color:#4a4d62">${r.id}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.nombre}">${r.nombre}</td>
      <td>${r.fecha}</td>
      <td>${r.velocidad.toLocaleString()}</td>
      <td>${r.distancia.toLocaleString()}</td>
      <td>${r.diametroMin}</td>
      <td>${r.diametroMax}</td>
      <td>
        <span class="badge-peligro ${r.peligroso ? 'si' : 'no'}">
          ${r.peligroso ? '⚠ Sí' : '✓ No'}
        </span>
      </td>
    </tr>
  `).join('');
}

/* === FILTROS DE TABLA === */
function filterTable() {
  if (!_allRecords.length) return;

  const query    = document.getElementById('searchInput').value.toLowerCase().trim();
  const peligro  = document.getElementById('filterPeligro').value;

  _filteredRecs = _allRecords.filter(r => {
    const matchName = !query || r.nombre.toLowerCase().includes(query) || r.id.includes(query);
    const matchPel  = peligro === 'all' || (peligro === 'true' ? r.peligroso : !r.peligroso);
    return matchName && matchPel;
  });

  _renderTable(_filteredRecs);
}

/* === HELPERS DE UI === */
function _setLoading(on) {
  const btn = document.getElementById('btnLoad');
  if (btn) btn.disabled = on;
}

function _showStatus(msg, isError = false) {
  const bar = document.getElementById('statusBar');
  const txt = document.getElementById('statusMsg');
  if (!bar || !txt) return;
  txt.textContent = msg;
  bar.classList.remove('hidden', 'error');
  if (isError) bar.classList.add('error');
}

function _hideStatus() {
  const bar = document.getElementById('statusBar');
  if (bar) bar.classList.add('hidden');
}

function _fmtDate(d) {
  return d.toISOString().split('T')[0];
}



async function refreshData(){

  try{

    const start =
      document.getElementById("dateStart").value;

    const end =
      document.getElementById("dateEnd").value;

    _showStatus(
      `Actualizando NASA (${start} → ${end})...`
    );

    const response = await fetch(
      `${API_BASE}/api/update?start=${start}&end=${end}`,
      {
        method:"POST"
      }
    );

    const result =
      await response.json();

    console.log(
      "UPDATE:",
      result
    );

    LocalStore.clear();

    await loadData(true);

    await loadStorageInfo();

    _showStatus(
      "Actualización completada"
    );

  }catch(err){

    console.error(err);

    _showStatus(
      "Error actualizando NASA",
      true
    );
  }
}

const _loadDataOriginal = loadData;

loadData = async function(forceRefresh=false){
  const cached = LocalStore.load();

  if(cached && !forceRefresh){
    _allRecords = cached.records || [];
    _filteredRecs = [..._allRecords];

    if(_allRecords.length){
      _kpis = DataProcessor.calcularKPIs(_allRecords);
      _renderKPIs(_kpis);
      Charts.renderAll(_kpis);
      _renderInsights(_kpis);
      _renderTable(_allRecords);
      _showStatus('Datos cargados desde almacenamiento local.');
      return;
    }
  }

  await _loadDataOriginal();

  if(_allRecords.length){
    try{
      const weatherResponse = await fetch(`${API_BASE}/api/weather`);
      const weather = await weatherResponse.json();

      console.log("WEATHER:", weather);

      renderWeatherDashboard(weather);
      LocalStore.save({
        lastUpdate:new Date().toISOString(),
        weather,
        records:_allRecords
      });
    }catch(e){
      console.warn('No se pudo obtener clima',e);
    }
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  console.log('Dashboard ETL listo');
});


function renderWeatherInfo(weather){
 if(!weather) return;

 const temp = weather.temperatura ?? 0;
 const cloud = weather.nubosidad ?? 0;
 const wind = weather.viento ?? 0;

 const score = Math.max(
   0,
   Math.round(100 - (cloud * 0.5) - (wind * 1.5))
 );

 const t=document.getElementById('tempValue');
 const c=document.getElementById('cloudValue');
 const w=document.getElementById('windValue');
 const o=document.getElementById('obsValue');

 if(t) t.textContent=temp;
 if(c) c.textContent=cloud;
 if(w) w.textContent=wind;
 if(o) o.textContent=score;
}

document.addEventListener('DOMContentLoaded',()=>{
 try{
   const cache=localStorage.getItem('neo_dashboard_data');
   if(cache){
      const data=JSON.parse(cache);
      renderWeatherInfo(data.weather);
   }
 }catch(e){console.warn(e);}
});


// ===== SNAPSHOT MODE =====
async function loadSnapshotMode(){
  try{
    const r = await fetch(APP_CONFIG.SNAPSHOT_FILE);
    const data = await r.json();

    localStorage.setItem('neo_dashboard_data', JSON.stringify(data));

    console.log('Snapshot cargado', data.lastUpdate);
    return data;
  }catch(err){
    console.warn('No se pudo cargar snapshot', err);
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  if(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEV_MODE){
      await loadSnapshotMode();
      console.log('DEV_MODE activo: no se consumen APIs externas');
  }
});


function renderWeatherDashboard(weather){

  if(!weather) return;

  const temp = weather.temperatura ?? 0;
  const cloud = weather.nubosidad ?? 0;
  const wind = weather.viento ?? 0;

  const score = Math.max(
    0,
    Math.round(100 - (cloud * 0.5) - (wind * 1.5))
  );

  const set = (id,val)=>{
    const e=document.getElementById(id);
    if(e) e.textContent = val;
  };

  set('weatherTemp', temp + ' °C');
  set('weatherCloud', cloud + ' %');
  set('weatherWind', wind + ' km/h');
  set('obsScore', score + '/100');

  console.log('CLIMA CARGADO:', weather);
}


document.addEventListener('DOMContentLoaded',()=>{
 try{
  const cache=JSON.parse(localStorage.getItem('neo_dashboard_data')||'{}');
  if(cache.weather) renderWeatherDashboard(cache.weather);
 }catch(e){}
});


function updateDashboardStatus(){
  try{
    const cache = JSON.parse(localStorage.getItem('neo_dashboard_data') || '{}');

    const sync = document.getElementById('lastSyncValue');
    if(sync && cache.lastUpdate){
      sync.textContent = new Date(cache.lastUpdate).toLocaleString();
    }

    const alerts=[];

    if(cache.weather){

      const cloud =
          cache.weather.nubosidad || 0;

      const wind =
          cache.weather.viento || 0;

      if(cloud > 70) alerts.push('⚠ Alta nubosidad');
      if(wind > 30) alerts.push('⚠ Viento elevado');
    }

    if(window._allRecords){
      const dangerous = _allRecords.filter(x=>x.peligroso || x.is_potentially_hazardous_asteroid).length;
      if(dangerous > 10){
        alerts.push('⚠ Muchos objetos potencialmente peligrosos');
      }
    }

    const alertList=document.getElementById('alertList');
    if(alertList){
      alertList.innerHTML = alerts.length ? alerts.join('<br>') : '✅ Sin alertas relevantes';
    }
  }catch(e){
    console.warn(e);
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(updateDashboardStatus,1500);
});

function updateSnapshotCounter(){
 const c=JSON.parse(localStorage.getItem('etl_snapshots')||'[]').length;
 const el=document.getElementById('snapshotCount');
 if(el) el.textContent=c;
}
document.addEventListener('DOMContentLoaded',updateSnapshotCounter);

async function loadStorageInfo() {
  try {

    const response = await fetch(
      `${API_BASE}/api/storage`
    );

    const data = await response.json();

    const snap = document.getElementById('snapshotCount');
    const docs = document.getElementById('mongoDocsCount');
    const cols = document.getElementById('collectionsCount');
    const sync = document.getElementById('lastSyncValue');

    if (snap) snap.textContent = data.snapshots || 0;

    if (docs)
      docs.textContent =
        (data.asteroids || 0) +
        (data.weather || 0);

    if (cols)
      cols.textContent =
        data.collections || 0;

    if (sync)
      sync.textContent =
        data.last_sync || "--";

    console.log("Storage:", data);

  } catch (err) {

    console.error(
      "Storage error:",
      err
    );

  }
}
document.addEventListener('DOMContentLoaded', () => {
  loadStorageInfo();
});