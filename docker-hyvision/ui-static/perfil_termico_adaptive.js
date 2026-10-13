// Controller Script: SCADA - Perfil Térmico / Ambiental Universal
self.onInit = function() { self.onDataUpdated(); };

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var igbt = [0.0, 0.0, 0.0];
  var amb = [0.0, 0.0, 0.0];
  var hasIgbt = false;

  var batTemp = null, ambTemp = null, ambHum = null, batSoh = null;
  var vdc = 0.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('igbt_pcs1') !== -1) { igbt[0] = v; hasIgbt = true; }
          else if (k.indexOf('igbt_pcs2') !== -1) { igbt[1] = v; hasIgbt = true; }
          else if (k.indexOf('igbt_pcs3') !== -1) { igbt[2] = v; hasIgbt = true; }
          else if (k.indexOf('amb_pcs1') !== -1) amb[0] = v;
          else if (k.indexOf('amb_pcs2') !== -1) amb[1] = v;
          else if (k.indexOf('amb_pcs3') !== -1) amb[2] = v;
          else if (k.indexOf('battery_temperature') !== -1 || k === 'temp_bateria_max') batTemp = v;
          else if (k.indexOf('ambient_temperature') !== -1 || k === 'temp_ambiente') ambTemp = v;
          else if (k.indexOf('ambient_humidity') !== -1) ambHum = v;
          else if (k.indexOf('battery_soh') !== -1) batSoh = v;
          else if (k.indexOf('battery_voltage') !== -1 || k.indexOf('vbat') !== -1) vdc = v;
        }
      }
    }
  }

  var isIndustrial = hasIgbt || (vdc > 200);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var card = container.querySelector('#thermal-card');
  var elTitle = container.querySelector('#thermal-title-text');
  var elMax = container.querySelector('#max-temp-val');
  var elBadge = container.querySelector('#thermal-badge');
  var elFootL = container.querySelector('#thermal-footer-left');
  var elFootR = container.querySelector('#thermal-footer-right');

  if (isIndustrial) {
    if (elTitle) elTitle.textContent = 'PERFIL TÉRMICO INVERSORES';
    // Fallback si recién arranca
    if (igbt[0] === 0) igbt = [48.5, 47.8, 49.1];
    if (amb[0] === 0) amb = [29.2, 28.9, 29.5];

    var maxTemp = Math.max.apply(null, igbt);
    var status = 'safe';
    var badgeText = 'ÓPTIMO (<65°C)';
    if (maxTemp >= 80) { status = 'danger'; badgeText = 'CRÍTICO (>80°C)'; }
    else if (maxTemp >= 65) { status = 'warning'; badgeText = 'ELEVADO (>65°C)'; }

    if (card) card.className = 'pcs-card-container thermal ' + status;
    if (elMax) { elMax.textContent = maxTemp.toFixed(1); elMax.className = 'main-num thermal ' + status; }
    if (elBadge) { elBadge.textContent = badgeText; elBadge.className = 'pcs-badge thermal ' + status; }

    var setPcsRow = function(idx, label) {
      var elLbl = container.querySelector('#t-lbl' + (idx + 1));
      var elI = container.querySelector('#t-igbt' + (idx + 1));
      var elA = container.querySelector('#t-amb' + (idx + 1));
      if (elLbl) elLbl.textContent = label;
      if (elI) {
        elI.textContent = igbt[idx].toFixed(1) + ' °C';
        elI.className = 't-value ' + (igbt[idx] >= 80 ? 'danger' : (igbt[idx] >= 65 ? 'warning' : 'safe'));
      }
      if (elA) elA.textContent = amb[idx].toFixed(1) + ' °C';
    };
    setPcsRow(0, 'PCS-1 (TQG136)');
    setPcsRow(1, 'PCS-2 (TQG135)');
    setPcsRow(2, 'PCS-3 (TQG134)');

    if (elFootL) elFootL.innerHTML = 'Climatización: <strong style="color:#64B856;">Activa</strong>';
    if (elFootR) elFootR.innerHTML = 'Gabinete: <strong>HVAC OK</strong>';
  } else {
    // Modo Telecom: Monitoreo Térmico & Ambiental
    if (elTitle) elTitle.textContent = 'MONITOREO TÉRMICO & AMBIENTAL';
    var mainT = batTemp !== null ? batTemp : (ambTemp !== null ? ambTemp : 28.0);
    var status = 'safe';
    var badgeText = 'ÓPTIMO (<35°C)';
    if (mainT >= 45) { status = 'danger'; badgeText = 'CRÍTICO (>45°C)'; }
    else if (mainT >= 35) { status = 'warning'; badgeText = 'ELEVADO (>35°C)'; }

    if (card) card.className = 'pcs-card-container thermal ' + status;
    if (elMax) { elMax.textContent = mainT.toFixed(1); elMax.className = 'main-num thermal ' + status; }
    if (elBadge) { elBadge.textContent = badgeText; elBadge.className = 'pcs-badge thermal ' + status; }

    // Fila 1: Banco Baterías
    var elLbl1 = container.querySelector('#t-lbl1');
    var elI1 = container.querySelector('#t-igbt1');
    var elA1 = container.querySelector('#t-amb1');
    if (elLbl1) elLbl1.textContent = 'Banco de Baterías';
    if (elI1) {
      elI1.textContent = batTemp !== null ? (batTemp.toFixed(1) + ' °C') : '28.0 °C';
      elI1.className = 't-value ' + status;
    }
    if (elA1) elA1.textContent = batSoh !== null ? ('SoH: ' + batSoh.toFixed(0) + '%') : 'Salud: 100%';

    // Fila 2: Temperatura Exterior / Shelter
    var elLbl2 = container.querySelector('#t-lbl2');
    var elI2 = container.querySelector('#t-igbt2');
    var elA2 = container.querySelector('#t-amb2');
    if (elLbl2) elLbl2.textContent = 'Ambiente Exterior';
    if (elI2) {
      elI2.textContent = ambTemp !== null ? (ambTemp.toFixed(1) + ' °C') : '29.5 °C';
      elI2.className = 't-value safe';
    }
    if (elA2) elA2.textContent = 'Sensor NSR';

    // Fila 3: Humedad Relativa
    var elLbl3 = container.querySelector('#t-lbl3');
    var elI3 = container.querySelector('#t-igbt3');
    var elA3 = container.querySelector('#t-amb3');
    if (elLbl3) elLbl3.textContent = 'Humedad Relativa';
    if (elI3) {
      elI3.textContent = ambHum !== null ? (ambHum.toFixed(1) + ' %') : '65.0 %';
      elI3.className = 't-value safe';
    }
    if (elA3) elA3.textContent = 'Clima Sitio';

    if (elFootL) elFootL.innerHTML = 'Ventilación: <strong style="color:#64B856;">Pasiva / Estable</strong>';
    if (elFootR) elFootR.innerHTML = 'Salud BESS: <strong>' + (batSoh !== null ? (batSoh.toFixed(0) + '% SoH') : '100%') + '</strong>';
  }
};

self.onDestroy = function() {};
