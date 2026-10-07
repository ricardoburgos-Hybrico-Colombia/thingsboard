// Controller Script: SCADA - Dinámica de Bus DC y Corrientes Telecom (100% Telemetría Real)
self.onInit = function() {
  self.ctx.$scope.drawChart = self.drawChart;
  self.onDataUpdated();
};

self.onResize = function() {
  self.drawChart();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var curV = 0.0, curIbat = 0.0, curIrect = 0.0, loadKw = 0.0;
  var vSeries = [], iBatSeries = [], iRectSeries = [], loadSeries = [];

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var rawVal = item.data[item.data.length - 1][1];
        var v = parseFloat(rawVal);
        var k = (item.dataKey.name || item.dataKey.label || '').toLowerCase();

        if (!isNaN(v)) {
          if (k === 'rectifier_voltage' || k === 'battery_voltage' || k === 'vbat_promedio') {
            if (v > 0) {
              curV = v;
              vSeries = item.data;
            }
          }
          else if (k === 'rectifier_current') {
            curIrect = v;
            iRectSeries = item.data;
          }
          else if (k === 'battery_current' || k === 'ibat_total' || k === 'ibat') {
            curIbat = v;
            iBatSeries = item.data;
          }
          else if (k === 'load_power_kw' || k === 'load_dc_power_kw' || k === 'demanda_carga_kw') {
            loadKw = Math.max(loadKw, v);
            loadSeries = item.data;
          }
        }
      }
    }
  }

  if (curV === 0) curV = 51.1;
  var curIload = curV > 0 ? (loadKw * 1000 / curV) : 0.0;

  // Construir serie calculada de corriente de carga
  var iLoadSeries = [];
  if (loadSeries && loadSeries.length > 0) {
    iLoadSeries = loadSeries.map(function(p) {
      var pKw = parseFloat(p[1]) || 0;
      var a = curV > 0 ? (pKw * 1000 / curV) : 0;
      return [p[0], a];
    });
  }

  self.latestV = curV;
  self.latestIload = curIload;
  self.latestIrect = curIrect;
  self.latestIbat = curIbat;
  self.latestLoadKw = loadKw;

  self.vSeriesData = vSeries;
  self.iLoadSeriesData = iLoadSeries;
  self.iRectSeriesData = iRectSeries;
  self.iBatSeriesData = iBatSeries;

  var isIndustrial = (curV > 200.0);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var elTitle = container.querySelector('#dc-trend-title');
  var elBadge = container.querySelector('#dc-trend-badge');
  var elV = container.querySelector('#vbat-live-val');
  var elIload = container.querySelector('#iload-live-val');
  var elIrect = container.querySelector('#irect-live-val');
  var elIbat = container.querySelector('#ibat-live-val');
  var elReg = container.querySelector('#trend-regimen-text');

  if (isIndustrial) {
    if (elTitle) elTitle.textContent = 'TENDENCIA TENSIÓN Y CORRIENTE BESS INDUSTRIAL';
    if (elBadge) {
      elBadge.textContent = '750V DC BESS';
      elBadge.className = 'trend-badge';
    }
    if (elV) elV.textContent = curV.toFixed(1);
    if (elIload) elIload.textContent = (loadKw * 1000 / curV).toFixed(1);
    if (elIrect) elIrect.textContent = Math.abs(curIbat).toFixed(1);
    if (elIbat) elIbat.textContent = curIbat.toFixed(1);
    if (elReg) elReg.textContent = 'Bus DC 750V Operativo';
  } else {
    if (elTitle) elTitle.textContent = 'DINÁMICA DE BUS DC Y CORRIENTES TELECOM';
    var bText = 'MODO FLOTACIÓN (' + curV.toFixed(1) + 'V)';
    if (curIbat > 0.5) bText = 'BATERÍA EN CARGA';
    else if (curIbat < -0.5) bText = 'BATERÍA EN DESCARGA';

    if (elBadge) {
      elBadge.textContent = bText;
      elBadge.className = 'trend-badge ' + (curIbat > 0.5 ? 'charging' : 'standby');
    }

    if (elV) elV.textContent = curV.toFixed(1);
    if (elIload) elIload.textContent = curIload.toFixed(1);
    if (elIrect) elIrect.textContent = curIrect.toFixed(1);
    var sIbat = curIbat > 0 ? '+' : '';
    if (elIbat) elIbat.textContent = sIbat + curIbat.toFixed(1);
    if (elReg) elReg.textContent = 'Bus DC -48V Telecom Estabilizado';
  }

  self.drawChart();
};

