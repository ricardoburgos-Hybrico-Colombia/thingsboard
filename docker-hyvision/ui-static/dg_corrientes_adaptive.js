// Controller Script: SCADA - Corrientes de Generador por Fase 100% Real (Zero Simulaciones)
self.onInit = function() {
  self.ctx.$scope.drawChart = self.drawChart;
  self.onDataUpdated();
};
self.onResize = function() { self.drawChart(); };

self.drawChart = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;
  var canvas = container.querySelector('#chart-dg-currents');
  if (!canvas) return;

  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  var w = rect.width || 400;
  var h = rect.height || 100;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  var uData = self.uSeries || [];
  var vData = self.vSeries || [];
  var wData = self.wSeries || [];

  // Trazo honesto si faltan puntos temporales: usar valor instantáneo real (plano, sin ondas falsas)
  if (uData.length < 2) {
    uData = []; vData = []; wData = [];
    var now = Date.now();
    var curU = self.lastIu || 0.0;
    var curV = self.lastIv || 0.0;
    var curW = self.lastIw || 0.0;
    for (var k = 20; k >= 0; k--) {
      var t = now - k * 60000;
      uData.push([t, curU]);
      vData.push([t, curV]);
      wData.push([t, curW]);
    }
  }

  var padL = 32, padR = 15, padT = 10, padB = 18;
  var plotW = w - padL - padR;
  var plotH = h - padT - padB;
  if (plotW <= 10 || plotH <= 10) return;

  var maxI = 250, minI = 0;

  // Rejilla de fondo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (var r = 0; r <= 2; r++) {
    var y = padT + (plotH / 2) * r;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }

  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(maxI + 'A', padL - 6, padT + 8);
  ctx.fillText('0A', padL - 6, h - padB);

  var n = uData.length;
  var getX = function(idx) { return padL + (idx / (n - 1)) * plotW; };
  var getY = function(val) {
    var ratio = Math.max(0, Math.min(1, (val - minI) / (maxI - minI)));
    return padT + plotH * (1 - ratio);
  };

  var drawPhaseLine = function(series, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (var i = 0; i < n; i++) {
      var x = getX(i);
      var y = getY(series[i][1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  drawPhaseLine(uData, '#eab308');
  drawPhaseLine(vData, '#38bdf8');
  drawPhaseLine(wData, '#ef4444');
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var iu = 0.0, iv = 0.0, iw = 0.0;
  var dgHours = 0.0, dgKw = 0.0;
  var hasDgInfo = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
      if (item.data && item.data.length > 0) {
        var lastPt = parseFloat(item.data[item.data.length - 1][1]);
        if (!isNaN(lastPt)) {
          if (k.indexOf('fase_u') !== -1 || (i === 0 && k.indexOf('corriente') !== -1)) { iu = lastPt; self.uSeries = item.data; }
          else if (k.indexOf('fase_v') !== -1 || (i === 1 && k.indexOf('corriente') !== -1)) { iv = lastPt; self.vSeries = item.data; }
          else if (k.indexOf('fase_w') !== -1 || (i === 2 && k.indexOf('corriente') !== -1)) { iw = lastPt; self.wSeries = item.data; }
          else if (k.indexOf('generator_runtime') !== -1 || k.indexOf('horometro') !== -1) { dgHours = lastPt; hasDgInfo = true; }
          else if (k.indexOf('generator_power') !== -1 || k.indexOf('dg_potencia') !== -1) { dgKw = lastPt; hasDgInfo = true; }
        }
      }
    }
  }

  self.lastIu = iu;
  self.lastIv = iv;
  self.lastIw = iw;

  var avg = (iu + iv + iw) / 3;
  var maxDiff = Math.max(Math.abs(iu - avg), Math.abs(iv - avg), Math.abs(iw - avg));
  var unbalancePct = avg > 1 ? (maxDiff / avg) * 100 : 0;
  var isOk = unbalancePct < 5.0;
  var hasDgInstalled = dgHours > 10.0 || dgKw > 0.05;

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elTitle = container.querySelector('#dg-cur-title');
    var elU = container.querySelector('#iu-val');
    var elV = container.querySelector('#iv-val');
    var elW = container.querySelector('#iw-val');
    if (elU) elU.textContent = iu.toFixed(1);
    if (elV) elV.textContent = iv.toFixed(1);
    if (elW) elW.textContent = iw.toFixed(1);

    var elAvg = container.querySelector('#i-avg-text');
    if (elAvg) elAvg.textContent = avg.toFixed(1) + ' A';

    var elBadge = container.querySelector('#current-unbalance-badge');
    if (elBadge) {
      if (avg >= 0.5) {
        elBadge.textContent = isOk ? 'BALANCEADO (Δ ' + unbalancePct.toFixed(1) + '%)' : 'DESBALANCE (Δ ' + unbalancePct.toFixed(1) + '%)';
        elBadge.className = 'badge-dg ' + (isOk ? 'ok' : 'warn');
      } else if (hasDgInfo && !hasDgInstalled) {
        elBadge.textContent = 'NO APLICA (OFF-GRID DC)';
        elBadge.className = 'badge-dg ok';
      } else {
        elBadge.textContent = 'STANDBY / APAGADO (0.0 A)';
        elBadge.className = 'badge-dg ok';
      }
    }

    var elCap = container.querySelector('#cap-alt-footer');
    if (elCap) {
      if (hasDgInfo && !hasDgInstalled) {
        elCap.innerHTML = 'Topología: <strong>DC Telecom 48V</strong>';
      } else {
        elCap.innerHTML = 'Capacidad Alternador: <strong>350 A / Fase</strong>';
      }
    }
  }
  self.drawChart();
};

self.onDestroy = function() {};
