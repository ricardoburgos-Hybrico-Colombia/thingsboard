// Controller Script: SCADA - Balance de Planta Universal Adaptativo
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var solar = 0.0;
  var bess = 0.0;
  var load = 0.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var lastVal = item.data[item.data.length - 1][1];
        var num = parseFloat(lastVal);
        var keyName = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (!isNaN(num)) {
          if (keyName.indexOf("solar") !== -1) solar = num;
          else if (keyName.indexOf("bess") !== -1 || keyName.indexOf("battery_power") !== -1) bess = num;
          else if (keyName.indexOf("carga") !== -1 || keyName.indexOf("load") !== -1 || keyName.indexOf("demanda") !== -1) load = num;
        }
      }
    }
  }

  // Sanitización de fiabilidad física
  solar = Math.max(0, solar);
  load = Math.max(0, load);

  // Si BESS descarga (bess < 0), actúa como fuente generadora
  var genBess = bess < 0 ? Math.abs(bess) : 0.0;
  var cargaBess = bess > 0 ? bess : 0.0;
  var totalGen = solar + genBess;
  var totalLoad = load + cargaBess;
  var netBalance = totalGen - totalLoad;

  var isBalanced = Math.abs(netBalance) <= 0.2;
  var isSurplus = netBalance > 0.2;
  var statusBadge = isBalanced ? "EQUILIBRIO" : (isSurplus ? "SUPERÁVIT" : "DÉFICIT");
  var modeClass = isBalanced ? "surplus" : (isSurplus ? "surplus" : "deficit");
  var netSign = netBalance > 0 ? "+" : "";
  var netString = isBalanced ? "±0.0" : (netSign + netBalance.toFixed(1));

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#balance-card');
    if (card) card.className = "balance-card-container " + modeClass;

    var elNet = container.querySelector('#balance-net-value');
    if (elNet) {
      elNet.textContent = netString;
      elNet.className = "metric-value " + (isSurplus || isBalanced ? '' : 'deficit');
    }

    var elBadge = container.querySelector('#balance-status-badge');
    if (elBadge) {
      elBadge.textContent = statusBadge;
      elBadge.className = "balance-status-badge " + modeClass;
    }

    var elSubtext = container.querySelector('#balance-subtext');
    if (elSubtext) {
      var bessLabel = bess < 0 ? ("BESS: ▼ " + Math.abs(bess).toFixed(1)) : (bess > 0 ? ("BESS: ▲ " + bess.toFixed(1)) : "BESS: ○ 0.0");
      elSubtext.textContent = "Solar: " + solar.toFixed(1) + " | " + bessLabel + " kW";
    }

    var elLoad = container.querySelector('#balance-load-value');
    if (elLoad) elLoad.textContent = "Carga: " + load.toFixed(1) + " kW";
  }
};

self.onDestroy = function() {};
