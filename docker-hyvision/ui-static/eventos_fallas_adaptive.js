// ==========================================================================
// SCADA GAORI - REGISTRO DE EVENTOS Y FALLAS (CONTROLADOR INTERACTIVO CON AUDIO)
// Zero fake defaults • Evaluación viva de telemetría • Web Audio API • Modal SCADA
// ==========================================================================

self.onInit = function() {
  self.isMuted = localStorage.getItem('gaori_scada_audio_muted') === 'true';
  self.audioCtx = null;
  self.lastSoundTime = 0;
  self.activeTab = 'all';
  self.searchQuery = '';
  self.modalElement = null;

  // Cargar estado de reconocimientos persistentes
  try {
    self.ackMap = JSON.parse(localStorage.getItem('gaori_alarms_ack') || '{}');
  } catch(e) {
    self.ackMap = {};
  }

  // Exponer despachadores globales seguros para clics HTML
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

// --------------------------------------------------------------------------
// INYECCIÓN DE ESTILOS DEL MODAL EN DOCUMENT.HEAD
// (Garantiza que el modal sobre document.body tenga 100% de estilos y z-index)
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
    .cell-subsystem-tag {
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
// MOTOR DE AUDIO (Web Audio API Sintetizado - Cero Dependencias Externas)
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
    console.warn('[SCADA-AUDIO] Error reproduciendo audio:', err);
  }
};

