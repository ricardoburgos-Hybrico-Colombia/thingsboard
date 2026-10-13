// Controller Script: SCADA - Almacenamiento BESS Universal Adaptativo
self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var socVal = null;
  var bessKw = 0.0;
  var vdc = 0.0;
  var idc = 0.0;
  var temp = null;
  var netEnergy = null;
  var estadoBess = "STANDBY";
  var isIndustrial = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var lastVal = item.data[item.data.length - 1][1];
        var num = parseFloat(lastVal);
        var keyName = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (keyName.indexOf("soc") !== -1 || keyName.indexOf("bess_soc") !== -1) {
          if (!isNaN(num)) socVal = num;
        } else if (keyName.indexOf("voltage") !== -1 || keyName.indexOf("vbat") !== -1 || keyName.indexOf("rectifier_voltage") !== -1) {
          if (!isNaN(num) && num > 0) vdc = num;
        } else if (keyName.indexOf("current") !== -1 || keyName.indexOf("ibat") !== -1) {
          if (!isNaN(num)) idc = num;
        } else if (keyName.indexOf("temp") !== -1) {
          if (!isNaN(num)) temp = num;
        } else if (keyName.indexOf("net_energy") !== -1) {
          if (!isNaN(num)) netEnergy = num;
        } else if (keyName.indexOf("potencia") !== -1 || keyName.indexOf("power") !== -1) {
          if (!isNaN(num)) bessKw = num;
        } else if (keyName.indexOf("estado") !== -1) {
          estadoBess = String(lastVal).toUpperCase();
        } else if (keyName.indexOf("pcs") !== -1) {
          isIndustrial = true;
        }
      }
    }
  }

  if (vdc > 0 && vdc < 100.0) isIndustrial = false;
  if (vdc > 200.0) isIndustrial = true;

  var isDischarging = estadoBess.indexOf("DESC") !== -1 || idc < -0.5 || bessKw < -0.2;
  var isCharging = !isDischarging && (estadoBess.indexOf("CARG") !== -1 || idc > 0.5 || bessKw > 0.2);
  var isStandby = !isCharging && !isDischarging;

  var pDisp = Math.abs(bessKw);
  if (pDisp === 0 && idc !== 0 && vdc > 0) {
    pDisp = Math.abs(Math.round((vdc * idc) / 100) / 10);
  }

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#bess-card');
    var elTitle = container.querySelector('#bess-title-text');
    var elBadge = container.querySelector('#bess-status-badge');
    var elSoc = container.querySelector('#bess-soc-value');
    var elUnit = container.querySelector('#bess-soc-unit');
    var elSub = container.querySelector('#bess-subtext');
    var elPower = container.querySelector('#bess-power-value');

    if (socVal !== null) {
      // Sitio con SoC reportado
      var modeClass = isStandby ? "standby" : (isCharging ? "charging" : "discharging");
      var badgeText = isStandby ? "STANDBY" : (isCharging ? "CARGANDO" : "DESCARGANDO");
      var arrowIcon = isStandby ? "○" : (isCharging ? "▲" : "▼");

      if (card) card.className = "bess-card-container " + modeClass;
      if (elTitle) elTitle.textContent = isIndustrial ? "SOC BATERÍAS (BESS)" : "SOC BATERÍAS 48V";
      if (elBadge) { elBadge.textContent = badgeText; elBadge.className = "bess-status-badge " + modeClass; }
      if (elSoc) elSoc.textContent = Math.round(socVal);
      if (elUnit) elUnit.textContent = "% SOC";
      
      // Telecom info rica (Bus V, Temp °C, Neta kWh)
      var subInfo = "Bus DC: " + vdc.toFixed(1) + " V";
      if (temp !== null) subInfo += " | " + temp.toFixed(0) + "°C";
      if (netEnergy !== null && netEnergy > 0) subInfo += " | Neta: " + netEnergy.toFixed(1) + " kWh";
      else if (idc !== 0) subInfo += " | " + (idc >= 0 ? "+" : "") + idc.toFixed(1) + " A";
      else subInfo += " | Estabilizado";

      if (elSub) elSub.textContent = isIndustrial ? "Promedio 3 racks LFP 750V" : subInfo;
      if (elPower) {
        elPower.textContent = arrowIcon + " " + pDisp.toFixed(1) + " kW";
        elPower.className = "footer-value " + modeClass;
      }
    } else {
      // Roatán / Sitio en Modo Flotación sin sensor SoC
      var vShow = vdc > 0 ? vdc : 54.8;
      if (card) card.className = "bess-card-container charging";
      if (elTitle) elTitle.textContent = "BUS DC (FLOTACIÓN)";
      if (elBadge) { elBadge.textContent = "FLOTACIÓN"; elBadge.className = "bess-status-badge charging"; }
      if (elSoc) elSoc.textContent = vShow.toFixed(1);
      if (elUnit) elUnit.textContent = "V DC";
      if (elSub) elSub.textContent = "Servicio Continuo 48V";
      if (elPower) {
        elPower.textContent = "● MODO FLOTACIÓN";
        elPower.className = "footer-value charging";
      }
    }
  }
};

self.onDestroy = function() {};
