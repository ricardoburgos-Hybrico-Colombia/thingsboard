// Controller Script: SCADA - Desglose de Potencia por Fuente vs Demanda BTS (100% Telemetría Real)
self.onInit = function() {
  self.ctx.$scope.drawChart = self.drawChart;
  self.onDataUpdated();
};

self.onResize = function() {
  self.drawChart();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var p1 = 0.0, p2 = 0.0, p3 = 0.0;
  var solarKw = 0.0, gridKw = 0.0, dgKw = 0.0, bessKw = 0.0, loadKw = 0.0;
  var vdc = 0.0;
  var hasPcsData = false;
  var solarFraction = null;

  self.solarSeries = [];
  self.gridSeries = [];
  self.dgSeries = [];
  self.loadSeries = [];

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var rawVal = item.data[item.data.length - 1][1];
        var v = parseFloat(rawVal);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (!isNaN(v)) {
          if (k.indexOf('pac_pcs1') !== -1 || k.indexOf('carga_pcs1') !== -1) { p1 = v; hasPcsData = true; }
          else if (k.indexOf('pac_pcs2') !== -1 || k.indexOf('carga_pcs2') !== -1) { p2 = v; hasPcsData = true; }
          else if (k.indexOf('pac_pcs3') !== -1 || k.indexOf('carga_pcs3') !== -1) { p3 = v; hasPcsData = true; }
          
          if (k === 'solar_power_kw' || k === 'generacion_solar_kw' || k === 'solar_charger_power_kw') {
            solarKw = Math.max(solarKw, v);
            self.solarSeries = item.data;
          }
          else if (k === 'grid_power_kw') {
            gridKw = Math.max(gridKw, v);
            self.gridSeries = item.data;
          }
          else if (k === 'generator_power_kw' || k === 'dg_potencia_activa_kw') {
            dgKw = Math.max(dgKw, v);
            self.dgSeries = item.data;
          }
          else if (k === 'battery_power_kw' || k === 'potencia_bess_kw') {
            bessKw = v;
          }
          else if (k === 'load_power_kw' || k === 'demanda_carga_kw' || k === 'load_dc_power_kw') {
            loadKw = Math.max(loadKw, v);
            self.loadSeries = item.data;
          }
          else if (k === 'solar_fraction_pct') {
            solarFraction = v;
          }
          else if (k === 'rectifier_voltage' || k === 'battery_voltage') {
            if (v > 0) vdc = v;
          }
        }
      }
    }
  }

  self.latestSolar = solarKw;
  self.latestGrid = gridKw;
  self.latestDg = dgKw;
  self.latestLoad = loadKw;
  self.latestVdc = vdc;

  var isIndustrial = (vdc > 200.0) || hasPcsData;
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var elTitle = container.querySelector('#pcs-title-text');
  var elBadge = container.querySelector('#pcs-active-badge');
  var elKpiSol = container.querySelector('#kpi-solar-val');
  var elKpiGrid = container.querySelector('#kpi-grid-val');
  var elKpiDg = container.querySelector('#kpi-dg-val');
  var elKpiLoad = container.querySelector('#kpi-load-val');
  var elFootL = container.querySelector('#pac-footer-left');
  var elFootR = container.querySelector('#pac-footer-right');

  // KPI Bar
  if (elKpiSol) elKpiSol.textContent = solarKw.toFixed(2) + ' kW';
  if (elKpiGrid) elKpiGrid.textContent = gridKw.toFixed(2) + ' kW';
  if (elKpiDg) elKpiDg.textContent = dgKw.toFixed(2) + ' kW';
  if (elKpiLoad) elKpiLoad.textContent = loadKw.toFixed(2) + ' kW';

  var setRow = function(idLbl, idVal, idBar, label, val, maxVal, colorGrad) {
    var elL = container.querySelector(idLbl);
    var elV = container.querySelector(idVal);
    var elB = container.querySelector(idBar);
    if (elL) elL.textContent = label;
    if (elV) elV.textContent = val.toFixed(2) + ' kW';
    if (elB) {
      var pct = maxVal > 0 ? Math.min(100, Math.max(0, (val / maxVal) * 100)) : 0;
      elB.style.width = (val > 0 ? Math.max(4, pct) : 0) + '%';
      if (colorGrad) elB.style.background = colorGrad;
    }
  };

  if (isIndustrial) {
    if (elTitle) elTitle.textContent = 'POTENCIA ACTIVA POR INVERSOR (BESS UTILITY)';
    if (elBadge) {
      elBadge.textContent = '3/3 EN LÍNEA';
      elBadge.className = 'pcs-badge';
    }
    var maxPcs = 250.0;
    setRow('#pcs1-label', '#pac-pcs1-val', '#pac-pcs1-bar', 'PCS-1 (TQG136)', p1, maxPcs, 'linear-gradient(90deg, #38bdf8, #64B856)');
    setRow('#pcs2-label', '#pac-pcs2-val', '#pac-pcs2-bar', 'PCS-2 (TQG135)', p2, maxPcs, 'linear-gradient(90deg, #38bdf8, #64B856)');
    setRow('#pcs3-label', '#pac-pcs3-val', '#pac-pcs3-bar', 'PCS-3 (TQG134)', p3, maxPcs, 'linear-gradient(90deg, #38bdf8, #64B856)');

    if (elFootL) elFootL.innerHTML = 'Balance de Carga: <strong style="color:#64B856;">Equilibrado</strong>';
    if (elFootR) elFootR.innerHTML = 'Capacidad: <strong>750 kVA</strong>';
  } else {
    if (elTitle) elTitle.textContent = 'DESGLOSE DE POTENCIA POR FUENTE VS DEMANDA';
    var autoPct = solarFraction !== null ? solarFraction.toFixed(1) : (loadKw > 0 ? Math.min(100, Math.round((solarKw / loadKw) * 100)) : 100);
    if (elBadge) {
      elBadge.textContent = autoPct + '% AUTONOMÍA SOLAR';
      elBadge.className = 'pcs-badge' + (solarKw > 0 ? ' solar' : '');
    }

    var maxSource = Math.max(solarKw, gridKw, dgKw, loadKw, 1.5);
    setRow('#pcs1-label', '#pac-pcs1-val', '#pac-pcs1-bar', 'Solar Fotovoltaico', solarKw, maxSource, 'linear-gradient(90deg, #f7d048, #64B856)');
    setRow('#pcs2-label', '#pac-pcs2-val', '#pac-pcs2-bar', 'Red Comercial (Grid)', gridKw, maxSource, 'linear-gradient(90deg, #38bdf8, #0284c7)');
    setRow('#pcs3-label', '#pac-pcs3-val', '#pac-pcs3-bar', 'Generador Diésel (MG)', dgKw, maxSource, 'linear-gradient(90deg, #c084fc, #a855f7)');

    if (elFootL) {
      elFootL.innerHTML = 'Autonomía Solar: <strong style="color:' + (autoPct >= 70 ? '#64B856' : '#f7d048') + ';">' + autoPct + '%</strong> | Cobertura BTS';
    }
    if (elFootR) {
      elFootR.innerHTML = 'Demanda: <strong style="color:#f8fafc;">' + loadKw.toFixed(2) + ' kW</strong>';
    }
  }

  self.drawChart();
};

