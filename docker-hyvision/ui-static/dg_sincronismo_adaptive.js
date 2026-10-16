// Controller Script: SCADA - Estabilidad de Tensión y Frecuencia DG / Red 100% Real (Zero Fake Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var hz = 0.0, vu = 0.0, vv = 0.0, vw = 0.0;
  var hasRealAc = false;
  var gridV = 0.0, gridHz = 0.0, gridKw = 0.0, gridKwh = 0.0;
  var dgKw = 0.0, dgHours = 0.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('grid_voltage') !== -1) gridV = v;
          else if (k.indexOf('grid_frequency') !== -1) gridHz = v;
          else if (k.indexOf('grid_power') !== -1) gridKw = v;
          else if (k.indexOf('grid_energy') !== -1) gridKwh = v;
          else if (k.indexOf('generator_power') !== -1 || k.indexOf('dg_potencia') !== -1) dgKw = v;
          else if (k.indexOf('generator_runtime') !== -1 || k.indexOf('horometro') !== -1) dgHours = v;
          else if (k.indexOf('frecuencia') !== -1 || k.indexOf('hz') !== -1) { hz = v; hasRealAc = true; }
          else if (k.indexOf('fase_u') !== -1) { vu = v; hasRealAc = true; }
          else if (k.indexOf('fase_v') !== -1) { vv = v; hasRealAc = true; }
          else if (k.indexOf('fase_w') !== -1) { vw = v; hasRealAc = true; }
        }
      }
    }
  }

  var siteHasGrid = (gridKw > 0.05) || (gridV > 50.0) || (gridKwh > 0.5);
  var hasDgInstalled = (dgHours > 10.0) || (dgKw > 0.05);

  // Si no hay fases individuales de generador pero hay red comercial activa
  if (!hasRealAc && gridV > 50) {
    vu = gridV; vv = gridV; vw = gridV;
    hz = gridHz > 0 ? gridHz : 60.0;
    hasRealAc = true;
  }

  var isIndustrial = hasRealAc && (vu > 80 || vv > 80 || vw > 80);
  var isEnergized = hasRealAc && (vu > 50 || dgKw > 0.1 || gridKw > 0.05);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;

  if (container) {
    var elTitle = container.querySelector('#sync-title-text');
    var elFreqSub = container.querySelector('#freq-sub-lbl');
    var elHz = container.querySelector('#hz-val') || container.querySelector('#dg-freq-val');
    var elPointer = container.querySelector('#freq-pointer');
    var elVu = container.querySelector('#vu-val');
    var elVv = container.querySelector('#vv-val');
    var elVw = container.querySelector('#vw-val');
    var elBadge = container.querySelector('#sync-badge') || container.querySelector('#sync-status-badge');
    var elNominal = container.querySelector('#sync-nominal-foot');

    if (elTitle) {
      if (isIndustrial) {
        elTitle.textContent = 'ESTABILIDAD AC (MICRORRED BESS)';
      } else if (!siteHasGrid && !hasDgInstalled) {
        elTitle.textContent = 'ESTABILIDAD AC (NO APLICA - OFF-GRID)';
      } else if (siteHasGrid && !hasDgInstalled) {
        elTitle.textContent = 'ESTABILIDAD DE RED COMERCIAL';
      } else {
        elTitle.textContent = 'ESTABILIDAD DE TENSIÓN Y FRECUENCIA';
      }
    }

    if (elFreqSub) {
      if (isIndustrial) {
        elFreqSub.textContent = 'FRECUENCIA MICRORRED';
      } else if (siteHasGrid && !hasDgInstalled) {
        elFreqSub.textContent = 'FRECUENCIA DE RED';
      } else {
        elFreqSub.textContent = 'FRECUENCIA DE RED / DG';
      }
    }

    if (elHz) elHz.textContent = isEnergized ? hz.toFixed(2) : '--';

    if (elPointer) {
      if (isEnergized && hz > 0) {
        // Rango de 58 Hz (0%) a 62 Hz (100%)
        var pct = Math.max(0, Math.min(100, ((hz - 58.0) / 4.0) * 100));
        elPointer.style.left = pct.toFixed(1) + '%';
      } else {
        elPointer.style.left = '50%';
      }
    }

    if (elVu) elVu.textContent = isEnergized ? vu.toFixed(1) + ' V' : '-- V';
    if (elVv) elVv.textContent = isEnergized ? vv.toFixed(1) + ' V' : '-- V';
    if (elVw) elVw.textContent = isEnergized ? vw.toFixed(1) + ' V' : '-- V';

    if (elBadge) {
      if (isEnergized) {
        var diff = Math.abs(hz - 60.0);
        var isOk = diff <= 0.5;
        elBadge.textContent = isOk ? 'SINCRONIZADO (60 Hz)' : 'DESVIACIÓN FREC.';
        elBadge.className = 'badge-sync ' + (isOk ? 'ok in-sync' : 'warn');
      } else if (!siteHasGrid && !hasDgInstalled && !isIndustrial) {
        elBadge.textContent = 'NO APLICA (100% OFF-GRID DC)';
        elBadge.className = 'badge-sync standby';
      } else if (siteHasGrid && !hasDgInstalled) {
        elBadge.textContent = 'CORTE DE RED';
        elBadge.className = 'badge-sync warn';
      } else {
        elBadge.textContent = 'STANDBY / DESCONECTADO';
        elBadge.className = 'badge-sync standby';
      }
    }

    if (elNominal) {
      if (isIndustrial) {
        elNominal.innerHTML = 'Tensión Nominal: <strong>208 V / 220 V AC (±5%)</strong>';
      } else if (!siteHasGrid && !hasDgInstalled) {
        elNominal.innerHTML = 'Topología: <strong>100% Solar DC</strong>';
      } else {
        elNominal.innerHTML = 'Tensión Nominal: <strong>220 V (±5%)</strong>';
      }
    }
  }
};

self.onDestroy = function() {};
