// Controller Script: SCADA - Balance de Planta Universal Adaptativo
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var solar = 0.0;
  var bess = 0.0;
  var load = 0.0;
  var grid = 0.0;
  var dg = 0.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var lastVal = item.data[item.data.length - 1][1];
        var num = parseFloat(lastVal);
        var keyName = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (!isNaN(num)) {
          if (keyName.indexOf("solar") !== -1) solar = Math.max(solar, num);
          else if (keyName.indexOf("grid_power") !== -1 || keyName.indexOf("red_potencia") !== -1) grid = Math.max(grid, num);
          else if (keyName.indexOf("generator_power") !== -1 || keyName.indexOf("dg_potencia") !== -1) dg = Math.max(dg, num);
          else if (keyName.indexOf("bess") !== -1 || keyName.indexOf("battery_power") !== -1) bess = num;
          else if (keyName.indexOf("carga") !== -1 || keyName.indexOf("load") !== -1 || keyName.indexOf("demanda") !== -1) load = Math.max(load, num);
        }
      }
    }
  }

  // Sanitización de fiabilidad física
  solar = Math.max(0, solar);
  grid = Math.max(0, grid);
  dg = Math.max(0, dg);
  load = Math.max(0, load);

  // Si BESS descarga (bess < 0), actúa como fuente generadora hacia el bus
  var genBess = bess < -0.1 ? Math.abs(bess) : 0.0;
  var cargaBess = bess > 0.1 ? bess : 0.0;

  // Generación total entregada al bus (Solar + Red + Diésel + Descarga BESS)
  var totalGen = solar + grid + dg + genBess;
  var totalLoad = load + cargaBess;
  var netBalance = totalGen - totalLoad;

  var isBalanced = Math.abs(netBalance) <= 0.25;
  var isSurplus = netBalance > 0.25;
  var statusBadge = isBalanced ? "EQUILIBRIO" : (isSurplus ? "SUPERÁVIT" : "DÉFICIT");
  var modeClass = (isBalanced || isSurplus) ? "surplus" : "deficit";
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
      var parts = [];
      if (solar > 0.05) parts.push("Solar: " + solar.toFixed(1));
      if (grid > 0.05) parts.push("Red: " + grid.toFixed(1));
      if (dg > 0.05) parts.push("MG: " + dg.toFixed(1));

      var bessLabel = bess < -0.1 ? ("BESS: ▼ " + Math.abs(bess).toFixed(1)) : (bess > 0.1 ? ("BESS: ▲ " + bess.toFixed(1)) : "BESS: ○ 0.0");
      parts.push(bessLabel);

      elSubtext.textContent = parts.join(" | ") + " kW";
    }

    var elLoad = container.querySelector('#balance-load-value');
    if (elLoad) elLoad.textContent = "Carga: " + load.toFixed(1) + " kW";
  }
};

self.onDestroy = function() {};
