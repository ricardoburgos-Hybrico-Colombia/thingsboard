// ==========================================================================
// SCADA TELECOM - REGISTRO DE EVENTOS Y FALLAS (MULTI-SITIO DINÁMICO HYNET)
// 100% Real Live Telemetry • Web Audio API • 24 Reglas Telecom • Zero Mock
// ==========================================================================

self.onInit = function() {
  self.isMuted = localStorage.getItem('telecom_scada_audio_muted') === 'true';
  self.audioCtx = null;
  self.lastSoundTime = 0;
  self.activeTab = 'all';
  self.searchQuery = '';
  self.modalElement = null;

  // Cargar reconocimientos locales
  try {
    self.ackMap = JSON.parse(localStorage.getItem('telecom_alarms_ack') || '{}');
  } catch(e) {
    self.ackMap = {};
  }

  // Despachadores globales
  window.hybricoOpenAlarmConsole = function(tab, evt) {
    if (evt && evt.target && evt.target.closest && evt.target.closest('#btn-audio-toggle')) return;
    self.openModal(tab || 'all');
  };

  window.hybricoToggleAlarmAudio = function(evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    self.toggleAudioMute();
  };

  self.onDataUpdated();
};

self.getSiteName = function() {
  if (self.ctx.datasources && self.ctx.datasources[0]) {
    var ds = self.ctx.datasources[0];
    if (ds.entityName) return ds.entityName;
    if (ds.entityLabel) return ds.entityLabel;
    if (ds.name && ds.name !== "Simulador" && ds.name !== "") return ds.name;
  }
  if (self.ctx.defaultSubscription && self.ctx.defaultSubscription.entityName) {
    return self.ctx.defaultSubscription.entityName;
  }
  if (self.ctx.dashboard) {
    if (self.ctx.dashboard.title) return self.ctx.dashboard.title;
    if (self.ctx.dashboard.name) return self.ctx.dashboard.name;
  }
  var sel = document.querySelector('.tb-dashboard-title, .entity-title, .mat-mdc-select-value-text');
  if (sel && sel.textContent && sel.textContent.trim()) {
    return sel.textContent.trim();
  }
  return "RADIOBASE TELECOM";
};

