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
  var canvas = container.querySelector('#chart-vbat-ibat');
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

  var vSeries = self.vSeriesData || [];
  var iSeries = self.iSeriesData || [];

  // Generador de fallback si aún no hay telemetría histórica
  if (vSeries.length < 2) {
    vSeries = []; iSeries = [];
    var now = Date.now();
    for (var k = 20; k >= 0; k--) {
      var t = now - k * 60000;
      var v = 750 + Math.sin(k * 0.3) * 15;
      var i = 420 + Math.cos(k * 0.3) * 50;
      vSeries.push([t, v]);
      iSeries.push([t, i]);
    }
  }

  var padL = 36, padR = 36, padT = 10, padB = 20;
  var plotW = w - padL - padR;
  var plotH = h - padT - padB;
  if (plotW <= 10 || plotH <= 10) return;

  // Rangos de escala
  var minV = 720, maxV = 800;
  var minI = 0, maxI = 600;

  // Rejilla de fondo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (var r = 0; r <= 3; r++) {
    var y = padT + (plotH / 3) * r;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  // Etiquetas de eje Y
  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText(maxV + 'V', padL - 6, padT + 8);
  ctx.fillText(minV + 'V', padL - 6, h - padB);

  ctx.fillStyle = '#64B856';
  ctx.textAlign = 'left';
  ctx.fillText(maxI + 'A', w - padR + 6, padT + 8);
  ctx.fillText(minI + 'A', w - padR + 6, h - padB);

  // Función de mapeo
  var n = vSeries.length;
  var getX = function(idx) { return padL + (idx / (n - 1)) * plotW; };
  var getY = function(val, min, max) {
    var ratio = (val - min) / (max - min);
    ratio = Math.max(0, Math.min(1, ratio));
    return padT + plotH * (1 - ratio);
  };

  // Trazo de Tensión Vbat (Azul)
  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  for (var a = 0; a < n; a++) {
    var x = getX(a);
    var y = getY(vSeries[a][1], minV, maxV);
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Trazo y Gradiente de Corriente Ibat (Verde)
  var grad = ctx.createLinearGradient(0, padT, 0, h - padB);
  grad.addColorStop(0, 'rgba(100, 184, 86, 0.30)');
  grad.addColorStop(1, 'rgba(100, 184, 86, 0.0)');

  ctx.beginPath();
  for (var b = 0; b < n; b++) {
    var bx = getX(b);
    var by = getY(iSeries[b][1], minI, maxI);
    if (b === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
  }
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.lineTo(padL, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#64B856';
  ctx.lineWidth = 2;
  for (var c = 0; c < n; c++) {
    var cx = getX(c);
    var cy = getY(iSeries[c][1], minI, maxI);
    if (c === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var vbat = 762.5, ibat = 466.6;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
      if (item.data && item.data.length > 0) {
        var lastPt = parseFloat(item.data[item.data.length - 1][1]);
        if (!isNaN(lastPt)) {
          if (k.indexOf('vbat') !== -1 || k.indexOf('volt') !== -1 || i === 0) {
            vbat = lastPt;
            self.vSeriesData = item.data;
          } else if (k.indexOf('ibat') !== -1 || k.indexOf('corr') !== -1 || i === 1) {
            ibat = lastPt;
            self.iSeriesData = item.data;
          }
        }
      }
    }
  }

  var pwrKw = Math.abs((vbat * ibat) / 1000);
  // En ATESS PCS: ibat > 5.0 A significa DESCARGA entregando potencia a la microrred
  var isDischarge = ibat > 5.0;
  var isCharge = ibat < -5.0;
  var sign = ibat >= 0 ? '+' : '';

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elV = container.querySelector('#vbat-live-val');
    if (elV) elV.textContent = vbat.toFixed(1);

    var elI = container.querySelector('#ibat-live-val');
    if (elI) elI.textContent = sign + ibat.toFixed(1);

    var elP = container.querySelector('#pwr-live-val');
    if (elP) elP.textContent = pwrKw.toFixed(1);

    var elB = container.querySelector('#dc-trend-badge');
    if (elB) {
      var bText = isDischarge ? ('DESCARGA DC (' + ibat.toFixed(1) + ' A)') : (isCharge ? ('CARGA DC (' + Math.abs(ibat).toFixed(1) + ' A)') : 'STANDBY (0.0 A)');
      elB.textContent = bText;
      elB.className = 'trend-badge ' + (isDischarge ? 'discharging' : (isCharge ? 'charging' : 'standby'));
    }
  }
  self.drawChart();
};

self.onDestroy = function() {};