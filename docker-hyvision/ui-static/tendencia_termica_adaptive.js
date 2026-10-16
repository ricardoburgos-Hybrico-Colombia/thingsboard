// Controller Script: SCADA - Tendencia Térmica 100% Telemetría Real (Zero Simulaciones)
self.onInit = function() {
  self.ctx.$scope.drawChart = self.drawChart;
  self.onDataUpdated();
};

self.onResize = function() {
  self.drawChart();
};

self.drawChart = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;
  var canvas = container.querySelector('#chart-delta-temp');
  if (!canvas) return;

  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  var w = rect.width || 400;
  var h = rect.height || 120;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  var dtSeries = self.dtSeriesData || [];
  var curT = self.latestT || 0;
  var isIndustrial = self.isIndustrialMode !== false;

  var maxVal = isIndustrial ? 15.0 : 45.0;
  var minVal = isIndustrial ? 0.0 : 20.0;
  var threshold = isIndustrial ? 12.0 : 35.0;

  var padL = 36, padR = 20, padT = 10, padB = 20;
  var plotW = w - padL - padR;
  var plotH = h - padT - padB;
  if (plotW <= 10 || plotH <= 10) return;

  // Rejilla
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (var r = 0; r <= 3; r++) {
    var y = padT + (plotH / 3) * r;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  // Línea de umbral crítico
  var yThreshold = padT + plotH * (1 - (threshold - minVal) / Math.max(1, maxVal - minVal));
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.beginPath();
  ctx.moveTo(padL, yThreshold);
  ctx.lineTo(w - padR, yThreshold);
  ctx.stroke();
  ctx.restore();

  // Texto umbral
  ctx.font = '9px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
  ctx.textAlign = 'right';
  ctx.fillText('LÍMITE ' + threshold + '°C', w - padR, yThreshold - 4);

  // Eje Y
  ctx.fillStyle = '#64B856';
  ctx.textAlign = 'right';
  ctx.fillText(maxVal + '°C', padL - 6, padT + 8);
  ctx.fillText(minVal + '°C', padL - 6, h - padB);

  // Si no hay puntos históricos pero hay valor actual, graficar línea horizontal real
  var now = Date.now();
  if (dtSeries.length < 2 && curT > 0) {
    dtSeries = [[now - 600000, curT], [now, curT]];
  }

  var n = dtSeries.length;
  if (n < 2) {
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Esperando telemetría térmica en tiempo real...', w / 2, h / 2);
    return;
  }

  // Mapeo
  var getX = function(idx) { return padL + (idx / Math.max(1, n - 1)) * plotW; };
  var getY = function(val) {
    var ratio = (val - minVal) / Math.max(1, maxVal - minVal);
    ratio = Math.max(0, Math.min(1, ratio));
    return padT + plotH * (1 - ratio);
  };

  // Trazo de Curva Térmica Real
  var grad = ctx.createLinearGradient(0, padT, 0, h - padB);
  grad.addColorStop(0, 'rgba(100, 184, 86, 0.25)');
  grad.addColorStop(1, 'rgba(100, 184, 86, 0.0)');

  ctx.beginPath();
  for (var a = 0; a < n; a++) {
    var x = getX(a);
    var y = getY(dtSeries[a][1]);
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.lineTo(padL, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#64B856';
  ctx.lineWidth = 2;
  for (var b = 0; b < n; b++) {
    var bx = getX(b);
    var by = getY(dtSeries[b][1]);
    if (b === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
  }
  ctx.stroke();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var dt = 0.0, tMax = 0.0, tMin = 0.0;
  var batT = 0.0, ambT = 0.0;
  var foundIndustrial = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
      if (item.data && item.data.length > 0) {
        var lastPt = parseFloat(item.data[item.data.length - 1][1]);
        if (!isNaN(lastPt)) {
          if (k.indexOf('delta_temp_bateria') !== -1 || k.indexOf('delta_v') !== -1) {
            dt = lastPt; foundIndustrial = true;
            self.dtSeriesData = item.data;
          } else if (k.indexOf('temp_bateria_max') !== -1) {
            tMax = lastPt;
          } else if (k.indexOf('temp_bateria_min') !== -1) {
            tMin = lastPt;
          } else if (k.indexOf('battery_temperature') !== -1) {
            batT = lastPt;
            if (!foundIndustrial) self.dtSeriesData = item.data;
          } else if (k.indexOf('ambient_temperature') !== -1) {
            ambT = lastPt;
          }
        }
      }
    }
  }

  var isIndustrial = foundIndustrial || (tMax > 0 && tMin > 0 && dt > 0);
  self.isIndustrialMode = isIndustrial;
  self.latestT = isIndustrial ? dt : (batT > 0 ? batT : ambT);

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var card = container.querySelector('#therm-card');
  var elTitle = container.querySelector('#therm-title-text');
  var elDt = container.querySelector('#dt-live-val');
  var elDtUnit = container.querySelector('#dt-unit-text');
  var elMax = container.querySelector('#tmax-live-val');
  var elMin = container.querySelector('#tmin-live-val');
  var elB = container.querySelector('#therm-trend-badge');
  var elD = container.querySelector('#therm-diag-text');

  if (isIndustrial) {
    if (elTitle) elTitle.textContent = 'DISPERSIÓN TÉRMICA BESS (ΔT)';
    // En contenedores BESS industriales con aire acondicionado (HVAC),
    // el aire frío inyectado (~17°C) crea un gradiente natural de 5-10°C frente
    // a celdas centrales (28°C) durante ciclos de carga pesada (>500A).
    // Se considera alarma real si la celda más caliente supera 35°C O si ΔT > 12°C.
    var isAlert = (dt > 12.0) || (tMax >= 35.0);
    if (card) card.className = 'trend-card-container therm ' + (isAlert ? 'alert' : 'ok');
    if (elDt) elDt.textContent = dt.toFixed(1);
    if (elDtUnit) elDtUnit.textContent = '°C ΔT MÁX';
    if (elMax) elMax.textContent = tMax > 0 ? tMax.toFixed(1) : '--';
    if (elMin) elMin.textContent = tMin > 0 ? tMin.toFixed(1) : '--';

    if (elB) {
      elB.textContent = isAlert ? 'ΔT > 12°C DESBALANCE' : 'ΔT CONTROLADO (HVAC)';
      elB.className = 'trend-badge ' + (isAlert ? 'alert' : 'ok');
    }
    if (elD) {
      var strMax = tMax > 0 ? (' (T.Máx ' + tMax.toFixed(0) + '°C)') : '';
      elD.innerHTML = 'Estado: <strong style="color:' + (isAlert ? '#ef4444' : '#64B856') + ';">' + 
                      (isAlert ? 'Desbalance Térmico Crítico' : ('Climatizado / Seguro' + strMax)) + '</strong>';
    }
    var elLimFoot = container.querySelector('#therm-limit-foot');
    if (elLimFoot) {
      elLimFoot.innerHTML = 'Límite de Control: <strong style="color:#f59e0b;">-- 12.0°C / 35.0°C</strong>';
    }
  } else {
    // Modo Telecom: Histórico Térmico Banco & Ambiente
    if (elTitle) elTitle.textContent = 'HISTÓRICO TÉRMICO BATERÍA';
    var curT = batT > 0 ? batT : (ambT > 0 ? ambT : 0.0);
    var isHot = curT >= 35.0;

    if (card) card.className = 'trend-card-container therm ' + (isHot ? 'alert' : 'ok');
    if (elDt) elDt.textContent = curT > 0 ? curT.toFixed(1) : '--';
    if (elDtUnit) elDtUnit.textContent = '°C TEMP BANCO';
    if (elMax) elMax.textContent = ambT > 0 ? ambT.toFixed(1) : '--';
    if (elMin) elMin.textContent = '35.0'; // límite seguro

    if (elB) {
      elB.textContent = isHot ? 'T > 35°C ELEVADO' : 'T < 35°C ÓPTIMO';
      elB.className = 'trend-badge ' + (isHot ? 'alert' : 'ok');
    }
    if (elD) {
      elD.innerHTML = 'Ambiente: <strong style="color:#64B856;">' + (ambT > 0 ? ambT.toFixed(1) + ' °C' : 'Normal') + '</strong> | Límite Seguro: <strong>35.0 °C</strong>';
    }
  }
  self.drawChart();
};

self.onDestroy = function() {};
