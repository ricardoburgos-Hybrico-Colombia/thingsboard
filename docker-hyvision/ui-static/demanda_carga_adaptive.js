// Controller Script: SCADA - Demanda de Carga Universal Adaptativa (Zero GAORI Hardcode)
self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var powerVal = 0.0;
  var energyVal = 0.0;
  var vLoad = null;
  var iLoad = null;
  var isIndustrial = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var lastVal = item.data[item.data.length - 1][1];
        var num = parseFloat(lastVal);
        var keyName = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (keyName.indexOf("energy") !== -1 || keyName.indexOf("energia") !== -1 || keyName.indexOf("eload_hoy") !== -1) {
          if (!isNaN(num)) energyVal = num;
        } else if (keyName === "load_dc_voltage") {
          if (!isNaN(num) && num > 0) vLoad = num;
        } else if (keyName === "load_dc_current") {
          if (!isNaN(num)) iLoad = num;
        } else if (keyName.indexOf("load") !== -1 || keyName.indexOf("demanda") !== -1 || keyName.indexOf("carga") !== -1) {
          if (!isNaN(num)) powerVal = num;
        } else if (keyName.indexOf("pcs") !== -1) {
          isIndustrial = true;
        }
      }
    }
  }

  // Filtrado de fiabilidad: Carga BTS siempre es no-negativa (P >= 0)
  powerVal = Math.max(0, powerVal);
  energyVal = Math.max(0, energyVal);

  // Filtrado contador Modbus centinela
  if (energyVal >= 60000) energyVal = Math.round((energyVal % 65535) * 10) / 10;

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elPower = container.querySelector('#load-power-value');
    if (elPower) elPower.textContent = powerVal.toFixed(1);

    var elEnergy = container.querySelector('#load-energy-value');
    if (elEnergy) elEnergy.textContent = energyVal.toFixed(1) + ' kWh';

    var elSub = container.querySelector('#load-subtext-arch');
    if (elSub) {
      if (isIndustrial) {
        elSub.textContent = 'Carga Crítica de Planta';
      } else if (vLoad !== null && iLoad !== null) {
        elSub.textContent = 'BTS DC: ' + vLoad.toFixed(1) + ' V | ' + Math.max(0, iLoad).toFixed(1) + ' A';
      } else if (powerVal > 0) {
        var estA = (powerVal * 1000.0 / 52.0).toFixed(1);
        elSub.textContent = 'BTS DC: 52.0 V | ' + estA + ' A';
      } else {
        elSub.textContent = 'Estación Base BTS 48V';
      }
    }

    var elBadge = container.querySelector('#load-badge-status');
    if (elBadge) {
      elBadge.textContent = powerVal > 0.05 ? 'EN VIVO' : 'STANDBY';
      elBadge.style.background = powerVal > 0.05 ? 'rgba(98, 195, 245, 0.15)' : 'rgba(100, 116, 139, 0.15)';
      elBadge.style.color = powerVal > 0.05 ? '#62c3f5' : '#94a3b8';
    }
  }
};

self.onDestroy = function() {};
