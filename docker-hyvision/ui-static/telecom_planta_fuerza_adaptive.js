// Controller Script: SCADA - Planta de Fuerza DC & Cargador Solar (Telecom 48V)
self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var vbus = 0.0;
  var sc_v = 0.0;
  var sc_i = 0.0;
  var sc_p = 0.0;
  var rect_v = 0.0;
  var rect_i = 0.0;
  var rect_p = 0.0;
  var vbat = 0.0;
  var ibat = 0.0;
  var pbat = 0.0;
  var soc = 0.0;
  var amb_temp = 0.0;
  var grid_avail = 1;
  var hasRect = false;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var val = item.data[item.data.length - 1][1];
        var num = parseFloat(val);
        var k = (item.dataKey.label || item.dataKey.name || '').toLowerCase();

        if (!isNaN(num)) {
          if (k === 'solar_charger_voltage') sc_v = num;
          else if (k === 'solar_charger_current') sc_i = Math.max(0.0, num);
          else if (k === 'solar_charger_power_kw' || k === 'solar_power_kw') sc_p = Math.max(0.0, num);
          else if (k === 'battery_voltage') vbat = num;
          else if (k === 'battery_current') ibat = num;
          else if (k === 'battery_power_kw') pbat = num;
          else if (k === 'battery_soc') soc = num;
          else if (k === 'rectifier_voltage') { rect_v = num; hasRect = true; }
          else if (k === 'rectifier_current') { rect_i = Math.max(0.0, num); hasRect = true; }
          else if (k === 'rectifier_power_kw') { rect_p = Math.max(0.0, num); hasRect = true; }
          else if (k === 'ambient_temperature') amb_temp = num;
          else if (k === 'grid_available') grid_avail = parseInt(num, 10);
        }
      }
    }
  }

  // Tensión de Bus DC consensuada
  if (sc_v > 20.0) vbus = sc_v;
  else if (vbat > 20.0) vbus = vbat;
  else if (rect_v > 20.0) vbus = rect_v;
  else vbus = 48.0;

  // Potencia solar calculada si viene 0 pero hay corriente
  if (sc_p <= 0.0 && sc_i > 0.0) {
    sc_p = (sc_i * vbus) / 1000.0;
  }

  // Potencia rectificador calculada si viene 0 pero hay corriente
  if (rect_p <= 0.0 && rect_i > 0.0) {
    rect_p = (rect_i * (rect_v > 20.0 ? rect_v : vbus)) / 1000.0;
  }

  // Régimen de Operación de la Planta DC
  var modeStr = 'FLOTACIÓN';
  if (vbus >= 54.0) modeStr = 'ECUALIZACIÓN';
  else if (vbus >= 52.0) modeStr = 'FLOTACIÓN';
  else if (vbus < 48.0) modeStr = 'DESCARGA PROFUNDA';
  else modeStr = 'DESCARGA / ALERTA';

  var isBusOk = vbus >= 46.0;

  // 1. Cabecera
  var elMode = container.querySelector('#telecom-mode-badge');
  if (elMode) elMode.textContent = modeStr;

  var elBadge = container.querySelector('#telecom-status-badge');
  if (elBadge) {
    elBadge.textContent = isBusOk ? 'BUS DC ACTIVO' : 'BAJA TENSIÓN DC';
    elBadge.className = 'telecom-badge ' + (isBusOk ? 'ok' : 'err');
  }

  // 2. KPIs Superiores
  var elV = container.querySelector('#telecom-vbus-val');
  if (elV) elV.textContent = vbus > 0 ? vbus.toFixed(1) : '--';

  var elIso = container.querySelector('#telecom-isolar-val');
  if (elIso) elIso.textContent = sc_i.toFixed(1);

  var elPso = container.querySelector('#telecom-psolar-val');
  if (elPso) elPso.textContent = sc_p.toFixed(2);

  var elIrec = container.querySelector('#telecom-irect-val');
  if (elIrec) elIrec.textContent = rect_i.toFixed(1);

  var elTemp = container.querySelector('#telecom-temp-val');
  if (elTemp) elTemp.textContent = amb_temp > 0 ? amb_temp.toFixed(1) : (vbat > 0 ? '--' : '--');

  // 3. Canal 1: Cargador Solar MPPT
  var elSolarI = container.querySelector('#channel-solar-i');
  if (elSolarI) elSolarI.textContent = sc_i.toFixed(1) + ' A';

  var elSolarP = container.querySelector('#channel-solar-p');
  if (elSolarP) elSolarP.textContent = sc_p.toFixed(2) + ' kW';

  var elSolarBar = container.querySelector('#channel-solar-bar');
  if (elSolarBar) {
    var sPct = Math.min(100, Math.max(0, (sc_i / 30.0) * 100)); // Escala hasta 30A
    elSolarBar.style.width = sPct + '%';
  }

  var elSolarV = container.querySelector('#channel-solar-v');
  if (elSolarV) elSolarV.textContent = (sc_v > 0 ? sc_v.toFixed(1) : vbus.toFixed(1)) + ' V';

  var elSolarReg = container.querySelector('#channel-solar-reg');
  if (elSolarReg) {
    elSolarReg.textContent = sc_i > 1.0 ? (vbus > 53.0 ? 'Flotación' : 'Absorción MPPT') : 'Standby (Noche)';
  }

  var elSolarDot = container.querySelector('#solar-dot');
  var elSolarStTxt = container.querySelector('#solar-status-txt');
  if (elSolarDot && elSolarStTxt) {
    if (sc_i > 0.5) {
      elSolarDot.className = 'channel-dot ok';
      elSolarStTxt.className = 'channel-status-lbl ok';
      elSolarStTxt.textContent = 'Generando';
    } else {
      elSolarDot.className = 'channel-dot standby';
      elSolarStTxt.className = 'channel-status-lbl standby';
      elSolarStTxt.textContent = 'Standby';
    }
  }

  // 4. Canal 2: Rectificadores AC/DC (o Batería si Off-Grid)
  var elRectTitle = container.querySelector('#rect-title-txt');
  var elRectDot = container.querySelector('#rect-dot');
  var elRectStTxt = container.querySelector('#rect-status-txt');
  var elRectI = container.querySelector('#channel-rect-i');
  var elRectP = container.querySelector('#channel-rect-p');
  var elRectBar = container.querySelector('#channel-rect-bar');
  var elRectV = container.querySelector('#channel-rect-v');
  var elRectSource = container.querySelector('#channel-source-txt');

  if (hasRect && rect_i > 0.05) {
    if (elRectTitle) elRectTitle.textContent = '⚡ MÓDULOS RECTIFICADORES AC/DC';
    if (elRectI) elRectI.textContent = rect_i.toFixed(1) + ' A';
    if (elRectP) elRectP.textContent = rect_p.toFixed(2) + ' kW';
    if (elRectBar) {
      var rPct = Math.min(100, Math.max(0, (rect_i / 80.0) * 100)); // Escala hasta 80A
      elRectBar.className = 'channel-bar-fill rect';
      elRectBar.style.width = rPct + '%';
    }
    if (elRectV) elRectV.textContent = (rect_v > 0 ? rect_v.toFixed(1) : vbus.toFixed(1)) + ' V';
    if (elRectSource) elRectSource.textContent = grid_avail === 1 ? 'Red Comercial' : 'Generador Diesel';
    if (elRectDot) elRectDot.className = 'channel-dot ok';
    if (elRectStTxt) {
      elRectStTxt.className = 'channel-status-lbl ok';
      elRectStTxt.textContent = 'Suministrando';
    }
  } else if (hasRect) {
    if (elRectTitle) elRectTitle.textContent = '⚡ MÓDULOS RECTIFICADORES AC/DC';
    if (elRectI) elRectI.textContent = '0.0 A';
    if (elRectP) elRectP.textContent = '0.00 kW';
    if (elRectBar) {
      elRectBar.className = 'channel-bar-fill rect';
      elRectBar.style.width = '0%';
    }
    if (elRectV) elRectV.textContent = vbus.toFixed(1) + ' V';
    if (elRectSource) elRectSource.textContent = 'Standby';
    if (elRectDot) elRectDot.className = 'channel-dot standby';
    if (elRectStTxt) {
      elRectStTxt.className = 'channel-status-lbl standby';
      elRectStTxt.textContent = 'Standby';
    }
  } else {
    // Modo Batería DC para sitios Off-Grid sin rectificadores (ej. Palacios)
    if (elRectTitle) elRectTitle.textContent = '🔋 BANCO DE BATERÍAS TELECOM';
    var absIbat = Math.abs(ibat);
    if (elRectI) elRectI.textContent = absIbat.toFixed(1) + ' A';
    if (elRectP) elRectP.textContent = (absIbat * vbus / 1000.0).toFixed(2) + ' kW';
    if (elRectBar) {
      var bPct = Math.min(100, Math.max(0, soc > 0 ? soc : (absIbat / 50.0) * 100));
      elRectBar.className = 'channel-bar-fill battery';
      elRectBar.style.width = bPct + '%';
    }
    if (elRectV) elRectV.textContent = (vbat > 0 ? vbat.toFixed(1) : vbus.toFixed(1)) + ' V';
    if (elRectSource) elRectSource.textContent = soc > 0 ? ('SOC: ' + soc.toFixed(0) + '%') : 'Autónomo';
    if (elRectDot) elRectDot.className = ibat >= 0 ? 'channel-dot ok' : 'channel-dot standby';
    if (elRectStTxt) {
      elRectStTxt.className = 'channel-status-lbl ' + (ibat >= 0 ? 'ok' : 'standby');
      elRectStTxt.textContent = ibat > 0.5 ? 'Cargando' : (ibat < -0.5 ? 'Descargando' : 'Flotación');
    }
  }

  // 5. Pie de Tarjeta
  var elVbatFoot = container.querySelector('#telecom-vbat-footer');
  if (elVbatFoot) elVbatFoot.textContent = vbat > 0 ? '(' + vbat.toFixed(1) + ' V)' : '';

  var elCapTxt = container.querySelector('#telecom-cap-txt');
  if (elCapTxt) elCapTxt.textContent = 'Bus ' + vbus.toFixed(1) + ' V Estabilizado';
};

self.onDestroy = function() {};
