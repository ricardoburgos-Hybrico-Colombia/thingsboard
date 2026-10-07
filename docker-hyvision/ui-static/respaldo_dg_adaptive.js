// Controller Script: SCADA - Respaldo y Fuentes Auxiliares Adaptativo (DG / Red Comercial)
self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var dgKw = 0.0, gridKw = 0.0, gridV = null, dgHours = 0.0, gridKwh = 0.0;
  var estadoVal = "APAGADO";

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var lastVal = item.data[item.data.length - 1][1];
        var num = parseFloat(lastVal);
        var keyName = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (keyName.indexOf("generator_runtime") !== -1 || keyName.indexOf("horometro") !== -1) {
          if (!isNaN(num)) dgHours = num;
        } else if (keyName.indexOf("grid_power") !== -1) {
          if (!isNaN(num)) gridKw = num;
        } else if (keyName.indexOf("grid_energy") !== -1) {
          if (!isNaN(num)) gridKwh = num;
        } else if (keyName.indexOf("grid_voltage") !== -1 || keyName.indexOf("tension_fase") !== -1) {
          if (!isNaN(num) && num > 0) gridV = num;
        } else if (keyName.indexOf("generator_power") !== -1 || keyName.indexOf("dg_potencia") !== -1) {
          if (!isNaN(num)) dgKw = num;
        } else if (keyName.indexOf("estado") !== -1) {
          estadoVal = String(lastVal).toUpperCase();
        }
      }
    }
  }

  // Sanitización de fiabilidad física
  dgKw = Math.max(0, dgKw);
  gridKw = Math.max(0, gridKw);

  var isDgRunning = dgKw > 0.1 || estadoVal.indexOf("MARCHA") !== -1 || estadoVal.indexOf("OPER") !== -1 || estadoVal.indexOf("RUN") !== -1;
  var isGridActive = gridKw > 0.05 || (gridV !== null && gridV > 85.0);
  var hasDgInstalled = dgHours > 10.0 || dgKw > 0.05;
  var siteHasGrid = isGridActive || gridKwh > 0.5 || (gridV !== null && gridV > 50.0);

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#dg-card');
    var elIcon = container.querySelector('#dg-header-icon');
    var elTitle = container.querySelector('#dg-header-title');
    var elPower = container.querySelector('#dg-power-value');
    var elBadge = container.querySelector('#dg-status-badge');
    var elSub = container.querySelector('#dg-subtext');
    var elState = container.querySelector('#dg-state-value');

    if (isDgRunning) {
      if (card) card.className = "dg-card-container running";
      if (elIcon) elIcon.textContent = "⛽";
      if (elTitle) elTitle.textContent = "RESPALDO (DG)";
      if (elPower) { elPower.textContent = dgKw.toFixed(1); elPower.className = "metric-value running"; }
      if (elBadge) { elBadge.textContent = "EN MARCHA"; elBadge.className = "dg-status-badge running"; }
      if (elSub) elSub.textContent = dgHours > 0 ? ("Horómetro: " + dgHours.toFixed(0) + " h") : "Diésel en Generación";
      if (elState) { elState.textContent = "EN LÍNEA"; elState.className = "footer-value running"; }
    } else if (isGridActive) {
      if (card) card.className = "dg-card-container running";
      if (elIcon) elIcon.textContent = "🌐";
      if (elTitle) elTitle.textContent = "RED COMERCIAL";
      if (elPower) { elPower.textContent = gridKw.toFixed(1); elPower.className = "metric-value running"; }
      if (elBadge) { elBadge.textContent = "EN LÍNEA"; elBadge.className = "dg-status-badge running"; }
      if (elSub) {
        if (hasDgInstalled) {
          elSub.textContent = "MG Standby (" + dgHours.toFixed(0) + " h)";
        } else {
          elSub.textContent = (gridV !== null && gridV > 50) ? ("Tensión: " + gridV.toFixed(0) + " V") : "Suministro Activo AC";
        }
      }
      if (elState) { elState.textContent = "CONECTADA"; elState.className = "footer-value running"; }
    } else if (hasDgInstalled) {
      if (card) card.className = "dg-card-container standby";
      if (elIcon) elIcon.textContent = "⛽";
      if (elTitle) elTitle.textContent = siteHasGrid ? "RESPALDO & RED" : "RESPALDO (DG)";
      if (elPower) { elPower.textContent = "0.0"; elPower.className = "metric-value standby"; }
      if (elBadge) { elBadge.textContent = "STANDBY"; elBadge.className = "dg-status-badge standby"; }
      if (elSub) elSub.textContent = "Horómetro: " + dgHours.toFixed(0) + " h";
      if (elState) { elState.textContent = "APAGADO"; elState.className = "footer-value standby"; }
    } else if (siteHasGrid) {
      // Sitio de Red sin Generador pero Red en corte
      if (card) card.className = "dg-card-container standby";
      if (elIcon) elIcon.textContent = "🌐";
      if (elTitle) elTitle.textContent = "RED COMERCIAL";
      if (elPower) { elPower.textContent = "0.0"; elPower.className = "metric-value standby"; }
      if (elBadge) { elBadge.textContent = "CORTE DE RED"; elBadge.className = "dg-status-badge standby"; }
      if (elSub) elSub.textContent = "Sin Tensión AC";
      if (elState) { elState.textContent = "DESCONECTADA"; elState.className = "footer-value standby"; }
    } else {
      // 100% Solar autónomo (Off-Grid)
      if (card) card.className = "dg-card-container standby";
      if (elIcon) elIcon.textContent = "⚡";
      if (elTitle) elTitle.textContent = "FUENTE AUXILIAR";
      if (elPower) { elPower.textContent = "0.0"; elPower.className = "metric-value standby"; }
      if (elBadge) { elBadge.textContent = "NO APLICA"; elBadge.className = "dg-status-badge standby"; }
      if (elSub) elSub.textContent = "100% Autonomía Solar";
      if (elState) { elState.textContent = "OFF-GRID"; elState.className = "footer-value standby"; }
    }
  }
};

self.onDestroy = function() {};
