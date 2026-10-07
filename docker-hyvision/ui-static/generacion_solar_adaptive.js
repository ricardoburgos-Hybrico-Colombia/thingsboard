// Controller Script: SCADA - Generación Solar Universal Adaptativa (Zero GAORI Hardcode)
self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var powerVal = 0.0;
  var energyVal = 0.0;
  var scKw = 0.0;
  var invSolKw = 0.0;
  var isIndustrial = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var lastVal = item.data[item.data.length - 1][1];
        var num = parseFloat(lastVal);
        var keyName = (item.dataKey.label || item.dataKey.name || "").toLowerCase();

        if (keyName.indexOf("solar_charger_power") !== -1) {
          if (!isNaN(num)) scKw = num;
        } else if (keyName.indexOf("solar_inverter_power") !== -1) {
          if (!isNaN(num)) invSolKw = num;
        } else if (keyName.indexOf("energy") !== -1 || keyName.indexOf("energia") !== -1 || keyName.indexOf("epv_hoy") !== -1) {
          if (!isNaN(num)) energyVal = num;
        } else if (keyName.indexOf("solar") !== -1 || keyName.indexOf("generacion") !== -1) {
          if (!isNaN(num)) powerVal = num;
        } else if (keyName.indexOf("pcs") !== -1 || keyName.indexOf("pac") !== -1) {
          isIndustrial = true;
        }
      }
    }
  }

  // Si no se asignó powerVal directamente pero tenemos componentes
  if (powerVal === 0 && (scKw > 0 || invSolKw > 0)) {
    powerVal = scKw + invSolKw;
  }

  // Sanitización de fiabilidad física
  powerVal = Math.max(0, powerVal);
  energyVal = Math.max(0, energyVal);

  // Filtrado de contador Modbus centinela
  if (energyVal >= 60000) energyVal = Math.round((energyVal % 65535) * 10) / 10;

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elPower = container.querySelector('#solar-power-value');
    if (elPower) elPower.textContent = powerVal.toFixed(1);

    var elEnergy = container.querySelector('#solar-energy-value');
    if (elEnergy) elEnergy.textContent = energyVal.toFixed(1) + ' kWh';

    var elSub = container.querySelector('#solar-subtext-arch');
    if (elSub) {
      if (isIndustrial) {
        elSub.textContent = '3 × PCS250 en paralelo';
      } else if (scKw > 0 && invSolKw > 0) {
        elSub.textContent = 'Solar Dual (MPPT + Inv AC)';
      } else if (invSolKw > 0) {
        elSub.textContent = 'Inversor Solar de Red AC';
      } else {
        elSub.textContent = 'Controlador Solar MPPT 48V';
      }
    }

    var elBadge = container.querySelector('#solar-badge-status');
    if (elBadge) {
      elBadge.textContent = powerVal > 0.05 ? 'EN VIVO' : 'STANDBY';
      elBadge.style.background = powerVal > 0.05 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)';
      elBadge.style.color = powerVal > 0.05 ? '#22c55e' : '#94a3b8';
    }
  }
};

self.onDestroy = function() {};