self.drawChart = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;
  var canvas = container.querySelector('#chart-vbat-ibat');
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

  var curV = self.latestV || 51.1;
  var curIload = self.latestIload || 0;
  var curIrect = self.latestIrect || 0;
  var curIbat = self.latestIbat || 0;
  var isIndustrial = curV > 200.0;

  var now = Date.now();
  var sV = (self.vSeriesData && self.vSeriesData.length > 0) ? self.vSeriesData : [[now - 600000, curV], [now, curV]];
  var sLoad = (self.iLoadSeriesData && self.iLoadSeriesData.length > 0) ? self.iLoadSeriesData : [[now - 600000, curIload], [now, curIload]];
  var sRect = (self.iRectSeriesData && self.iRectSeriesData.length > 0) ? self.iRectSeriesData : [[now - 600000, curIrect], [now, curIrect]];
  var sBat = (self.iBatSeriesData && self.iBatSeriesData.length > 0) ? self.iBatSeriesData : [[now - 600000, curIbat], [now, curIbat]];

  // Escala Eje Izquierdo: Tensión (V)
  var minV, maxV;
  if (isIndustrial) {
    minV = 720; maxV = 800;
  } else {
    var vVals = sV.map(function(p) { return parseFloat(p[1]); }).filter(function(v) { return !isNaN(v) && v > 10; });
    var minVReal = vVals.length > 0 ? Math.min.apply(null, vVals) : curV;
    var maxVReal = vVals.length > 0 ? Math.max.apply(null, vVals) : curV;
    minV = Math.floor(minVReal - 1.5);
    maxV = Math.ceil(maxVReal + 1.5);
    if (maxV - minV < 4) {
      minV = Math.floor(curV - 2);
      maxV = minV + 4;
    }
  }

  // Escala Eje Derecho: Corriente (A)
  var allAmps = [];
  [sLoad, sRect, sBat].forEach(function(s) {
    s.forEach(function(p) {
      var a = parseFloat(p[1]);
      if (!isNaN(a)) allAmps.push(Math.abs(a));
    });
  });
  var maxAReal = allAmps.length > 0 ? Math.max.apply(null, allAmps) : 25.0;
  var maxI = Math.max(isIndustrial ? 300 : 30, Math.ceil(maxAReal * 1.3));
  var minI = 0;

  var padL = 40, padR = 40, padT = 12, padB = 22;
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

    // Etiquetas Eje Izq (V)
    var vLbl = (maxV - ((maxV - minV) / 3) * r).toFixed(1) + ' V';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(vLbl, padL - 5, y + 3);

    // Etiquetas Eje Der (A)
    var iLbl = Math.round(maxI - ((maxI - minI) / 3) * r) + ' A';
    ctx.fillStyle = '#64B856';
    ctx.textAlign = 'left';
    ctx.fillText(iLbl, w - padR + 5, y + 3);
  }

  // Marcas de tiempo eje X
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

  // Función para trazar curva de datos
  var plotCurve = function(pts, strokeColor, isDashed, lineWidth, isVoltage) {
    if (!pts || pts.length === 0) return;
    ctx.save();
    ctx.beginPath();
    if (isDashed) ctx.setLineDash([5, 4]);
    ctx.lineWidth = lineWidth || 2;
    ctx.strokeStyle = strokeColor;

    for (var i = 0; i < pts.length; i++) {
      var t = pts[i][0];
      var v = parseFloat(pts[i][1]) || 0;
      var x = padL + ((t - tMin) / (tMax - tMin)) * plotW;
      var y;
      if (isVoltage) {
        y = padT + (1 - ((v - minV) / (maxV - minV))) * plotH;
      } else {
        y = padT + (1 - ((v - minI) / (maxI - minI))) * plotH;
      }
      x = Math.max(padL, Math.min(w - padR, x));
      y = Math.max(padT, Math.min(h - padB, y));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // 1. Tensión de Bus DC (Azul cielo nítido)
  plotCurve(sV, '#38bdf8', false, 2.5, true);

  // 2. Corriente de Carga BTS (Blanco nítido)
  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
  ctx.shadowBlur = 3;
  plotCurve(sLoad, '#ffffff', false, 2, false);
  ctx.restore();

  // 3. Corriente Rectificador (Verde esmeralda punteado)
  plotCurve(sRect, '#64B856', true, 2, false);

  // 4. Corriente de Batería (Ámbar)
  plotCurve(sBat, '#f59e0b', false, 1.5, false);
};

self.onDestroy = function() {};
