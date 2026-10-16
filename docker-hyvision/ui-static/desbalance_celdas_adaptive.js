// Controller Script: SCADA - Desbalance Celdas Universal Adaptativo (Zero Fake 14mV Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var deltaMv = null;
  var maxMv = null;
  var minMv = null;
  var vdc = null;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('delta_v') !== -1 || k.indexOf('delta_celda') !== -1) deltaMv = v;
          else if (k.indexOf('max_volt_celda') !== -1 || k.indexOf('celda_max') !== -1) maxMv = v;
          else if (k.indexOf('min_volt_celda') !== -1 || k.indexOf('celda_min') !== -1) minMv = v;
          else if (k.indexOf('battery_voltage') !== -1 || k.indexOf('vbat') !== -1 || k.indexOf('rectifier_voltage') !== -1) vdc = v;
        }
      }
    }
  }

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#bess-cell-card');
    var elD = container.querySelector('#cell-delta-val');
    var elMax = container.querySelector('#cell-max-val');
    var elMin = container.querySelector('#cell-min-val');
    var elBadge = container.querySelector('#cell-health-badge');

    if (deltaMv !== null) {
      // Sitio con telemetría de celdas BMS (GAORI o BMS Telecom avanzado)
      var isHealthy = deltaMv < 30;
      if (card) card.className = 'bess-cell-card ' + (isHealthy ? 'healthy' : 'alert');
      if (elD) {
        elD.textContent = Math.round(deltaMv);
        elD.className = 'delta-num ' + (isHealthy ? 'healthy' : 'alert');
      }
      if (elMax) elMax.textContent = Math.round(maxMv) + ' mV';
      if (elMin) elMin.textContent = Math.round(minMv) + ' mV';
      if (elBadge) {
        elBadge.textContent = isHealthy ? '< 30 mV SALUDABLE' : '≥ 30 mV DESBALANCE';
        elBadge.className = 'badge-cell ' + (isHealthy ? 'healthy' : 'alert');
      }
    } else {
      // Sitio Telecom sin sensor BMS por celda individual (monitoreo a nivel banco)
      if (card) card.className = 'bess-cell-card healthy';
      if (elD) {
        elD.textContent = '--';
        elD.className = 'delta-num healthy';
      }
      if (elMax) elMax.textContent = (vdc ? (vdc / 16 * 1000).toFixed(0) : '3300') + ' mV (Prom.)';
      if (elMin) elMin.textContent = (vdc ? vdc.toFixed(1) + ' V' : '48V Nom.');
      if (elBadge) {
        elBadge.textContent = 'MONITOREO BANCO 48V';
        elBadge.className = 'badge-cell healthy';
      }
    }
  }
};

self.onDestroy = function() {};
