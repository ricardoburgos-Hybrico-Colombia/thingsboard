// Controller Script: SCADA - Potencia Reactiva Universal Adaptativa (Zero Fake 0.8 Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var q1 = 0.0, q2 = 0.0, q3 = 0.0, qTotal = null;
  var hasRealQ = false;
  var isIndustrial = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('total') !== -1) { qTotal = v; hasRealQ = true; }
          else if (k.indexOf('pcs1') !== -1) { q1 = v; hasRealQ = true; isIndustrial = true; }
          else if (k.indexOf('pcs2') !== -1) { q2 = v; hasRealQ = true; isIndustrial = true; }
          else if (k.indexOf('pcs3') !== -1) { q3 = v; hasRealQ = true; isIndustrial = true; }
        }
      }
    }
  }

  var finalQ = (qTotal !== null) ? qTotal : (q1 + q2 + q3);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elTot = container.querySelector('#q-total-val');
    if (elTot) elTot.textContent = Math.abs(finalQ).toFixed(1);

    var elBadge = container.querySelector('#q-regime-badge');
    if (elBadge) {
      if (!hasRealQ || Math.abs(finalQ) < 0.2) {
        elBadge.textContent = isIndustrial ? 'FP UNITARIO (1.00)' : 'RÉGIMEN DC PURO';
        elBadge.className = 'pcs-badge ok';
      } else {
        elBadge.textContent = finalQ >= 0 ? 'INDUCTIVO' : 'CAPACITIVO';
        elBadge.className = 'pcs-badge reactive';
      }
    }

    var setQ = function(idVal, val) {
      var el = container.querySelector(idVal);
      if (el) el.textContent = val.toFixed(1) + ' kVAR';
    };
    setQ('#q-pcs1-val', q1);
    setQ('#q-pcs2-val', q2);
    setQ('#q-pcs3-val', q3);

    var elFootRight = container.querySelector('#q-footer-right');
    if (elFootRight) {
      elFootRight.innerHTML = isIndustrial ? 'Topología: <strong>BESS 750V (3x PCS)</strong>' : 'Topología: <strong>Telecom 48V DC</strong>';
    }
    var elComp = container.querySelector('#q-comp-val');
    if (elComp) {
      elComp.textContent = isIndustrial ? (Math.abs(finalQ) < 5 ? 'Normalizada' : 'Activa') : 'Sin Reactiva (DC)';
    }
  }
};

self.onDestroy = function() {};
