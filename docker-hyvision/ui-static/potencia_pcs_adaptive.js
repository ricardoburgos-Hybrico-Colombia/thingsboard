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
          if (k.indexOf('pac_pcs1') !== -1 || k.indexOf('carga_pcs1') !== -1) { 
            p1 = v; hasPcsData = true; 
            self.pcs1Series = item.data;
          }
          else if (k.indexOf('pac_pcs2') !== -1 || k.indexOf('carga_pcs2') !== -1) { 
            p2 = v; hasPcsData = true; 
            self.pcs2Series = item.data;
          }
          else if (k.indexOf('pac_pcs3') !== -1 || k.indexOf('carga_pcs3') !== -1) { 
            p3 = v; hasPcsData = true; 
            self.pcs3Series = item.data;
          }
          
          if (k === 'solar_power_kw' || k === 'generacion_solar_kw' || k === 'solar_charger_power_kw') {
            solarKw = Math.max(solarKw, Math.max(0, v));
            self.solarSeries = (item.data || []).map(function(pt) {
              return [pt[0], Math.max(0, parseFloat(pt[1]) || 0)];
            });
          }
          else if (k === 'grid_power_kw') {
            gridKw = Math.max(gridKw, Math.max(0, v));
            self.gridSeries = (item.data || []).map(function(pt) {
              return [pt[0], Math.max(0, parseFloat(pt[1]) || 0)];
            });
          }
          else if (k === 'generator_power_kw' || k === 'dg_potencia_activa_kw') {
            dgKw = Math.max(dgKw, Math.max(0, v));
            self.dgSeries = (item.data || []).map(function(pt) {
              return [pt[0], Math.max(0, parseFloat(pt[1]) || 0)];
            });
          }
          else if (k === 'battery_power_kw' || k === 'potencia_bess_kw') {
            bessKw = v;
          }
          else if (k === 'load_power_kw' || k === 'demanda_carga_kw' || k === 'load_dc_power_kw') {
            loadKw = Math.max(loadKw, Math.max(0, v));
            self.loadSeries = (item.data || []).map(function(pt) {
              return [pt[0], Math.max(0, parseFloat(pt[1]) || 0)];
            });
          }
          else if (k === 'solar_fraction_pct') {
            solarFraction = Math.max(0, Math.min(100, v));
          }
          else if (k === 'grid_energy_kwh' || k.indexOf('grid_energy') !== -1) {
            self.latestGridKwh = Math.max(0, v);
          }
          else if (k === 'generator_runtime_hours' || k.indexOf('runtime_hours') !== -1 || k.indexOf('horometro') !== -1) {
            self.latestDgHours = Math.max(0, v);
          }
          else if (k === 'rectifier_voltage' || k === 'battery_voltage') {
            if (v > 0) vdc = v;
          }
        }
      }
    }
  }

  self.latestSolar = Math.max(0, solarKw);
  self.latestGrid = Math.max(0, gridKw);
  self.latestDg = Math.max(0, dgKw);
  self.latestLoad = Math.max(0, loadKw);
  self.latestVdc = vdc;
  self.latestP1 = p1;
  self.latestP2 = p2;
  self.latestP3 = p3;

  var isIndustrial = (vdc > 200.0) || hasPcsData;
  self.isIndustrialMode = isIndustrial;
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

  var setRow = function(idLbl, idVal, idBar, label, val, maxVal, colorGrad) {
    var elL = container.querySelector(idLbl);
    var elV = container.querySelector(idVal);
    var elB = container.querySelector(idBar);
    if (elL) elL.textContent = label;
    if (elV) elV.textContent = val.toFixed(2) + ' kW';
    if (elB) {
      var absVal = Math.abs(val);
      var pct = maxVal > 0 ? Math.min(100, Math.max(0, (absVal / maxVal) * 100)) : 0;
      elB.style.width = (absVal > 0.1 ? Math.max(4, pct) : 0) + '%';
      if (colorGrad) elB.style.background = colorGrad;
    }
  };

  if (isIndustrial) {
    if (elTitle) elTitle.textContent = 'POTENCIA ACTIVA POR INVERSOR (BESS UTILITY)';
    if (elBadge) {
      elBadge.textContent = '3/3 EN LÍNEA';
      elBadge.className = 'pcs-badge';
    }

    var elLblSol = container.querySelector('#kpi-lbl-solar');
    var elLblGrid = container.querySelector('#kpi-lbl-grid');
    var elLblDg = container.querySelector('#kpi-lbl-dg');
    var elLblLoad = container.querySelector('#kpi-lbl-load');

    if (elLblSol) elLblSol.textContent = '⚡ PCS-1 (TQG136)';
    if (elKpiSol) { elKpiSol.textContent = p1.toFixed(1) + ' kW'; elKpiSol.style.color = '#38bdf8'; }

    if (elLblGrid) elLblGrid.textContent = '⚡ PCS-2 (TQG135)';
    if (elKpiGrid) { elKpiGrid.textContent = p2.toFixed(1) + ' kW'; elKpiGrid.style.color = '#64B856'; }

    if (elLblDg) elLblDg.textContent = '⚡ PCS-3 (TQG134)';
    if (elKpiDg) { elKpiDg.textContent = p3.toFixed(1) + ' kW'; elKpiDg.style.color = '#f59e0b'; }

    var pTotal = p1 + p2 + p3;
    if (elLblLoad) elLblLoad.textContent = '⚡ TOTAL INVERSORES';
    if (elKpiLoad) { 
      elKpiLoad.textContent = pTotal.toFixed(1) + ' kW'; 
      elKpiLoad.style.color = '#f8fafc'; 
    }

    var maxPcs = 250.0;
    setRow('#pcs1-label', '#pac-pcs1-val', '#pac-pcs1-bar', 'PCS-1 (TQG136)', p1, maxPcs, 'linear-gradient(90deg, #38bdf8, #64B856)');
    setRow('#pcs2-label', '#pac-pcs2-val', '#pac-pcs2-bar', 'PCS-2 (TQG135)', p2, maxPcs, 'linear-gradient(90deg, #38bdf8, #64B856)');
    setRow('#pcs3-label', '#pac-pcs3-val', '#pac-pcs3-bar', 'PCS-3 (TQG134)', p3, maxPcs, 'linear-gradient(90deg, #38bdf8, #64B856)');

    var diff = Math.max(Math.abs(p1 - p2), Math.abs(p2 - p3), Math.abs(p1 - p3));
    var isEquil = diff < 15.0;
    if (elFootL) elFootL.innerHTML = 'Balance de Carga: <strong style="color:' + (isEquil ? '#64B856' : '#f59e0b') + ';">' + (isEquil ? 'Equilibrado' : 'Diferencia ' + diff.toFixed(1) + ' kW') + '</strong>';
    if (elFootR) elFootR.innerHTML = 'Capacidad: <strong>750 kVA</strong> (3 × 250 kVA)';
  } else {
    // KPI Bar Telecom
    if (elKpiSol) elKpiSol.textContent = solarKw.toFixed(2) + ' kW';
    if (elKpiGrid) elKpiGrid.textContent = gridKw.toFixed(2) + ' kW';
    if (elKpiDg) elKpiDg.textContent = dgKw.toFixed(2) + ' kW';
    if (elKpiLoad) elKpiLoad.textContent = loadKw.toFixed(2) + ' kW';
    var hasGridInstalled = gridKw > 0.05 || (self.latestGridKwh > 0.5);
    var hasDgInstalled = dgKw > 0.05 || (self.latestDgHours > 10.0);
    var isOffGrid = !hasGridInstalled && !hasDgInstalled;

    var autoPct = solarFraction !== null ? solarFraction.toFixed(1) : (loadKw > 0 ? Math.min(100, Math.round((solarKw / loadKw) * 100)) : 100);

    if (isOffGrid) {
      if (elTitle) elTitle.textContent = 'DESGLOSE ENERGÉTICO (100% SOLAR AUTÓNOMO)';
      if (elBadge) {
        elBadge.textContent = '100% SOLAR AUTÓNOMO';
        elBadge.className = 'pcs-badge solar';
      }
      if (elKpiGrid) elKpiGrid.textContent = 'OFF-GRID';
      if (elKpiDg) elKpiDg.textContent = 'OFF-GRID';

      var maxSource = Math.max(solarKw, Math.abs(bessKw), loadKw, 1.5);
      setRow('#pcs1-label', '#pac-pcs1-val', '#pac-pcs1-bar', 'Solar Fotovoltaico MPPT', solarKw, maxSource, 'linear-gradient(90deg, #f7d048, #64B856)');
      
      var bLabel = bessKw < -0.1 ? 'Descarga Baterías (Suministro)' : (bessKw > 0.1 ? 'Carga Baterías (Acumulación)' : 'Baterías 48V (Flotación/Standby)');
      var bColor = bessKw < -0.1 ? 'linear-gradient(90deg, #38bdf8, #0284c7)' : 'linear-gradient(90deg, #64B856, #059669)';
      setRow('#pcs2-label', '#pac-pcs2-val', '#pac-pcs2-bar', bLabel, Math.abs(bessKw), maxSource, bColor);
      setRow('#pcs3-label', '#pac-pcs3-val', '#pac-pcs3-bar', 'Demanda Carga BTS Telecom', loadKw, maxSource, 'linear-gradient(90deg, #e2e8f0, #94a3b8)');

      if (elFootL) elFootL.innerHTML = 'Operación: <strong style="color:#64B856;">100% Autosuficiente</strong> | Isla Solar';
      if (elFootR) elFootR.innerHTML = 'Consumo BTS: <strong style="color:#f8fafc;">' + loadKw.toFixed(2) + ' kW</strong>';
    } else if (!hasDgInstalled && hasGridInstalled) {
      if (elTitle) elTitle.textContent = 'DESGLOSE DE POTENCIA (RED + SOLAR BESS)';
      if (elBadge) {
        elBadge.textContent = autoPct + '% AUTONOMÍA SOLAR';
        elBadge.className = 'pcs-badge' + (solarKw > 0 ? ' solar' : '');
      }
      if (elKpiDg) elKpiDg.textContent = 'NO INST.';

      var maxSource = Math.max(solarKw, gridKw, Math.abs(bessKw), loadKw, 1.5);
      setRow('#pcs1-label', '#pac-pcs1-val', '#pac-pcs1-bar', 'Solar Fotovoltaico MPPT', solarKw, maxSource, 'linear-gradient(90deg, #f7d048, #64B856)');
      setRow('#pcs2-label', '#pac-pcs2-val', '#pac-pcs2-bar', 'Red Comercial (Grid)', gridKw, maxSource, 'linear-gradient(90deg, #38bdf8, #0284c7)');
      var bLabel = bessKw < -0.1 ? 'Descarga Batería' : (bessKw > 0.1 ? 'Carga Batería' : 'Batería 48V (Standby)');
      setRow('#pcs3-label', '#pac-pcs3-val', '#pac-pcs3-bar', bLabel, Math.abs(bessKw), maxSource, 'linear-gradient(90deg, #64B856, #059669)');

      if (elFootL) elFootL.innerHTML = 'Autonomía Solar: <strong style="color:' + (autoPct >= 70 ? '#64B856' : '#f7d048') + ';">' + autoPct + '%</strong> | Cobertura Red';
      if (elFootR) elFootR.innerHTML = 'Demanda: <strong style="color:#f8fafc;">' + loadKw.toFixed(2) + ' kW</strong>';
    } else {
      if (elTitle) elTitle.textContent = 'DESGLOSE DE POTENCIA POR FUENTE VS DEMANDA';
      if (elBadge) {
        elBadge.textContent = autoPct + '% AUTONOMÍA SOLAR';
        elBadge.className = 'pcs-badge' + (solarKw > 0 ? ' solar' : '');
      }

      var maxSource = Math.max(solarKw, gridKw, dgKw, loadKw, 1.5);
      setRow('#pcs1-label', '#pac-pcs1-val', '#pac-pcs1-bar', 'Solar Fotovoltaico', solarKw, maxSource, 'linear-gradient(90deg, #f7d048, #64B856)');
      setRow('#pcs2-label', '#pac-pcs2-val', '#pac-pcs2-bar', 'Red Comercial (Grid)', gridKw, maxSource, 'linear-gradient(90deg, #38bdf8, #0284c7)');
      setRow('#pcs3-label', '#pac-pcs3-val', '#pac-pcs3-bar', 'Generador Diésel (MG)', dgKw, maxSource, 'linear-gradient(90deg, #c084fc, #a855f7)');

      if (elFootL) {
        elFootL.innerHTML = 'Autonomía Solar: <strong style="color:' + (autoPct >= 70 ? '#64B856' : '#f7d048') + ';">' + autoPct + '%</strong> | Cobertura Híbrida';
      }
      if (elFootR) {
        elFootR.innerHTML = 'Demanda: <strong style="color:#f8fafc;">' + loadKw.toFixed(2) + ' kW</strong>';
      }
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

  if (self.isIndustrialMode) {
    var p1 = self.latestP1 || 0;
    var p2 = self.latestP2 || 0;
    var p3 = self.latestP3 || 0;
    var s1 = (self.pcs1Series && self.pcs1Series.length > 0) ? self.pcs1Series : [[now - 600000, p1], [now, p1]];
    var s2 = (self.pcs2Series && self.pcs2Series.length > 0) ? self.pcs2Series : [[now - 600000, p2], [now, p2]];
    var s3 = (self.pcs3Series && self.pcs3Series.length > 0) ? self.pcs3Series : [[now - 600000, p3], [now, p3]];

    var allVals = [];
    [s1, s2, s3].forEach(function(s) {
      s.forEach(function(p) {
        var val = parseFloat(p[1]);
        if (!isNaN(val)) allVals.push(val);
      });
    });

    var minVal = allVals.length > 0 ? Math.min.apply(null, allVals) : -200;
    var maxVal = allVals.length > 0 ? Math.max.apply(null, allVals) : 0;

    var minScale = Math.floor((minVal - 10) / 25) * 25;
    var maxScale = Math.ceil((maxVal + 10) / 25) * 25;
    if (minScale > -50 && maxScale <= 0) minScale = -200;
    if (maxScale - minScale < 50) maxScale = minScale + 50;

    var padL = 46, padR = 20, padT = 16, padB = 22;
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

      var pVal = maxScale - ((maxScale - minScale) / 3) * r;
      var pLabel = pVal.toFixed(0) + ' kW';
      ctx.font = '9px -apple-system, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(pLabel, padL - 5, y + 3);
    }

    // Marcas de tiempo en eje X
    var tMin = s1[0][0];
    var tMax = s1[s1.length - 1][0];
    if (tMax - tMin < 1000) tMin = tMax - 3600000;

    var fmtTime = function(ts) {
      var d = new Date(ts);
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    };

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(fmtTime(tMin), padL, h - 5);
    ctx.textAlign = 'right';
    ctx.fillText(fmtTime(tMax), w - padR, h - 5);

    var drawPcsCurve = function(pts, strokeColor, fillColor, lineWidth) {
      if (!pts || pts.length === 0) return;
      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var t = pts[i][0];
        var v = parseFloat(pts[i][1]) || 0;
        var x = padL + ((t - tMin) / Math.max(1, (tMax - tMin))) * plotW;
        var y = padT + (1 - ((v - minScale) / (maxScale - minScale))) * plotH;
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

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = lineWidth || 2;
      ctx.strokeStyle = strokeColor;
      for (var j = 0; j < pts.length; j++) {
        var tj = pts[j][0];
        var vj = parseFloat(pts[j][1]) || 0;
        var xj = padL + ((tj - tMin) / Math.max(1, (tMax - tMin))) * plotW;
        var yj = padT + (1 - ((vj - minScale) / (maxScale - minScale))) * plotH;
        xj = Math.max(padL, Math.min(w - padR, xj));
        yj = Math.max(padT, Math.min(h - padB, yj));
        if (j === 0) ctx.moveTo(xj, yj);
        else ctx.lineTo(xj, yj);
      }
      ctx.stroke();
      ctx.restore();
    };

    // 1. PCS-1 (Celeste)
    drawPcsCurve(s1, '#38bdf8', 'rgba(56, 189, 248, 0.08)', 2);
    // 2. PCS-2 (Verde esmeralda)
    drawPcsCurve(s2, '#64B856', 'rgba(100, 184, 86, 0.08)', 2);
    // 3. PCS-3 (Ámbar)
    drawPcsCurve(s3, '#f59e0b', 'rgba(245, 158, 11, 0.08)', 2);

    // Leyenda en la esquina superior derecha
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText('● PCS-1', w - padR - 120, padT - 4);
    ctx.fillStyle = '#64B856';
    ctx.fillText('● PCS-2', w - padR - 65, padT - 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('● PCS-3', w - padR - 10, padT - 4);

    return;
  }

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