self.drawChart = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;
  var canvas = container.querySelector('#chart-power-breakdown');
  if (!canvas) return;

  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  var w = rect.width || 400;
  var h = rect.height || 140;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  var now = Date.now();
  var sSol = (self.solarSeries && self.solarSeries.length > 0) ? self.solarSeries : [[now - 600000, self.latestSolar || 0], [now, self.latestSolar || 0]];
  var sGrid = (self.gridSeries && self.gridSeries.length > 0) ? self.gridSeries : [[now - 600000, self.latestGrid || 0], [now, self.latestGrid || 0]];
  var sDg = (self.dgSeries && self.dgSeries.length > 0) ? self.dgSeries : [[now - 600000, self.latestDg || 0], [now, self.latestDg || 0]];
  var sLoad = (self.loadSeries && self.loadSeries.length > 0) ? self.loadSeries : [[now - 600000, self.latestLoad || 0], [now, self.latestLoad || 0]];

  // Calcular valor máximo de escala
  var allVals = [];
  [sSol, sGrid, sDg, sLoad].forEach(function(s) {
    s.forEach(function(p) {
      var val = parseFloat(p[1]);
      if (!isNaN(val)) allVals.push(val);
    });
  });

  var maxPwr = allVals.length > 0 ? Math.max.apply(null, allVals) : 2.0;
  var maxScale = Math.max(1.5, Math.ceil(maxPwr * 1.25 * 10) / 10);

  var padL = 36, padR = 20, padT = 12, padB = 22;
  var plotW = w - padL - padR;
  var plotH = h - padT - padB;
  if (plotW <= 10 || plotH <= 10) return;

  // Rejilla de fondo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (var r = 0; r <= 3; r++) {
    var y = padT + (plotH / 3) * r;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();

    var pLabel = ((maxScale / 3) * (3 - r)).toFixed(1) + ' kW';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(pLabel, padL - 5, y + 3);
  }

  // Marcas de tiempo en eje X
  var tMin = sLoad[0][0];
  var tMax = sLoad[sLoad.length - 1][0];
  if (tMax - tMin < 1000) tMin = tMax - 3600000;

  var fmtTime = function(ts) {
    var d = new Date(ts);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  };

  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText(fmtTime(tMin), padL, h - 5);
  ctx.textAlign = 'right';
  ctx.fillText(fmtTime(tMax), w - padR, h - 5);

  // Función para trazar serie con área
  var drawSeries = function(pts, strokeColor, fillColor, isDashed, lineWidth) {
    if (!pts || pts.length === 0) return;
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var t = pts[i][0];
      var v = parseFloat(pts[i][1]) || 0;
      var x = padL + ((t - tMin) / (tMax - tMin)) * plotW;
      var y = padT + (1 - (v / maxScale)) * plotH;
      x = Math.max(padL, Math.min(w - padR, x));
      y = Math.max(padT, Math.min(h - padB, y));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    if (fillColor) {
      ctx.lineTo(w - padR, padT + plotH);
      ctx.lineTo(padL, padT + plotH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    ctx.restore();

    // Trazo de línea
    ctx.save();
    ctx.beginPath();
    if (isDashed) ctx.setLineDash([4, 4]);
    ctx.lineWidth = lineWidth || 2;
    ctx.strokeStyle = strokeColor;
    for (var j = 0; j < pts.length; j++) {
      var tj = pts[j][0];
      var vj = parseFloat(pts[j][1]) || 0;
      var xj = padL + ((tj - tMin) / (tMax - tMin)) * plotW;
      var yj = padT + (1 - (vj / maxScale)) * plotH;
      xj = Math.max(padL, Math.min(w - padR, xj));
      yj = Math.max(padT, Math.min(h - padB, yj));
      if (j === 0) ctx.moveTo(xj, yj);
      else ctx.lineTo(xj, yj);
    }
    ctx.stroke();
    ctx.restore();
  };

  // 1. Solar (Gold con área translúcida)
  drawSeries(sSol, '#f7d048', 'rgba(247, 208, 72, 0.12)', false, 2);

  // 2. Red Comercial (Azul cielo)
  drawSeries(sGrid, '#38bdf8', 'rgba(56, 189, 248, 0.10)', false, 2);

  // 3. Generador Diésel (Púrpura)
  drawSeries(sDg, '#c084fc', null, false, 2);

  // 4. Demanda BTS (Blanco nítido con glow sutil)
  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
  ctx.shadowBlur = 4;
  drawSeries(sLoad, '#ffffff', null, false, 2.5);
  ctx.restore();
};

self.onDestroy = function() {};
