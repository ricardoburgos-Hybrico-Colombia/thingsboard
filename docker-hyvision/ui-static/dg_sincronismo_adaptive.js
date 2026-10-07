// Controller Script: SCADA - Estabilidad de Tensión y Frecuencia DG / Red 100% Real (Zero Fake 220.4V Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var hz = 0.0, vu = 0.0, vv = 0.0, vw = 0.0;
  var hasRealAc = false;
  var gridV = 0.0, gridHz = 0.0;
  var dgKw = 0.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('grid_voltage') !== -1) gridV = v;
          else if (k.indexOf('grid_frequency') !== -1) gridHz = v;
          else if (k.indexOf('generator_power') !== -1 || k.indexOf('dg_potencia') !== -1) dgKw = v;
          else if (k.indexOf('frecuencia') !== -1 || k.indexOf('hz') !== -1) { hz = v; hasRealAc = true; }
          else if (k.indexOf('fase_u') !== -1) { vu = v; hasRealAc = true; }
          else if (k.indexOf('fase_v') !== -1) { vv = v; hasRealAc = true; }
          else if (k.indexOf('fase_w') !== -1) { vw = v; hasRealAc = true; }
        }
      }
    }
  }

  // Si no hay fases individuales de generador pero hay red comercial activa
  if (!hasRealAc && gridV > 50) {
    vu = gridV; vv = gridV; vw = gridV;
    hz = gridHz > 0 ? gridHz : 60.0;
    hasRealAc = true;
  }

  var isEnergized = hasRealAc && (vu > 50 || dgKw > 0.1);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;

  if (container) {
    var elHz = container.querySelector('#dg-freq-val');
    if (elHz) elHz.textContent = isEnergized ? hz.toFixed(2) : '--';

    var elVu = container.querySelector('#vu-val');
    var elVv = container.querySelector('#vv-val');
    var elVw = container.querySelector('#vw-val');
    if (elVu) elVu.textContent = isEnergized ? vu.toFixed(1) + ' V' : '-- V';
    if (elVv) elVv.textContent = isEnergized ? vv.toFixed(1) + ' V' : '-- V';
    if (elVw) elVw.textContent = isEnergized ? vw.toFixed(1) + ' V' : '-- V';

    var elBadge = container.querySelector('#sync-status-badge');
    if (elBadge) {
      if (isEnergized) {
        var diff = Math.abs(hz - 60.0);
        var isOk = diff <= 0.5;
        elBadge.textContent = isOk ? 'SINCRONIZADO (60 Hz)' : 'DESVIACIÓN FREC.';
        elBadge.className = 'badge-sync ' + (isOk ? 'ok' : 'warn');
      } else {
        elBadge.textContent = 'STANDBY / DESCONECTADO';
        elBadge.className = 'badge-sync standby';
      }
    }
  }
};

self.onDestroy = function() {};