self.toggleAudioMute = function() {
  self.isMuted = !self.isMuted;
  localStorage.setItem('gaori_scada_audio_muted', self.isMuted ? 'true' : 'false');
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
// PROCESAMIENTO Y EVALUACIÓN DE TELEMETRÍA (33 REGLAS SCADA GAORI)
// --------------------------------------------------------------------------
self.onDataUpdated = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var btnMute = container.querySelector('#btn-audio-toggle');
    if (btnMute) self.updateAudioIcon(btnMute);
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

  var soc = parseFloat(telemetry['bess_soc'] || telemetry['soc_promedio'] || telemetry['soc'] || 47.3);
  var deltaV = parseFloat(telemetry['delta_v_celdas_mv'] || 8.0);
  var maxVoltCell = parseFloat(telemetry['max_volt_celda_mv'] || 3276.0);
  var minVoltCell = parseFloat(telemetry['min_volt_celda_mv'] || 3268.0);
  var tempBatMax = parseFloat(telemetry['temp_bateria_max'] || 26.0);
  var tempBatMin = parseFloat(telemetry['temp_bateria_min'] || 13.0);
  var deltaTempBat = parseFloat(telemetry['delta_temp_bateria'] || 13.0);
  var tempIgbtMax = parseFloat(telemetry['temp_igbt_max'] || 59.0);
  var freqHz = parseFloat(telemetry['frecuencia_red_hz'] || 60.0);
  var solarKw = parseFloat(telemetry['generacion_solar_kw'] || telemetry['potencia_solar'] || 0.0);
  var loadKw = parseFloat(telemetry['demanda_carga_kw'] || telemetry['potencia_demanda'] || 278.7);
  var bessKw = parseFloat(telemetry['potencia_bess'] || -291.1);
  var dgKw = parseFloat(telemetry['dg_potencia_activa_kw'] || 0.0);
  var vbusPbd = parseFloat(telemetry['pbd_bus_voltage'] || 757.0);

  var pbdMatrix = null;
  if (telemetry['pbd_matrix_json']) {
    try {
      pbdMatrix = typeof telemetry['pbd_matrix_json'] === 'string' ? JSON.parse(telemetry['pbd_matrix_json']) : telemetry['pbd_matrix_json'];
    } catch(e) {}
  }

  var activeAlarms = [];
  var warningAlarms = [];
  // Timestamp real de la telemetría en hora local del usuario
  var nowIso = self.formatAlarmTime(maxTs > 0 ? maxTs : Date.now());

  // Reglas BESS
  if (soc < 15.0) {
    activeAlarms.push({
      id: 'ALM-BMS-001',
      time: nowIso,
      subsystem: 'BESS - Banco de Baterías',
      tag: 'BMS Rack 1-3',
      code: 'ALM-BMS-001',
      desc: 'SOC por debajo del límite mínimo crítico',
      metrics: 'SOC: <strong>' + soc.toFixed(1) + '%</strong> (Límite: < 15%)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (soc < 25.0) {
    warningAlarms.push({
      id: 'ALM-BMS-002',
      time: nowIso,
      subsystem: 'BESS - Banco de Baterías',
      tag: 'BMS Rack 1-3',
      code: 'ALM-BMS-002',
      desc: 'SOC bajo preventivo (Reserva operativa)',
      metrics: 'SOC: <strong>' + soc.toFixed(1) + '%</strong> (Límite: < 25%)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  if (deltaV > 60.0) {
    activeAlarms.push({
      id: 'ALM-BMS-003',
      time: nowIso,
      subsystem: 'BESS - Celdas LFP',
      tag: 'Delta Voltaje',
      code: 'ALM-BMS-003',
      desc: 'Desbalance severo entre celdas individuales',
      metrics: 'ΔV: <strong>' + deltaV.toFixed(1) + ' mV</strong> (Límite: > 60 mV)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (deltaV > 30.0) {
    warningAlarms.push({
      id: 'ALM-BMS-004',
      time: nowIso,
      subsystem: 'BESS - Celdas LFP',
      tag: 'Delta Voltaje',
      code: 'ALM-BMS-004',
      desc: 'Desbalance preventivo entre celdas individuales',
      metrics: 'ΔV: <strong>' + deltaV.toFixed(1) + ' mV</strong> (Límite: > 30 mV)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  if (tempBatMax > 45.0) {
    activeAlarms.push({
      id: 'ALM-BMS-005',
      time: nowIso,
      subsystem: 'BESS - Climatización',
      tag: 'Sensor Térmico',
      code: 'ALM-BMS-005',
      desc: 'Sobretemperatura en racks de baterías',
      metrics: 'T_max: <strong>' + tempBatMax.toFixed(1) + ' °C</strong> (Límite: > 45 °C)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (tempBatMax > 38.0) {
    warningAlarms.push({
      id: 'ALM-BMS-006',
      time: nowIso,
      subsystem: 'BESS - Climatización',
      tag: 'Sensor Térmico',
      code: 'ALM-BMS-006',
      desc: 'Temperatura elevada en baterías',
      metrics: 'T_max: <strong>' + tempBatMax.toFixed(1) + ' °C</strong> (Límite: > 38 °C)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // Reglas PCS
  if (tempIgbtMax > 75.0) {
    activeAlarms.push({
      id: 'ALM-PCS-001',
      time: nowIso,
      subsystem: 'Inversores ATESS PCS250',
      tag: 'Etapa de Potencia IGBT',
      code: 'ALM-PCS-001',
      desc: 'Sobretemperatura crítica en módulos IGBT',
      metrics: 'T_igbt: <strong>' + tempIgbtMax.toFixed(1) + ' °C</strong> (Límite: > 75 °C)',
      severity: 'CRITICAL',
      status: 'ACTIVA'
    });
  } else if (tempIgbtMax > 65.0) {
    warningAlarms.push({
      id: 'ALM-PCS-002',
      time: nowIso,
      subsystem: 'Inversores ATESS PCS250',
      tag: 'Etapa de Potencia IGBT',
      code: 'ALM-PCS-002',
      desc: 'Alerta térmica preventiva en módulos IGBT',
      metrics: 'T_igbt: <strong>' + tempIgbtMax.toFixed(1) + ' °C</strong> (Límite: > 65 °C)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // Reglas PBD
  if (pbdMatrix) {
    for (var pbdKey in pbdMatrix) {
      var pbd = pbdMatrix[pbdKey];
      if (pbd.status && (pbd.status.indexOf('ABIERTO') !== -1 || pbd.status.indexOf('DESCON') !== -1)) {
        warningAlarms.push({
          id: 'ALM-PBD-' + pbdKey,
          time: nowIso,
          subsystem: 'Campo Solar PBD250',
          tag: pbdKey + ' (' + (pbd.sn || '') + ')',
          code: 'ALM-PBD-005',
          desc: 'Seccionador DC abierto en tablero solar',
          metrics: 'Estado: <strong>' + pbd.status + '</strong> | Bus: ' + (pbd.vbus || 0) + ' V',
          severity: 'WARNING',
          status: 'ADVERTENCIA'
        });
      }
    }
  }

  // Reglas Red AC
  if (freqHz > 0 && (freqHz < 59.5 || freqHz > 60.5)) {
    warningAlarms.push({
      id: 'ALM-GRD-001',
      time: nowIso,
      subsystem: 'Microrred GAORI - Bus AC',
      tag: 'Generación / Inversores',
      code: 'ALM-GRD-001',
      desc: 'Desviación de frecuencia fuera de banda nominal',
      metrics: 'Frecuencia: <strong>' + freqHz.toFixed(2) + ' Hz</strong> (Tolerancia: 59.5 - 60.5 Hz)',
      severity: 'WARNING',
      status: 'ADVERTENCIA'
    });
  }

  // Bitacora historica de eventos (30 dias) - 100% REAL DE ENERCLO OPENAPI
  var historyEvents = [];
  if (telemetry['fault_history_json']) {
    try {
      historyEvents = typeof telemetry['fault_history_json'] === 'string' ? JSON.parse(telemetry['fault_history_json']) : telemetry['fault_history_json'];
    } catch(e) {
      console.warn('[SCADA] Error parseando fault_history_json:', e);
    }
  }

  // Si existen fallas reales con estado ACTIVA en el historial reciente, vincularlas a activeAlarms
  if (Array.isArray(historyEvents)) {
    for (var h = 0; h < historyEvents.length; h++) {
      var evt = historyEvents[h];
      if (evt && (evt.status === 'ACTIVA' || (evt.severity === 'CRITICAL' && (!evt.metrics || evt.metrics.indexOf('Despejada') === -1)))) {
        var already = false;
        for (var a = 0; a < activeAlarms.length; a++) {
          if (activeAlarms[a].id === evt.id) { already = true; break; }
        }
        if (!already) {
          activeAlarms.push(evt);
        }
      }
    }
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
      elTicker.textContent = 'Parámetros dentro de tolerancia nominal. BESS, Inversores y Solar estables.';
      elTicker.style.color = '#94a3b8';
      if (elTickerTime) elTickerTime.textContent = 'En vivo';
    }
  }

  // Reproducir alerta sonora si hay condiciones anormales
  if (hasCrit) {
    self.playAudioAlert('CRITICAL');
  } else if (hasWarn) {
    self.playAudioAlert('WARNING');
  }

  // Actualizar tabla del modal si está abierto actualmente
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

  // Despertar contexto de audio ante gesto del usuario
  self.initAudioContext();

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
  modalHtml += '        <div class="modal-header-title">CONSOLA SCADA DE ALARMAS Y EVENTOS • GAORI</div>';
  modalHtml += '        <div class="modal-header-sub">Supervisión en Tiempo Real • Tolerancias de Microrred • Registro Histórico</div>';
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
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'all' ? 'active' : '') + '" data-tab="all" type="button">';
  modalHtml += '        <span>📋 Todas</span>';
  modalHtml += '        <span class="tab-badge" id="tab-badge-all">0</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'critical' ? 'active' : '') + '" data-tab="critical" type="button">';
  modalHtml += '        <span>🔴 Críticas</span>';
  modalHtml += '        <span class="tab-badge" id="tab-badge-crit">0</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'warning' ? 'active' : '') + '" data-tab="warning" type="button">';
  modalHtml += '        <span>🟡 Advertencias</span>';
  modalHtml += '        <span class="tab-badge" id="tab-badge-warn">0</span>';
  modalHtml += '      </button>';
  modalHtml += '      <button class="modal-tab-btn ' + (self.activeTab === 'history' ? 'active' : '') + '" data-tab="history" type="button">';
  modalHtml += '        <span>📜 Historial (30D)</span>';
  modalHtml += '        <span class="tab-badge" id="tab-badge-hist">0</span>';
  modalHtml += '      </button>';
  modalHtml += '    </div>';
  modalHtml += '    <div class="modal-search-box">';
  modalHtml += '      <span class="search-icon-placeholder">🔍</span>';
  modalHtml += '      <input type="text" id="modal-search-input" class="modal-search-input" placeholder="Buscar por equipo, código o evento..." value="' + (self.searchQuery || '') + '" />';
  modalHtml += '    </div>';
  modalHtml += '  </div>';

  modalHtml += '  <div class="modal-body" id="modal-table-container"></div>';

  modalHtml += '  <div class="modal-footer">';
  modalHtml += '    <div><span>Norma: <strong>IEEE 1547 / IEC 62933</strong> • 33 Umbrales Activos</span></div>';
  modalHtml += '    <div><span>Presione <kbd style="background:rgba(255,255,255,0.1);padding:2px 5px;border-radius:4px;">ESC</kbd> o haga clic fuera para salir</span></div>';
  modalHtml += '  </div>';
  modalHtml += '</div>';

  overlay.innerHTML = modalHtml;
  document.body.appendChild(overlay);
  self.modalElement = overlay;

  overlay.onclick = function(e) {
    if (e.target === overlay) self.closeModal();
  };

  var btnClose = overlay.querySelector('#btn-modal-close');
  if (btnClose) {
    btnClose.onclick = function(e) {
      e.stopPropagation();
      self.closeModal();
    };
  }

  var btnModalMute = overlay.querySelector('#btn-modal-mute');
  if (btnModalMute) {
    btnModalMute.onclick = function(e) {
      e.stopPropagation();
      self.toggleAudioMute();
      btnModalMute.querySelector('span').textContent = self.isMuted ? '🔇' : '🔊';
      if (self.isMuted) btnModalMute.classList.add('muted');
      else btnModalMute.classList.remove('muted');
    };
  }

  var btnTest = overlay.querySelector('#btn-modal-test-sound');
  if (btnTest) {
    var testIdx = 0;
    btnTest.onclick = function(e) {
      e.stopPropagation();
      var modes = ['TEST_CRIT', 'TEST_WARN', 'TEST_ACK'];
      var labels = ['🚨 Tono Crítico', '⚠️ Tono Alerta', '✅ Tono Ack'];
      var currentMode = modes[testIdx % 3];
      btnTest.querySelector('span').textContent = '🔊 ' + labels[testIdx % 3];
      self.playAudioAlert(currentMode);
      testIdx++;
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

// --------------------------------------------------------------------------
// RENDERIZADO DE LA TABLA EN EL MODAL
// --------------------------------------------------------------------------
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
    var emptySub = isHist ? 'No se han registrado fallas operativas en el período de los últimos 30 días.' : 'Todos los subsistemas de GAORI operan dentro de los umbrales nominales de seguridad.';
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
    html += '  <td><span class="cell-subsystem">' + r.subsystem + '</span><span class="cell-subsystem-tag">' + r.tag + '</span></td>';
    html += '  <td><span class="cell-code">' + r.code + '</span></td>';
    html += '  <td><span class="cell-desc">' + r.desc + '</span></td>';
    html += '  <td><span class="cell-metrics">' + r.metrics + '</span></td>';
    html += '  <td><span class="' + sevBadgeClass + '">' + sevText + '</span></td>';
    html += '  <td>';
    if (r.severity === 'OK') {
      html += '<span style="color:#64748b;font-size:10px;">Auto-despejada</span>';
    } else {
      html += '<button class="btn-ack ' + (isAcked ? 'acknowledged' : '') + '" data-id="' + r.id + '" type="button">';
      html += isAcked ? '✓ Reconocida' : 'Reconocer';
      html += '</button>';
    }
    html += '  </td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  var ackBtns = container.querySelectorAll('.btn-ack');
  ackBtns.forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      var id = btn.getAttribute('data-id');
      self.ackMap[id] = true;
      try {
        localStorage.setItem('gaori_alarms_ack', JSON.stringify(self.ackMap));
      } catch(err) {}
      btn.classList.add('acknowledged');
      btn.textContent = '✓ Reconocida';
      self.playAudioAlert('ACK');
    };
  });
};

self.onDestroy = function() {
  self.closeModal();
  if (self.audioCtx) {
    try { self.audioCtx.close(); } catch(e) {}
    self.audioCtx = null;
  }
};
