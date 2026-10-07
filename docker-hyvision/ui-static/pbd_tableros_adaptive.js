// Controller Script: SCADA - Tableros DC y Strings MPPT Universal Adaptativo (Zero 766V Hardcode)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var vbus = 0.0;
  var strings = [0.0, 0.0, 0.0, 0.0, 0.0];
  var statusStr = 'CERRADO';
  var maxStrAmp = 25.0;
  var isIndustrial = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = item.data[item.data.length - 1][1];
        var num = parseFloat(v);
        var k = (item.dataKey.label || item.dataKey.name || '').toLowerCase();

        if (!isNaN(num)) {
          if (k.indexOf('bus_voltage') !== -1 || k.indexOf('vbus') !== -1 || k.indexOf('battery_voltage') !== -1 || k.indexOf('rectifier_voltage') !== -1) {
            if (num > 0) vbus = num;
          } else if (k.indexOf('string_1') !== -1 || k.indexOf('ipv1') !== -1) strings[0] = num;
          else if (k.indexOf('string_2') !== -1 || k.indexOf('ipv2') !== -1) strings[1] = num;
          else if (k.indexOf('string_3') !== -1 || k.indexOf('ipv3') !== -1) strings[2] = num;
          else if (k.indexOf('string_4') !== -1 || k.indexOf('ipv4') !== -1) strings[3] = num;
          else if (k.indexOf('string_5') !== -1 || k.indexOf('ipv5') !== -1) strings[4] = num;
        }
        if (k.indexOf('status') !== -1 || k.indexOf('disconnect') !== -1) {
          statusStr = String(v).toUpperCase();
        }
      }
    }
  }

  isIndustrial = vbus > 200.0;
  if (vbus === 0.0) {
    vbus = isIndustrial ? 766.0 : 50.0;
  }

  var totalI = strings[0] + strings[1] + strings[2] + strings[3] + strings[4];
  var isClosed = statusStr.indexOf('ABIERTO') === -1 && statusStr.indexOf('DESCONECT') === -1;
  var container = self.ctx.$container ? self.ctx.$container[0] : null;

  if (container) {
    var elTitle = container.querySelector('#pbd-title-text');
    if (elTitle) elTitle.textContent = isIndustrial ? 'TABLEROS DC / STRINGS SOLARES (PBD250)' : 'TABLEROS DC / STRINGS MPPT';

    var elV = container.querySelector('#pbd-vbus-val');
    if (elV) elV.textContent = vbus.toFixed(1);

    var elTot = container.querySelector('#pbd-itot-val');
    if (elTot) elTot.textContent = totalI.toFixed(1);

    for (var s = 0; s < 5; s++) {
      var elSVal = container.querySelector('#str' + (s + 1) + '-val');
      var elSBar = container.querySelector('#str' + (s + 1) + '-bar');
      if (elSVal) elSVal.textContent = strings[s].toFixed(1) + ' A';
      if (elSBar) elSBar.style.width = Math.min(100, Math.max(0, (strings[s] / maxStrAmp) * 100)) + '%';
    }

    var elBadge = container.querySelector('#pbd-status-badge');
    if (elBadge) {
      if (isIndustrial) {
        elBadge.textContent = isClosed ? 'SECCIONADOR CERRADO' : 'SECCIONADOR ABIERTO';
        elBadge.className = 'pbd-badge ' + (isClosed ? 'ok' : 'warn');
      } else {
        elBadge.textContent = isClosed ? 'BUS DC ACTIVO' : 'BUS DESCONECTADO';
        elBadge.className = 'pbd-badge ' + (isClosed ? 'ok' : 'warn');
      }
    }

    var elCap = container.querySelector('#pbd-footer-cap');
    if (elCap) {
      elCap.innerHTML = isIndustrial ? 'Capacidad PBD: <strong>250 kW DC</strong>' : 'Capacidad: <strong>Bus Telecom 48V</strong>';
    }

    var elSecText = container.querySelector('#pbd-secc-text');
    if (elSecText) {
      elSecText.textContent = isClosed ? 'Conectado (Normal)' : 'Abierto (Desconectado)';
      elSecText.style.color = isClosed ? '#64B856' : '#ef4444';
    }
  }
};
self.onDestroy = function() {};