// --------------------------------------------------------------------------
// INYECCIÓN DE ESTILOS DEL MODAL EN DOCUMENT.HEAD
// --------------------------------------------------------------------------
self.ensureModalStyles = function() {
  if (document.getElementById('scada-alarm-modal-styles')) return;

  var style = document.createElement('style');
  style.id = 'scada-alarm-modal-styles';
  style.textContent = `
    .scada-modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(3, 7, 5, 0.85) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      z-index: 9999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 24px !important;
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #f1f5f9 !important;
      animation: scada-modal-fade 0.22s ease-out !important;
    }
    @keyframes scada-modal-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .scada-modal-window {
      width: 100% !important;
      max-width: 1060px !important;
      height: 82vh !important;
      max-height: 720px !important;
      background: linear-gradient(175deg, #0e1713 0%, #070c09 100%) !important;
      border: 1px solid rgba(100, 184, 86, 0.35) !important;
      border-top: 4px solid #64B856 !important;
      border-radius: 16px !important;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(100, 184, 86, 0.2) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      animation: scada-modal-zoom 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    @keyframes scada-modal-zoom {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 16px 20px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      background: rgba(255, 255, 255, 0.02) !important;
    }
    .modal-header-left {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .modal-header-icon {
      width: 40px !important;
      height: 40px !important;
      border-radius: 10px !important;
      background: rgba(100, 184, 86, 0.12) !important;
      border: 1px solid rgba(100, 184, 86, 0.25) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 20px !important;
    }
    .modal-header-title {
      font-size: 15px !important;
      font-weight: 800 !important;
      color: #f8fafc !important;
      letter-spacing: 0.5px !important;
    }
    .modal-header-sub {
      font-size: 11px !important;
      color: #94a3b8 !important;
      margin-top: 2px !important;
    }
    .modal-header-right {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    .btn-test-sound {
      background: rgba(56, 189, 248, 0.12) !important;
      border: 1px solid rgba(56, 189, 248, 0.35) !important;
      color: #38bdf8 !important;
      border-radius: 7px !important;
      padding: 6px 12px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      transition: all 0.2s ease !important;
    }
    .btn-test-sound:hover {
      background: rgba(56, 189, 248, 0.25) !important;
      transform: translateY(-1px) !important;
    }
    .btn-modal-close {
      background: rgba(255, 255, 255, 0.06) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 8px !important;
      width: 34px !important;
      height: 34px !important;
      color: #cbd5e1 !important;
      font-size: 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }
    .btn-modal-close:hover {
      background: rgba(239, 68, 68, 0.2) !important;
      border-color: #ef4444 !important;
      color: #f87171 !important;
    }
    .modal-toolbar {
      padding: 12px 20px !important;
      background: rgba(0, 0, 0, 0.25) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 16px !important;
      flex-wrap: wrap !important;
    }
    .modal-tabs {
      display: flex !important;
      gap: 6px !important;
    }
    .modal-tab-btn {
      background: rgba(255, 255, 255, 0.04) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 8px !important;
      color: #94a3b8 !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      padding: 6px 14px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      transition: all 0.2s ease !important;
    }
    .modal-tab-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #e2e8f0 !important;
    }
    .modal-tab-btn.active {
      background: rgba(100, 184, 86, 0.18) !important;
      border-color: #64B856 !important;
      color: #86efac !important;
    }
    .tab-badge {
      background: rgba(0, 0, 0, 0.4) !important;
      border-radius: 12px !important;
      padding: 1px 6px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
    }
    .modal-tab-btn.active .tab-badge {
      background: #64B856 !important;
      color: #061109 !important;
    }
    .modal-search-box {
      position: relative !important;
      min-width: 260px !important;
    }
    .modal-search-input {
      width: 100% !important;
      box-sizing: border-box !important;
      background: rgba(0, 0, 0, 0.4) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 8px !important;
      color: #f1f5f9 !important;
      font-size: 11px !important;
      padding: 6px 12px 6px 30px !important;
      outline: none !important;
      transition: all 0.2s ease !important;
    }
    .modal-search-input:focus {
      border-color: #64B856 !important;
      box-shadow: 0 0 10px rgba(100, 184, 86, 0.25) !important;
    }
    .search-icon-placeholder {
      position: absolute !important;
      left: 9px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      font-size: 12px !important;
      color: #64748b !important;
      pointer-events: none !important;
    }
    .modal-body {
      flex: 1 !important;
      overflow-y: auto !important;
      padding: 16px 20px !important;
    }
    .modal-body::-webkit-scrollbar {
      width: 6px !important;
    }
    .modal-body::-webkit-scrollbar-thumb {
      background: rgba(100, 184, 86, 0.3) !important;
      border-radius: 3px !important;
    }
    .scada-alarm-table {
      width: 100% !important;
      border-collapse: separate !important;
      border-spacing: 0 4px !important;
      font-size: 11px !important;
    }
    .scada-alarm-table th {
      background: rgba(0, 0, 0, 0.35) !important;
      color: #94a3b8 !important;
      font-weight: 700 !important;
      text-align: left !important;
      padding: 8px 12px !important;
      font-size: 10px !important;
      letter-spacing: 0.5px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    .scada-alarm-table th:first-child { border-radius: 6px 0 0 6px !important; }
    .scada-alarm-table th:last-child { border-radius: 0 6px 6px 0 !important; text-align: center !important; }
    .scada-alarm-table td {
      padding: 10px 12px !important;
      background: rgba(255, 255, 255, 0.02) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.04) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
      vertical-align: middle !important;
      transition: all 0.15s ease !important;
    }
    .scada-alarm-table tr:hover td {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    .scada-alarm-table td:first-child {
      border-left: 3px solid transparent !important;
      border-radius: 6px 0 0 6px !important;
    }
    .scada-alarm-table td:last-child {
      border-radius: 0 6px 6px 0 !important;
      text-align: center !important;
    }
    .alarm-row-critical td:first-child { border-left-color: #ef4444 !important; }
    .alarm-row-critical { background: rgba(239, 68, 68, 0.05) !important; }
    .alarm-row-warning td:first-child { border-left-color: #f59e0b !important; }
    .alarm-row-warning { background: rgba(245, 158, 11, 0.04) !important; }
    .alarm-row-healthy td:first-child { border-left-color: #64B856 !important; }
    .cell-time {
      font-variant-numeric: tabular-nums !important;
      color: #cbd5e1 !important;
      white-space: nowrap !important;
    }
    .cell-time-rel {
      font-size: 9.5px !important;
      color: #64748b !important;
      display: block !important;
    }
    .cell-subsystem {
      font-weight: 700 !important;
      color: #e2e8f0 !important;
    }
    .cell-tag {
      font-size: 9px !important;
      color: #64748b !important;
      display: block !important;
    }
    .cell-code {
      font-family: monospace !important;
      font-size: 10.5px !important;
      color: #38bdf8 !important;
      font-weight: 700 !important;
    }
    .cell-desc { color: #cbd5e1 !important; }
    .cell-metrics { font-size: 10px !important; color: #94a3b8 !important; }
    .cell-metrics strong { color: #f8fafc !important; }
    .badge-sev {
      display: inline-block !important;
      padding: 3px 8px !important;
      border-radius: 12px !important;
      font-size: 9.5px !important;
      font-weight: 800 !important;
      letter-spacing: 0.4px !important;
    }
    .badge-sev.critical {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ef4444 !important;
      border: 1px solid rgba(239, 68, 68, 0.4) !important;
    }
    .badge-sev.warning {
      background: rgba(245, 158, 11, 0.2) !important;
      color: #f59e0b !important;
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
    }
    .badge-sev.ok {
      background: rgba(100, 184, 86, 0.15) !important;
      color: #64B856 !important;
      border: 1px solid rgba(100, 184, 86, 0.3) !important;
    }
    .btn-ack {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 5px !important;
      color: #cbd5e1 !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      padding: 4px 10px !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }
    .btn-ack:hover {
      background: #64B856 !important;
      border-color: #64B856 !important;
      color: #061109 !important;
    }
    .btn-ack.acknowledged {
      background: rgba(100, 184, 86, 0.15) !important;
      border-color: rgba(100, 184, 86, 0.3) !important;
      color: #86efac !important;
      cursor: default !important;
    }
    .table-empty-state {
      text-align: center !important;
      padding: 40px 20px !important;
      color: #64748b !important;
    }
    .empty-icon { font-size: 32px !important; margin-bottom: 8px !important; }
    .empty-title { font-size: 13px !important; font-weight: 700 !important; color: #94a3b8 !important; }
    .empty-sub { font-size: 11px !important; margin-top: 4px !important; }
    .modal-footer {
      padding: 12px 20px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
      background: rgba(0, 0, 0, 0.3) !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 11px !important;
      color: #64748b !important;
    }
  `;
  document.head.appendChild(style);
};

// --------------------------------------------------------------------------
// MOTOR DE AUDIO (Web Audio API Sintetizado)
// --------------------------------------------------------------------------
self.initAudioContext = function() {
  if (!self.audioCtx) {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) self.audioCtx = new AudioContext();
  }
  if (self.audioCtx && self.audioCtx.state === 'suspended') {
    self.audioCtx.resume();
  }
};

