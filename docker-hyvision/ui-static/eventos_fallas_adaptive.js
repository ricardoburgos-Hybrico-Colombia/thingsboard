// Controller Script: SCADA - Registro de Eventos y Fallas 100% Real (Zero Fake Defaults)
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var activas = 0;
  var fallas30d = 0;
  var warns30d = 0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseInt(item.data[item.data.length - 1][1], 10);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('activas') !== -1 || k.indexOf('alarm_active') !== -1) activas = v;
          else if (k.indexOf('faults') !== -1 || k.indexOf('fallas') !== -1) fallas30d = v;
          else if (k.indexOf('warnings') !== -1 || k.indexOf('advertencias') !== -1) warns30d = v;
        }
      }
    }
  }

  var hasAlert = activas > 0;
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#alarm-card');
    if (card) card.className = 'alarm-card-container ' + (hasAlert ? 'alert' : 'healthy');

    var elBadge = container.querySelector('#alarm-status-badge');
    if (elBadge) {
      elBadge.textContent = hasAlert ? 'ALARMA ACTIVA (' + activas + ')' : 'SISTEMA SALUDABLE';
      elBadge.className = 'alarm-badge ' + (hasAlert ? 'alert' : 'healthy');
    }

    var elAct = container.querySelector('#val-active-alarms');
    if (elAct) {
      elAct.textContent = activas;
      elAct.className = 'tile-kpi-num ' + (hasAlert ? 'alert' : 'healthy');
    }

    var elF = container.querySelector('#val-faults-30d');
    if (elF) elF.textContent = fallas30d;

    var elW = container.querySelector('#val-warnings-30d');
    if (elW) elW.textContent = warns30d;
  }
};

self.onDestroy = function() {};
