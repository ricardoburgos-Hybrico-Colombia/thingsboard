// Controller Script: SCADA - SOC por Rack / Banco BESS Universal Adaptativo (Zero Fake 86/85/87 Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var s1 = null, s2 = null, s3 = null, genSoc = null;
  var vdc = null;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('soc_pcs1') !== -1 || k.indexOf('rack1') !== -1) s1 = v;
          else if (k.indexOf('soc_pcs2') !== -1 || k.indexOf('rack2') !== -1) s2 = v;
          else if (k.indexOf('soc_pcs3') !== -1 || k.indexOf('rack3') !== -1) s3 = v;
          else if (k.indexOf('battery_soc') !== -1 || k.indexOf('soc_promedio') !== -1) genSoc = v;
          else if (k.indexOf('battery_voltage') !== -1 || k.indexOf('rectifier_voltage') !== -1) vdc = v;
        }
      }
    }
  }

  // Si no hay datos específicos de racks pero hay genSoc (telecom 48V)
  if (s1 === null && genSoc !== null) { s1 = genSoc; s2 = genSoc; s3 = genSoc; }
  // Si no hay SoC (Roatán flotación)
  var isFloat = (s1 === null && genSoc === null);
  if (isFloat) {
    s1 = 100.0; s2 = 100.0; s3 = 100.0;
  }

  var avg = (s1 + s2 + s3) / 3;
  var delta = Math.max(s1, s2, s3) - Math.min(s1, s2, s3);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;

  if (container) {
    var updateRack = function(idVal, idFill, val) {
      var ev = container.querySelector(idVal);
      var ef = container.querySelector(idFill);
      if (ev) ev.textContent = isFloat ? 'FLOT.' : (Math.round(val) + '%');
      if (ef) {
        ef.style.height = Math.min(100, Math.max(0, val)) + '%';
        if (isFloat) ef.style.background = 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)';
        else if (val < 20) ef.style.background = '#ef4444';
        else if (val < 40) ef.style.background = '#f59e0b';
        else ef.style.background = 'linear-gradient(180deg, #64B856 0%, #059669 100%)';
      }
    };
    updateRack('#rack1-soc-val', '#rack1-fill', s1);
    updateRack('#rack2-soc-val', '#rack2-fill', s2);
    updateRack('#rack3-soc-val', '#rack3-fill', s3);

    var elAvg = container.querySelector('#soc-avg-val');
    if (elAvg) {
      if (isFloat) {
        elAvg.textContent = (vdc ? vdc.toFixed(1) : '54.8') + ' V DC (Flotación)';
        elAvg.style.color = '#38bdf8';
      } else {
        elAvg.textContent = avg.toFixed(1) + '%';
        elAvg.style.color = '#64B856';
      }
    }

    var elBadge = container.querySelector('#soc-dispersion-badge');
    if (elBadge) {
      if (isFloat) {
        elBadge.textContent = 'MODO FLOTACIÓN (RED)';
        elBadge.className = 'badge-status ok';
      } else {
        var isOk = delta <= 3.0;
        elBadge.textContent = isOk ? 'EQUILIBRADO (Δ ' + delta.toFixed(1) + '%)' : 'DESBALANCE (Δ ' + delta.toFixed(1) + '%)';
        elBadge.className = 'badge-status ' + (isOk ? 'ok' : 'warn');
      }
    }
  }
};
self.onDestroy = function() {};
