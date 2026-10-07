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
  if (dtSeries.length < 2) {
    dtSeries = [];
    var now = Date.now();
    for (var k = 20; k >= 0; k--) {
      var t = now - k * 60000;
      var val = 2.0 + (20 - k) * 0.4 + Math.sin(k) * 0.5;
      dtSeries.push([t, Math.max(0.5, val)]);
    }
  }

  var padL = 36, padR = 20, padT = 10, padB = 20;
  var plotW = w - padL - padR;
  var plotH = h - padT - padB;
  if (plotW <= 10 || plotH <= 10) return;

  var maxVal = 12.0;
  var minVal = 0.0;

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

  // Línea de umbral crítico a 3.0 °C
  var yThreshold = padT + plotH * (1 - (3.0 - minVal) / (maxVal - minVal));
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, yThreshold);
  ctx.lineTo(w - padR, yThreshold);
  ctx.stroke();
  ctx.restore();

  // Etiquetas eje Y
  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('12°C', padL - 6, padT + 8);
  ctx.fillText('0°C', padL - 6, h - padB);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('3°C', padL - 6, yThreshold + 3);

  var n = dtSeries.length;
  var getX = function(idx) { return padL + (idx / (n - 1)) * plotW; };
  var getY = function(val) {
    var ratio = (val - minVal) / (maxVal - minVal);
    ratio = Math.max(0, Math.min(1, ratio));
    return padT + plotH * (1 - ratio);
  };

  // Gradiente dinámico
  var grad = ctx.createLinearGradient(0, padT, 0, h - padB);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
  grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
  grad.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

  ctx.beginPath();
  for (var b = 0; b < n; b++) {
    var bx = getX(b);
    var by = getY(dtSeries[b][1]);
    if (b === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
  }
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.lineTo(padL, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Línea de ΔT
  ctx.beginPath();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2.5;
  for (var c = 0; c < n; c++) {
    var cx = getX(c);
    var cy = getY(dtSeries[c][1]);
    if (c === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var dt = 10.0, tMax = 25.0, tMin = 15.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
      if (item.data && item.data.length > 0) {
        var lastPt = parseFloat(item.data[item.data.length - 1][1]);
        if (!isNaN(lastPt)) {
          if (k.indexOf('delta') !== -1) {
            dt = lastPt;
            self.dtSeriesData = item.data;
          } else if (k.indexOf('max') !== -1) {
            tMax = lastPt;
          } else if (k.indexOf('min') !== -1) {
            tMin = lastPt;
          }
        }
      }
    }
  }

  var isAlert = dt > 3.0;
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#therm-card');
    if (card) card.className = 'trend-card-container therm ' + (isAlert ? 'alert' : 'ok');

    var elDt = container.querySelector('#dt-live-val');
    if (elDt) elDt.textContent = dt.toFixed(1);

    var elMax = container.querySelector('#tmax-live-val');
    if (elMax) elMax.textContent = tMax.toFixed(1);

    var elMin = container.querySelector('#tmin-live-val');
    if (elMin) elMin.textContent = tMin.toFixed(1);

    var elB = container.querySelector('#therm-trend-badge');
    if (elB) {
      elB.textContent = isAlert ? 'ΔT > 3°C DISPERSIÓN' : 'ΔT < 3°C ÓPTIMO';
      elB.className = 'trend-badge ' + (isAlert ? 'alert' : 'ok');
    }

    var elD = container.querySelector('#therm-diag-text');
    if (elD) {
      elD.innerHTML = 'Estado: <strong style="color:' + (isAlert ? '#ef4444' : '#64B856') + ';">' + (isAlert ? 'Desbalance Térmico Activo' : 'Gradiente Estable') + '</strong>';
    }
  }
  self.drawChart();
};

self.onDestroy = function() {};