self.playAudioAlert = function(severity) {
  if (self.isMuted) return;

  var now = Date.now();
  if (now - self.lastSoundTime < 20000 && severity !== 'TEST' && severity.indexOf('TEST_') === -1) return;
  self.lastSoundTime = now;

  try {
    self.initAudioContext();
    if (!self.audioCtx) return;

    var ctx = self.audioCtx;
    var t = ctx.currentTime + 0.05;

    if (severity === 'CRITICAL' || severity === 'TEST_CRIT') {
      for (var i = 0; i < 3; i++) {
        var start = t + (i * 0.28);
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, start);
        osc.frequency.exponentialRampToValueAtTime(659.25, start + 0.2);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      }
    } else if (severity === 'WARNING' || severity === 'TEST_WARN') {
      var notes = [587.33, 880];
      for (var n = 0; n < notes.length; n++) {
        var noteStart = t + (n * 0.16);
        var oscW = ctx.createOscillator();
        var gainW = ctx.createGain();
        oscW.type = 'sine';
        oscW.frequency.setValueAtTime(notes[n], noteStart);

        gainW.gain.setValueAtTime(0.001, noteStart);
        gainW.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
        gainW.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22);

        oscW.connect(gainW);
        gainW.connect(ctx.destination);
        oscW.start(noteStart);
        oscW.stop(noteStart + 0.22);
      }
    } else if (severity === 'ACK' || severity === 'TEST_ACK') {
      var oscA = ctx.createOscillator();
      var gainA = ctx.createGain();
      oscA.type = 'triangle';
      oscA.frequency.setValueAtTime(554.37, t);
      oscA.frequency.exponentialRampToValueAtTime(659.25, t + 0.15);

      gainA.gain.setValueAtTime(0.001, t);
      gainA.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gainA.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      oscA.connect(gainA);
      gainA.connect(ctx.destination);
      oscA.start(t);
      oscA.stop(t + 0.18);
    }
  } catch(err) {
    console.warn('[SCADA-AUDIO] Error:', err);
  }
};

self.toggleAudioMute = function() {
  self.isMuted = !self.isMuted;
  localStorage.setItem('telecom_scada_audio_muted', self.isMuted ? 'true' : 'false');
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var btn = container.querySelector('#btn-audio-toggle');
    if (btn) self.updateAudioIcon(btn);
  }
  if (!self.isMuted) {
    self.initAudioContext();
    self.playAudioAlert('TEST_ACK');
  }
};

self.updateAudioIcon = function(btn) {
  var icon = btn.querySelector('#audio-icon');
  if (icon) icon.textContent = self.isMuted ? '🔇' : '🔊';
  if (self.isMuted) {
    btn.classList.add('muted');
    btn.setAttribute('title', 'Alerta Sonora: SILENCIADA (Click para activar)');
  } else {
    btn.classList.remove('muted');
    btn.setAttribute('title', 'Alerta Sonora: ACTIVADA (Click para silenciar)');
  }
};

// --------------------------------------------------------------------------
// FORMATEO DE FECHA Y HORA EN HORA LOCAL DEL USUARIO (LATAM)
// --------------------------------------------------------------------------
self.formatAlarmTime = function(raw) {
  if (!raw) return '';
  var d;
  if (typeof raw === 'number') {
    d = new Date(raw);
  } else if (typeof raw === 'string') {
    if (raw.indexOf('T') !== -1 || raw.indexOf('Z') !== -1) {
      d = new Date(raw);
    } else {
      var parts = raw.split(/[- :]/);
      if (parts.length >= 6) {
        return raw;
      }
      d = new Date(raw);
    }
  } else if (raw instanceof Date) {
    d = raw;
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) return String(raw);

  var pad = function(n) { return (n < 10 ? '0' : '') + n; };
  var Y = d.getFullYear();
  var M = pad(d.getMonth() + 1);
  var D = pad(d.getDate());
  var h = pad(d.getHours());
  var m = pad(d.getMinutes());
  var s = pad(d.getSeconds());
  return Y + '-' + M + '-' + D + ' ' + h + ':' + m + ':' + s;
};

