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
  _showStatus(`Consultando NASA NeoWs API (${start} → ${end})...`);

  try {
    const raw      = await NASA_API.fetchRange(start, end);
    _allRecords    = DataProcessor.clean(raw);

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
    _showStatus(`Error al conectar con NASA API: ${err.message}`, true);
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
  LocalStore.clear();
  return await loadData(true);
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
      const weather = await WeatherAPI.fetchWeather();
      LocalStore.save({
        lastUpdate:new Date().toISOString(),
        weather,
        records:_allRecords
      });
    }catch(e){
      console.warn('No se pudo obtener clima',e);
    }
  }
};

document.addEventListener('DOMContentLoaded', ()=>{
  console.log('Dashboard ETL listo');
});


function renderWeatherInfo(weather){
 if(!weather || !weather.current) return;

 const temp=weather.current.temperature_2m ?? 0;
 const cloud=weather.current.cloud_cover ?? 0;
 const wind=weather.current.wind_speed_10m ?? 0;

 const score=Math.max(0,Math.round(100-(cloud*0.5)-(wind*1.5)));

 const t=document.getElementById('tempValue');
 const c=document.getElementById('cloudValue');
 const w=document.getElementById('windValue');
 const o=document.getElementById('obsValue');

 if(t) t.textContent=temp;
 if(c) c.textContent=cloud;
 if(w) w.textContent=wind;
 if(o) o.textContent=score;

 const alert=document.getElementById('alertPanel');
 if(alert){
   let msg=[];
   if(score<50) msg.push('⚠ Condiciones de observación deficientes');
   if(cloud>70) msg.push('⚠ Alta nubosidad');
   if(wind>30) msg.push('⚠ Viento elevado');
   alert.innerHTML=msg.join('<br>');
 }
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
 if(!weather||!weather.current)return;
 const t=weather.current.temperature_2m??0;
 const c=weather.current.cloud_cover??0;
 const w=weather.current.wind_speed_10m??0;
 const score=Math.max(0,Math.round(100-(c*0.5)-(w*1.5)));
 const set=(id,val)=>{const e=document.getElementById(id); if(e)e.textContent=val;}
 set('weatherTemp', t+' °C');
 set('weatherCloud', c+' %');
 set('weatherWind', w+' km/h');
 set('obsScore', score+'/100');
 const panel=document.getElementById('alertPanel');
 if(panel){
   const alerts=[];
   if(score>80) alerts.push('✅ Excelentes condiciones de observación');
   if(c>70) alerts.push('⚠ Alta nubosidad');
   if(w>30) alerts.push('⚠ Viento fuerte');
   if((_kpis?.peligrosos||0)>10) alerts.push('☄ Múltiples objetos potencialmente peligrosos detectados');
   panel.innerHTML=alerts.join('<br>');
 }
}

const _origLoadData2=loadData;
loadData=async function(){
 await _origLoadData2();
 try{
   const weather=await WeatherAPI.fetchWeather();
   renderWeatherDashboard(weather);
   const cache=JSON.parse(localStorage.getItem('neo_dashboard_data')||'{}');
   cache.weather=weather;
   localStorage.setItem('neo_dashboard_data',JSON.stringify(cache));
 }catch(e){console.warn(e);}
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

    if(cache.weather && cache.weather.current){
      const cloud = cache.weather.current.cloud_cover || 0;
      const wind = cache.weather.current.wind_speed_10m || 0;

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
