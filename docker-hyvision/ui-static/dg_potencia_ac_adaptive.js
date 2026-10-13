// Controller Script: SCADA - Potencia Aparente y Reactiva DG / Red (Zero Fake Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var kva = 0.0, kvar = 0.0;
  var dgHours = 0.0, dgKw = 0.0;
  var nominalKva = 250.0;
  var hasDgInfo = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('aparente') !== -1 || k.indexOf('kva') !== -1 || i === 0) kva = v;
          else if (k.indexOf('reactiva') !== -1 || k.indexOf('kvar') !== -1 || i === 1) kvar = v;
          else if (k.indexOf('generator_runtime') !== -1 || k.indexOf('horometro') !== -1) { dgHours = v; hasDgInfo = true; }
          else if (k.indexOf('generator_power') !== -1 || k.indexOf('dg_potencia') !== -1) { dgKw = v; hasDgInfo = true; }
        }
      }
    }
  }

  // Cálculo de kW y FP: P = sqrt(S^2 - Q^2)
  var kw = 0.0;
  var pf = 1.0;
  if (kva > 0.5) {
    var pSquared = Math.max(0, Math.pow(kva, 2) - Math.pow(kvar, 2));
    kw = Math.sqrt(pSquared);
    pf = Math.min(1.0, kw / kva);
  }

  var loadPct = Math.min(100, Math.max(0, (kva / nominalKva) * 100));
  var hasDgInstalled = (dgHours > 10.0) || (dgKw > 0.05);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;

  if (container) {
    var elKva = container.querySelector('#kva-val');
    var elKvar = container.querySelector('#kvar-val');
    if (elKva) elKva.textContent = kva.toFixed(1);
    if (elKvar) elKvar.textContent = Math.abs(kvar).toFixed(1);

    var elPct = container.querySelector('#kva-pct-lbl');
    if (elPct) elPct.textContent = loadPct.toFixed(0) + '%';

    var elBar = container.querySelector('#pwr-bar-fill');
    if (elBar) elBar.style.width = loadPct + '%';

    var elKw = container.querySelector('#kw-estimated-lbl');
    if (elKw) elKw.innerHTML = 'Pot. Activa: <strong style="color:#f1f5f9;">' + kw.toFixed(1) + ' kW</strong>';

    var elBadge = container.querySelector('#pf-badge');
    if (elBadge) {
      if (kva < 0.5) {
        if (hasDgInfo && !hasDgInstalled) {
          elBadge.textContent = 'NO APLICA (OFF-GRID DC)';
        } else {
          elBadge.textContent = 'STANDBY';
        }
      } else {
        elBadge.textContent = 'FP: ' + pf.toFixed(2) + ' (' + (kvar >= 0 ? 'IND' : 'CAP') + ')';
      }
    }

    var elReg = container.querySelector('#q-regime-lbl');
    if (elReg) {
      elReg.textContent = kvar > 0.5 ? 'Inductivo' : (kvar < -0.5 ? 'Capacitivo' : 'Equilibrado');
    }

    var elCap = container.querySelector('#pwr-cap-foot');
    if (elCap) {
      if (hasDgInfo && !hasDgInstalled) {
        elCap.innerHTML = 'Topología: <strong>DC Telecom 48V</strong>';
      } else {
        elCap.innerHTML = 'Límite Alternador: <strong>250 kVA</strong>';
      }
    }
  }
};
self.onDestroy = function() {};