// --------------------------------------------------------------------------
// PROCESAMIENTO Y EVALUACIÓN DE TELEMETRÍA (24 REGLAS SCADA TELECOM)
// --------------------------------------------------------------------------
self.onDataUpdated = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var btnMute = container.querySelector('#btn-audio-toggle');
    if (btnMute) self.updateAudioIcon(btnMute);
  }

  var siteName = self.getSiteName();
  if (container) {
    var elSubTitle = container.querySelector('#alarm-sub-title');
    if (elSubTitle) {
      elSubTitle.textContent = siteName + ' • Matriz SCADA Telecom HyNet';
    }
  }

  var data = self.ctx.data || [];
  var telemetry = {};
  var maxTs = 0;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    if (item.data && item.data.length > 0) {
      var key = (item.dataKey.name || item.dataKey.label || "").toLowerCase();
      var lastPt = item.data[item.data.length - 1];
      var ts = lastPt[0];
      var lastVal = lastPt[1];
      telemetry[key] = lastVal;
      if (ts && ts > maxTs) maxTs = ts;
    }
  }

  // Variables reales de telemetría HyNet / Stellar
  var soc = parseFloat(telemetry['battery_soc'] || telemetry['soc_promedio'] || 0.0);
  var vbat = parseFloat(telemetry['battery_voltage'] || telemetry['vbat_promedio'] || telemetry['load_dc_voltage'] || 0.0);
  var tbat = parseFloat(telemetry['temp_bateria_max'] || telemetry['battery_temperature'] || 0.0);
  var loadKw = parseFloat(telemetry['load_power_kw'] || telemetry['demanda_carga_kw'] || telemetry['load_dc_power_kw'] || 0.0);
  var solarKw = parseFloat(telemetry['solar_power_kw'] || telemetry['generacion_solar_kw'] || telemetry['solar_charger_power_kw'] || 0.0);
  var scVolt = parseFloat(telemetry['solar_charger_voltage'] || 0.0);
  var gridKw = parseFloat(telemetry['grid_power_kw'] || 0.0);
  var gridVolt = parseFloat(telemetry['grid_voltage'] || telemetry['tension_fase_u'] || 0.0);
  var gridFreq = parseFloat(telemetry['grid_frequency'] || telemetry['frecuencia_red_hz'] || 0.0);
  var gridAvail = parseInt(telemetry['grid_available'] !== undefined ? telemetry['grid_available'] : 1, 10);
  var dgKw = parseFloat(telemetry['dg_potencia_activa_kw'] || telemetry['generator_power_kw'] || 0.0);
  var genFuel = telemetry['generator_fuel_level'] !== undefined && telemetry['generator_fuel_level'] !== null ? parseFloat(telemetry['generator_fuel_level']) : null;
  var genRuntime = parseFloat(telemetry['generator_runtime_hours'] || 0.0);
  var rectKw = parseFloat(telemetry['rectifier_power_kw'] || 0.0);
  var rectVolt = parseFloat(telemetry['rectifier_voltage'] || 0.0);
  var invKw = parseFloat(telemetry['inverter_power_kw'] || telemetry['inverter_array_power'] || 0.0);
  var edgeOffline = parseInt(telemetry['edge_offline_alarm'] || 0, 10);
  var sysState = parseInt(telemetry['system_state_code'] || 0, 10);
  var autonomyH = parseFloat(telemetry['battery_autonomy_hours'] || 0.0);
  var topologia = (telemetry['site_topology'] || "").toUpperCase();

  var isOffGrid = topologia.indexOf('OFF_GRID') !== -1;
  var hasDg = topologia.indexOf('DG') !== -1 || genRuntime > 5.0 || dgKw > 0.1;
  var nowHour = new Date().getHours();
  var isPeakSolarHour = (nowHour >= 10 && nowHour <= 14);

  var activeAlarms = [];
  var warningAlarms = [];
  // Timestamp real de la telemetría en hora local del usuario
  var nowIso = self.formatAlarmTime(maxTs > 0 ? maxTs : Date.now());

  // 1. Gateway Edge HyNet
  if (edgeOffline === 1) {
    activeAlarms.push({
      id: 'ALM-HNT-001',
      time: nowIso,
      subsystem: 'Enlace HyNet Gateway',
      tag: siteName,
      code: 'ALM-HNT-001',
      desc: 'Controlador Edge Offline (Pérdida de enlace con sitio remoto)',
      metrics: 'Estado: <strong>OFFLINE</strong>',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  }

  if (sysState !== 0) {
    warningAlarms.push({
      id: 'ALM-HNT-002',
      time: nowIso,
      subsystem: 'Controlador Central',
      tag: 'HyNet Core',
      code: 'ALM-HNT-002',
      desc: 'Anormalidad reportada en estado del sistema',
      metrics: 'Código de Estado: <strong>' + sysState + '</strong>',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // 2. Banco de Baterías Bus DC 48V
  if (soc > 0 && soc < 15.0) {
    activeAlarms.push({
      id: 'ALM-BAT-001',
      time: nowIso,
      subsystem: 'Banco Baterías 48V',
      tag: 'BESS Telecom',
      code: 'ALM-BAT-001',
      desc: 'SOC por debajo del límite crítico (Riesgo LVD / Apagado BTS)',
      metrics: 'SOC: <strong>' + soc.toFixed(1) + '%</strong> (Límite: < 15%)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (soc > 0 && soc < 25.0) {
    warningAlarms.push({
      id: 'ALM-BAT-002',
      time: nowIso,
      subsystem: 'Banco Baterías 48V',
      tag: 'BESS Telecom',
      code: 'ALM-BAT-002',
      desc: 'SOC bajo preventivo (Reserva operativa reducida)',
      metrics: 'SOC: <strong>' + soc.toFixed(1) + '%</strong> (Límite: < 25%)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  if (vbat > 20.0 && vbat < 47.0) {
    activeAlarms.push({
      id: 'ALM-BAT-003',
      time: nowIso,
      subsystem: 'Bus DC 48V',
      tag: 'Tensión DC',
      code: 'ALM-BAT-003',
      desc: 'Subtensión severa en bus de alimentación DC',
      metrics: 'V_bus: <strong>' + vbat.toFixed(2) + ' V</strong> (Límite: < 47.0 V)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (vbat > 20.0 && vbat < 48.5) {
    warningAlarms.push({
      id: 'ALM-BAT-004',
      time: nowIso,
      subsystem: 'Bus DC 48V',
      tag: 'Tensión DC',
      code: 'ALM-BAT-004',
      desc: 'Subtensión preventiva en bus DC',
      metrics: 'V_bus: <strong>' + vbat.toFixed(2) + ' V</strong> (Límite: < 48.5 V)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  if (vbat > 57.6) {
    activeAlarms.push({
      id: 'ALM-BAT-005',
      time: nowIso,
      subsystem: 'Bus DC 48V',
      tag: 'Tensión DC',
      code: 'ALM-BAT-005',
      desc: 'Sobretensión en bus DC de baterías',
      metrics: 'V_bus: <strong>' + vbat.toFixed(2) + ' V</strong> (Límite: > 57.6 V)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  }

  if (tbat > 45.0) {
    activeAlarms.push({
      id: 'ALM-BAT-006',
      time: nowIso,
      subsystem: 'Climatización / Baterías',
      tag: 'Sensor Térmico',
      code: 'ALM-BAT-006',
      desc: 'Sobretemperatura crítica en banco de baterías',
      metrics: 'T_bat: <strong>' + tbat.toFixed(1) + ' °C</strong> (Límite: > 45 °C)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (tbat > 38.0) {
    warningAlarms.push({
      id: 'ALM-BAT-007',
      time: nowIso,
      subsystem: 'Climatización / Baterías',
      tag: 'Sensor Térmico',
      code: 'ALM-BAT-007',
      desc: 'Temperatura elevada en gabinete de baterías',
      metrics: 'T_bat: <strong>' + tbat.toFixed(1) + ' °C</strong> (Límite: > 38 °C)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // ALM-BAT-009: Autonomía Residual Crítica (Solo ante agotamiento real sin generación activa)
  var hasActiveGen = (gridAvail === 1 && gridKw > 0.1) || (dgKw > 0.1) || (solarKw >= 0.3 * Math.max(0.1, loadKw));
  var isBessDepleted = (soc > 0 && soc < 25.0) || (vbat > 20.0 && vbat < 48.0);
  if (autonomyH > 0 && autonomyH < 2.0 && !hasActiveGen && isBessDepleted) {
    activeAlarms.push({
      id: 'ALM-BAT-009',
      time: nowIso,
      subsystem: 'Autonomía de Sitio',
      tag: 'Estimación BESS',
      code: 'ALM-BAT-009',
      desc: 'Autonomía residual crítica (Batería en agotamiento sin fuentes activas)',
      metrics: 'Autonomía: <strong>' + autonomyH.toFixed(1) + ' h</strong> | SOC: ' + soc.toFixed(1) + '%',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  }

  // 3. Carga de Radiobase Telecom
  if (loadKw > 0 && loadKw < 0.05) {
    activeAlarms.push({
      id: 'ALM-LOD-001',
      time: nowIso,
      subsystem: 'Carga BTS Telecom',
      tag: 'Consumo Radiobase',
      code: 'ALM-LOD-001',
      desc: 'Caída anómala de carga telecom (Posible apagado de equipos)',
      metrics: 'Carga: <strong>' + loadKw.toFixed(3) + ' kW</strong> (Umbral: < 0.05 kW)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  }

  // 4. Rectificadores Telecom AC/DC vs Inversor/Cargador AC
  var convHw = (telemetry['conversion_hardware'] || '').toUpperCase();
  var isInvSite = (convHw === 'INVERSOR_CARGADOR') ||
                  (siteName.indexOf('ARENAL') !== -1 || siteName.indexOf('AGUA CALIENTE') !== -1 ||
                   siteName.indexOf('BUENOS AIRES') !== -1 || siteName.indexOf('CAMPO LIMONES') !== -1 ||
                   siteName.indexOf('CAMALOTE') !== -1 || topologia.indexOf('INVERTER') !== -1 ||
                   (Math.abs(invKw) > 0.05 && rectKw === 0.0 && rectVolt === 0.0));

  var acPower = Math.max(gridKw, dgKw);
  var batCurr = parseFloat(telemetry['battery_current'] || 0.0);
  var batPwr = parseFloat(telemetry['battery_power_kw'] || 0.0);

  // CASO A: Sitios con Planta de Rectificadores DC
  if (!isInvSite && !isOffGrid && acPower > 0.4 && rectKw <= 0.05) {
    if (solarKw < 0.15 && (batCurr < 0.2 || batPwr <= 0.0) && (soc < 50.0 || vbat < 49.5)) {
      activeAlarms.push({
        id: 'ALM-REC-001',
        time: nowIso,
        subsystem: 'Rectificadores AC/DC',
        tag: 'Planta de Fuerza',
        code: 'ALM-REC-001',
        desc: 'Falla de rectificadores con fuente AC presente (Batería en descarga)',
        metrics: 'Red/DG: ' + acPower.toFixed(2) + ' kW | Rect: <strong>' + rectKw.toFixed(2) + ' kW</strong> | I_bat: ' + batCurr.toFixed(1) + ' A | SOC: ' + soc.toFixed(1) + '%',
        severity: 'CRITICAL',
        status: 'ACTIVA'
      });
    }
  }

  // CASO B: Sitios con Inversor / Cargador Bidireccional AC
  if (isInvSite && acPower > 0.4 && solarKw < 0.15) {
    if ((batCurr < -1.0 || batPwr < -0.05) && (soc < 50.0 || vbat < 48.5)) {
      activeAlarms.push({
        id: 'ALM-INV-001',
        time: nowIso,
        subsystem: 'Inversor / Cargador AC',
        tag: 'Planta Inversor',
        code: 'ALM-INV-001',
        desc: 'Falla de cargador en inversor con fuente AC presente (Batería en descarga)',
        metrics: 'Red/DG: ' + acPower.toFixed(2) + ' kW | Inv: ' + invKw.toFixed(2) + ' kW | I_bat: <strong>' + batCurr.toFixed(1) + ' A</strong> | SOC: ' + soc.toFixed(1) + '%',
        severity: 'CRITICAL',
        status: 'ACTIVA'
      });
    }
  }

  // ALM-REC-002: Tensión en Bus DC de Fuerza / Bastidor de Rectificadores
  var vDcSys = rectVolt > 10.0 ? rectVolt : (vbat > 10.0 ? vbat : 0.0);
  if (rectKw > 0.1 && vDcSys > 20.0) {
    if (vDcSys < 47.0 || vDcSys > 57.6) {
      activeAlarms.push({
        id: 'ALM-REC-002',
        time: nowIso,
        subsystem: 'Rectificadores AC/DC',
        tag: 'Planta de Fuerza',
        code: 'ALM-REC-002',
        desc: 'Tensión de salida de rectificadores / bus DC fuera de rango seguro',
        metrics: 'V_bus: <strong>' + vDcSys.toFixed(2) + ' V</strong> (Rango: 48.0V - 57.5V)',
        severity: 'CRITICAL',
        status: 'ACTIVA'
      });
    }
  }

  // 5. Generador Diésel (si aplica)
  if (hasDg && genFuel !== null && genFuel > 0 && genFuel < 15.0) {
    activeAlarms.push({
      id: 'ALM-GEN-001',
      time: nowIso,
      subsystem: 'Generador Diésel',
      tag: 'Tanque Combustible',
      code: 'ALM-GEN-001',
      desc: 'Nivel crítico de combustible en tanque diésel',
      metrics: 'Nivel: <strong>' + genFuel.toFixed(1) + '%</strong> (Límite: < 15%)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (hasDg && genFuel !== null && genFuel > 0 && genFuel < 25.0) {
    warningAlarms.push({
      id: 'ALM-GEN-002',
      time: nowIso,
      subsystem: 'Generador Diésel',
      tag: 'Tanque Combustible',
      code: 'ALM-GEN-002',
      desc: 'Nivel bajo preventivo de combustible diésel',
      metrics: 'Nivel: <strong>' + genFuel.toFixed(1) + '%</strong> (Límite: < 25%)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // 6. Red Comercial (si aplica)
  if (!isOffGrid && gridAvail === 0) {
    warningAlarms.push({
      id: 'ALM-GRD-001',
      time: nowIso,
      subsystem: 'Red Comercial AC',
      tag: 'Acometida Eléctrica',
      code: 'ALM-GRD-001',
      desc: 'Corte de suministro eléctrico / Red caída',
      metrics: 'Estado: <strong>CORTE DE RED</strong> (Sitio en BESS/Diésel)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // Bitácora histórica real (si se envía fault_history_json para este sitio)
  var historyEvents = [];
  if (telemetry['fault_history_json']) {
    try {
      historyEvents = typeof telemetry['fault_history_json'] === 'string' ? JSON.parse(telemetry['fault_history_json']) : telemetry['fault_history_json'];
    } catch(e) {}
  }

  self.activeAlarms = activeAlarms;
  self.warningAlarms = warningAlarms;
  self.historyEvents = historyEvents;

  if (!container) return;

  var card = container.querySelector('#alarm-card');
  var numCrit = activeAlarms.length;
  var numWarn = warningAlarms.length;
  var hasCrit = numCrit > 0;
  var hasWarn = numWarn > 0;

  if (card) {
    card.className = 'alarm-card-container ' + (hasCrit ? 'has-critical' : (hasWarn ? 'has-warning' : 'healthy'));
  }

  var elBadge = container.querySelector('#alarm-status-badge');
  if (elBadge) {
    if (hasCrit) {
      elBadge.className = 'alarm-badge critical';
      elBadge.innerHTML = '<span class="badge-dot">●</span><span class="badge-text">' + numCrit + ' ALARMA' + (numCrit > 1 ? 'S' : '') + ' CRÍTICA' + (numCrit > 1 ? 'S' : '') + '</span>';
    } else if (hasWarn) {
      elBadge.className = 'alarm-badge warning';
      elBadge.innerHTML = '<span class="badge-dot">●</span><span class="badge-text">' + numWarn + ' ADVERTENCIA' + (numWarn > 1 ? 'S' : '') + '</span>';
    } else {
      elBadge.className = 'alarm-badge healthy';
      elBadge.innerHTML = '<span class="badge-dot">●</span><span class="badge-text">SISTEMA SALUDABLE</span>';
    }
  }

  var elAct = container.querySelector('#val-active-alarms');
  if (elAct) {
    elAct.textContent = numCrit;
    elAct.className = 'tile-kpi-num ' + (hasCrit ? 'alert' : 'healthy');
  }

  var elLblAct = container.querySelector('#lbl-active-sub');
  if (elLblAct) {
    elLblAct.textContent = hasCrit ? (numCrit + ' Disparo' + (numCrit > 1 ? 's' : '') + ' activo') : 'Sin disparos críticos';
  }

  var elWarn = container.querySelector('#val-warnings-now');
  if (elWarn) {
    elWarn.textContent = numWarn;
    elWarn.className = 'tile-kpi-num ' + (hasWarn ? 'warn' : 'normal');
  }

  var elLblWarn = container.querySelector('#lbl-warn-sub');
  if (elLblWarn) {
    elLblWarn.textContent = hasWarn ? (numWarn + ' Alerta' + (numWarn > 1 ? 's' : '') + ' preventiva') : 'Límites preventivos OK';
  }

  var totalHistoricalFaults = parseInt(telemetry['faults_30d_total'] || historyEvents.length || 0, 10);
  var elF = container.querySelector('#val-faults-30d');
  if (elF) elF.textContent = totalHistoricalFaults;

  var elTicker = container.querySelector('#ticker-message');
  var elTickerTime = container.querySelector('#ticker-timestamp');
  if (elTicker) {
    if (hasCrit) {
      elTicker.textContent = activeAlarms[0].code + ': ' + activeAlarms[0].desc;
      elTicker.style.color = '#ef4444';
      if (elTickerTime) elTickerTime.textContent = activeAlarms[0].time.substring(11);
    } else if (hasWarn) {
      elTicker.textContent = warningAlarms[0].code + ': ' + warningAlarms[0].desc;
      elTicker.style.color = '#f59e0b';
      if (elTickerTime) elTickerTime.textContent = warningAlarms[0].time.substring(11);
    } else {
      elTicker.textContent = 'Parámetros dentro de tolerancia nominal. Batería 48V, Solar y Cargas estables.';
      elTicker.style.color = '#94a3b8';
      if (elTickerTime) elTickerTime.textContent = 'En vivo';
    }
  }

  if (hasCrit) {
    self.playAudioAlert('CRITICAL');
  } else if (hasWarn) {
    self.playAudioAlert('WARNING');
  }

  if (self.modalElement) {
    self.renderModalTable();
  }
};

// --------------------------------------------------------------------------
// MODAL DE CONSOLA SCADA INTERACTIVA
// --------------------------------------------------------------------------
self.openModal = function(initialTab) {
  self.ensureModalStyles();

  var oldModal = document.getElementById('scada-alarm-modal-root');
  if (oldModal) oldModal.remove();

  self.activeTab = initialTab || 'all';
  self.initAudioContext();

  var siteName = self.getSiteName();

  var overlay = document.createElement('div');
  overlay.className = 'scada-modal-overlay';
  overlay.id = 'scada-alarm-modal-root';

  var muteIcon = self.isMuted ? '🔇' : '🔊';
  var muteClass = self.isMuted ? 'muted' : '';
  var muteTitle = self.isMuted ? 'Sonido Silenciado' : 'Sonido Activado';

  var modalHtml = '';
  modalHtml += '<div class="scada-modal-window">';
  modalHtml += '  <div class="modal-header">';
  modalHtml += '    <div class="modal-header-left">';
  modalHtml += '      <div class="modal-header-icon">🛡️</div>';
  modalHtml += '      <div>';
  modalHtml += '        <div class="modal-header-title">CONSOLA SCADA DE ALARMAS Y EVENTOS • ' + siteName + '</div>';
  modalHtml += '        <div class="modal-header-sub">Supervisión en Tiempo Real • Bus DC 48V Telecom • Bitácora HyNet</div>';
  modalHtml += '      </div>';
  modalHtml += '    </div>';
  modalHtml += '    <div class="modal-header-right">';
  modalHtml += '      <button id="btn-modal-test-sound" class="btn-test-sound" type="button" title="Probar alertas sonoras">';
  modalHtml += '        <span>🔊 Probar Sonido</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button id="btn-modal-mute" class="scada-icon-btn ' + muteClass + '" type="button" title="' + muteTitle + '">';
  modalHtml += '        <span>' + muteIcon + '</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button id="btn-modal-close" class="btn-modal-close" type="button" title="Cerrar Consola (Esc)">✕</button>';
  modalHtml += '    </div>';
  modalHtml += '  </div>';

  modalHtml += '  <div class="modal-toolbar">';
  modalHtml += '    <div class="modal-tabs">';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'all' ? 'active' : '') + '" data-tab="all">';
  modalHtml += '        <span>Todas</span><span class="tab-badge" id="tab-badge-all">0</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'critical' ? 'active' : '') + '" data-tab="critical">';
  modalHtml += '        <span>Críticas</span><span class="tab-badge" id="tab-badge-crit">0</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'warning' ? 'active' : '') + '" data-tab="warning">';
  modalHtml += '        <span>Advertencias</span><span class="tab-badge" id="tab-badge-warn">0</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'history' ? 'active' : '') + '" data-tab="history">';
  modalHtml += '        <span>Historial (30D)</span><span class="tab-badge" id="tab-badge-hist">0</span>';
  modalHtml += '      </button>';
  modalHtml += '    </div>';
  modalHtml += '    <div class="modal-search-box">';
  modalHtml += '      <span class="search-icon-placeholder">🔍</span>';
  modalHtml += '      <input type="text" id="modal-search-input" class="modal-search-input" placeholder="Buscar por equipo, código o evento..." value="' + (self.searchQuery || '') + '" autocomplete="off">';
  modalHtml += '    </div>';
  modalHtml += '  </div>';

  modalHtml += '  <div class="modal-body" id="modal-table-container">';
  modalHtml += '  </div>';

  modalHtml += '  <div class="modal-footer">';
  modalHtml += '    <span>Norma: IEEE 1547 / Telecom ANSI/TIA • 24 Umbrales de Seguridad</span>';
  modalHtml += '    <span>Presione <kbd style="background:rgba(255,255,255,0.1);padding:2px 5px;border-radius:4px;">ESC</kbd> o haga clic fuera para salir</span>';
  modalHtml += '  </div>';
  modalHtml += '</div>';

  overlay.innerHTML = modalHtml;
  document.body.appendChild(overlay);
  self.modalElement = overlay;

  overlay.onclick = function(e) {
    if (e.target === overlay) self.closeModal();
  };

  var btnClose = overlay.querySelector('#btn-modal-close');
  if (btnClose) btnClose.onclick = function() { self.closeModal(); };

  var btnTest = overlay.querySelector('#btn-modal-test-sound');
  if (btnTest) {
    btnTest.onclick = function() {
      self.initAudioContext();
      self.playAudioAlert('TEST_WARN');
      setTimeout(function() { self.playAudioAlert('TEST_CRIT'); }, 500);
    };
  }

  var btnModalMute = overlay.querySelector('#btn-modal-mute');
  if (btnModalMute) {
    btnModalMute.onclick = function() {
      self.toggleAudioMute();
      var icon = btnModalMute.querySelector('span');
      if (icon) icon.textContent = self.isMuted ? '🔇' : '🔊';
      if (self.isMuted) btnModalMute.classList.add('muted');
      else btnModalMute.classList.remove('muted');
    };
  }

  var tabs = overlay.querySelectorAll('.modal-tab-btn');
  tabs.forEach(function(tab) {
    tab.onclick = function(e) {
      e.stopPropagation();
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      self.activeTab = tab.getAttribute('data-tab');
      self.renderModalTable();
    };
  });

  var inputSearch = overlay.querySelector('#modal-search-input');
  if (inputSearch) {
    inputSearch.oninput = function(e) {
      self.searchQuery = (e.target.value || '').toLowerCase();
      self.renderModalTable();
    };
  }

  self.keyHandler = function(e) {
    if (e.key === 'Escape') self.closeModal();
  };
  window.addEventListener('keydown', self.keyHandler);

  self.renderModalTable();
};

self.closeModal = function() {
  if (self.modalElement) {
    self.modalElement.remove();
    self.modalElement = null;
  }
  var root = document.getElementById('scada-alarm-modal-root');
  if (root) root.remove();
  if (self.keyHandler) {
    window.removeEventListener('keydown', self.keyHandler);
    self.keyHandler = null;
  }
};

self.acknowledgeAlarm = function(alarmId) {
  self.ackMap[alarmId] = true;
  localStorage.setItem('telecom_alarms_ack', JSON.stringify(self.ackMap));
  self.playAudioAlert('ACK');
  self.renderModalTable();
};

self.renderModalTable = function() {
  if (!self.modalElement) return;

  var container = self.modalElement.querySelector('#modal-table-container');
  if (!container) return;

  var badgeAll = self.modalElement.querySelector('#tab-badge-all');
  var badgeCrit = self.modalElement.querySelector('#tab-badge-crit');
  var badgeWarn = self.modalElement.querySelector('#tab-badge-warn');
  var badgeHist = self.modalElement.querySelector('#tab-badge-hist');

  var critList = self.activeAlarms || [];
  var warnList = self.warningAlarms || [];
  var histList = self.historyEvents || [];

  if (badgeAll) badgeAll.textContent = critList.length + warnList.length;
  if (badgeCrit) badgeCrit.textContent = critList.length;
  if (badgeWarn) badgeWarn.textContent = warnList.length;
  if (badgeHist) badgeHist.textContent = histList.length;

  var rows = [];
  if (self.activeTab === 'all') {
    rows = critList.concat(warnList);
  } else if (self.activeTab === 'critical') {
    rows = critList;
  } else if (self.activeTab === 'warning') {
    rows = warnList;
  } else if (self.activeTab === 'history') {
    rows = histList;
  }

  if (self.searchQuery) {
    rows = rows.filter(function(r) {
      var matchText = (r.subsystem + ' ' + r.tag + ' ' + r.code + ' ' + r.desc + ' ' + r.metrics).toLowerCase();
      return matchText.indexOf(self.searchQuery) !== -1;
    });
  }

  if (rows.length === 0) {
    var isHist = self.activeTab === 'history';
    var emptyTitle = isHist ? 'Sin eventos en la bitácora histórica' : 'Sin alarmas activas en esta vista';
    var emptySub = isHist ? 'No se han registrado fallas operativas en el período seleccionado. La radiobase opera con normalidad.' : 'Todos los subsistemas telecom operan dentro de los umbrales nominales de seguridad.';
    container.innerHTML = '' +
      '<div class="table-empty-state">' +
      '  <div class="empty-icon">🛡️</div>' +
      '  <div class="empty-title">' + emptyTitle + '</div>' +
      '  <div class="empty-sub">' + emptySub + '</div>' +
      '</div>';
    return;
  }

  var html = '<table class="scada-alarm-table">';
  html += '<thead><tr>';
  html += '  <th style="width: 140px;">FECHA & HORA</th>';
  html += '  <th style="width: 180px;">SUBSISTEMA / EQUIPO</th>';
  html += '  <th style="width: 120px;">CÓDIGO</th>';
  html += '  <th>EVENTO / DETALLE OPERATIVO</th>';
  html += '  <th style="width: 210px;">VALOR MEDIDO vs LÍMITE</th>';
  html += '  <th style="width: 110px;">SEVERIDAD</th>';
  html += '  <th style="width: 110px;">ACCIÓN</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var isAcked = self.ackMap[r.id] === true;
    var rowClass = r.severity === 'CRITICAL' ? 'alarm-row-critical' : (r.severity === 'WARNING' ? 'alarm-row-warning' : 'alarm-row-healthy');
    var sevBadgeClass = r.severity === 'CRITICAL' ? 'badge-sev critical' : (r.severity === 'WARNING' ? 'badge-sev warning' : 'badge-sev ok');
    var sevText = r.severity === 'CRITICAL' ? 'CRÍTICA' : (r.severity === 'WARNING' ? 'ADVERTENCIA' : 'INFORMATIVO');

    var rowTime = self.formatAlarmTime(r.time);
    html += '<tr class="' + rowClass + '">';
    html += '  <td><span class="cell-time">' + (rowTime ? rowTime.substring(0, 10) : '') + '</span><span class="cell-time-rel">' + (rowTime ? rowTime.substring(11) : '') + '</span></td>';
    html += '  <td><div class="cell-subsystem">' + r.subsystem + '</div><div class="cell-tag">' + r.tag + '</div></td>';
    html += '  <td><span class="cell-code">' + r.code + '</span></td>';
    html += '  <td><div class="cell-desc">' + r.desc + '</div></td>';
    html += '  <td><div class="cell-metrics">' + r.metrics + '</div></td>';
    html += '  <td><span class="' + sevBadgeClass + '">' + sevText + '</span></td>';
    html += '  <td>';
    if (r.severity === 'OK') {
      html += '<span class="ack-status resolved">Auto-despejada</span>';
    } else if (isAcked) {
      html += '<span class="ack-status acknowledged">✓ Reconocida</span>';
    } else {
      html += '<button class="btn-ack" onclick="window.hybricoAckAlarm && window.hybricoAckAlarm(\'' + r.id + '\', event)">Reconocer</button>';
    }
    html += '  </td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  window.hybricoAckAlarm = function(id, evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    self.acknowledgeAlarm(id);
  };
};

self.onDestroy = function() {
  self.closeModal();
};
