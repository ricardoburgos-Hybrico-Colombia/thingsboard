self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  // Valores por defecto
  var solarKw = 0.0, solarKwh = 0.0;
  var soc = 50.0, bessKw = 0.0, vdc = 750.0, idc = 0.0, estadoBess = 'STANDBY';
  var loadKw = 0.0, loadKwh = 0.0;
  var dgKw = 0.0, dgEstado = 'STANDBY';
  var freqHz = 60.00, vac = 220.0;
  var pcs1 = 0.0, pcs2 = 0.0, pcs3 = 0.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var rawVal = item.data[item.data.length - 1][1];
        var v = parseFloat(rawVal);
        var strV = String(rawVal);
        var k = (item.dataKey.name || item.dataKey.label || '').toLowerCase();

        if (k.indexOf('generacion_solar') !== -1 || k === 'potencia_solar' || k.indexOf('solar_kw') !== -1) solarKw = isNaN(v) ? 0 : v;
        else if (k.indexOf('epv_hoy') !== -1 || k.indexOf('energia_solar_hoy') !== -1) solarKwh = isNaN(v) ? 0 : v;
        else if (k === 'soc_promedio' || k === 'bess_soc' || k === 'soc') soc = isNaN(v) ? 0 : v;
        else if (k.indexOf('potencia_bess') !== -1) bessKw = isNaN(v) ? 0 : v;
        else if (k.indexOf('estado_bess') !== -1) estadoBess = strV.toUpperCase();
        else if (k.indexOf('vbat') !== -1) vdc = isNaN(v) ? 0 : v;
        else if (k.indexOf('ibat_total') !== -1 || k === 'ibat') idc = isNaN(v) ? 0 : v;
        else if (k.indexOf('demanda') !== -1 || k.indexOf('carga_kw') !== -1 || k === 'potencia_demanda') loadKw = isNaN(v) ? 0 : v;
        else if (k.indexOf('eload_hoy') !== -1 || k.indexOf('energia_carga_hoy') !== -1) loadKwh = isNaN(v) ? 0 : v;
        else if (k.indexOf('carga_pcs1') !== -1 || k.indexOf('pac_pcs1') !== -1) pcs1 = Math.abs(isNaN(v) ? 0 : v);
        else if (k.indexOf('carga_pcs2') !== -1 || k.indexOf('pac_pcs2') !== -1) pcs2 = Math.abs(isNaN(v) ? 0 : v);
        else if (k.indexOf('carga_pcs3') !== -1 || k.indexOf('pac_pcs3') !== -1) pcs3 = Math.abs(isNaN(v) ? 0 : v);
        else if (k.indexOf('dg_potencia') !== -1) dgKw = isNaN(v) ? 0 : v;
        else if (k.indexOf('estado_generador') !== -1) dgEstado = strV.toUpperCase();
        else if (k.indexOf('frecuencia') !== -1) freqHz = isNaN(v) ? 60.0 : v;
        else if (k.indexOf('tension_fase') !== -1 || k === 'vacu') {
          vac = v > 180 ? v : Math.round(v * 1.732 * 10) / 10;
        }
      }
    }
  }

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  // Detección estricta de estados operativos:
  // NOTA: "DESCARGANDO" contiene la subcadena "CARG", por lo que se debe evaluar DESC primero.
  var isDischarging = estadoBess.indexOf('DESC') !== -1 || (bessKw < -2.0 && estadoBess.indexOf('CARGANDO') === -1);
  var isCharging = !isDischarging && (estadoBess.indexOf('CARG') !== -1 || bessKw > 2.0);
  var isBessStandby = !isDischarging && !isCharging;

  var isSolarProducing = solarKw > 0.5;
  var isDgRunning = dgKw > 0.5 || dgEstado.indexOf('OPER') !== -1 || dgEstado.indexOf('RUN') !== -1;

  // Potencia de BESS para display
  var pBatDisp = Math.abs(bessKw);
  if (pBatDisp > loadKw * 1.5 && loadKw > 20) {
    pBatDisp = Math.abs(Math.round(((loadKw / 0.96) - solarKw) * 10) / 10);
  }

  // Filtrado Modbus centinela 65535
  if (loadKwh >= 60000) {
    loadKwh = Math.round((loadKwh % 65535) * 10) / 10;
  }

  // ── 1. BADGES DE FLUJO INSTANTÁNEO EN LÍNEA (kW) ──
  // A. Línea Solar
  var elFlowSol = container.querySelector('#flow-val-solar');
  var elFlowBgSol = container.querySelector('#flow-bg-solar');
  if (elFlowSol) {
    elFlowSol.textContent = solarKw.toFixed(1) + ' kW';
    elFlowSol.setAttribute('fill', isSolarProducing ? '#f7d048' : '#64748b');
  }
  if (elFlowBgSol) {
    elFlowBgSol.setAttribute('stroke', isSolarProducing ? '#f7d048' : '#475569');
  }

  // B. Línea BESS
  var elFlowBess = container.querySelector('#flow-val-bess');
  var elFlowBgBess = container.querySelector('#flow-bg-bess');
  if (elFlowBess) {
    var bessPrefix = isCharging ? '▲ ' : (isDischarging ? '▼ ' : '○ ');
    elFlowBess.textContent = bessPrefix + pBatDisp.toFixed(1) + ' kW';
    elFlowBess.setAttribute('fill', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#94a3b8'));
  }
  if (elFlowBgBess) {
    elFlowBgBess.setAttribute('stroke', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#475569'));
  }

  // C. Línea Inversores PCS -> Bus AC
  var elFlowPcs = container.querySelector('#flow-val-pcs');
  if (elFlowPcs) elFlowPcs.textContent = loadKw.toFixed(1) + ' kW';

  // D. Línea Bus AC -> Carga
  var elFlowLoad = container.querySelector('#flow-val-load');
  if (elFlowLoad) elFlowLoad.textContent = loadKw.toFixed(1) + ' kW';

  // E. Línea Diésel DG -> ATS
  var elFlowDg = container.querySelector('#flow-val-dg');
  var elFlowBgDg = container.querySelector('#flow-bg-dg');
  if (elFlowDg) {
    elFlowDg.textContent = dgKw.toFixed(1) + ' kW';
    elFlowDg.setAttribute('fill', isDgRunning ? '#a855f7' : '#94a3b8');
  }
  if (elFlowBgDg) {
    elFlowBgDg.setAttribute('stroke', isDgRunning ? '#a855f7' : '#475569');
  }

  // ── 2. ACTUALIZAR LÍNEAS DE ANIMACIÓN DE FLUJO ──
  var pathSolar = container.querySelector('#path-solar');
  var solarTopline = container.querySelector('#svg-solar-topline');
  if (pathSolar) {
    pathSolar.className.baseVal = 'flow-line ' + (isSolarProducing ? 'flow-solar' : 'flow-solar-standby');
  }
  if (solarTopline) {
    solarTopline.setAttribute('stroke', isSolarProducing ? '#f7d048' : '#64748b');
  }

  var pathBess = container.querySelector('#path-bess');
  var bessTopline = container.querySelector('#svg-bess-topline');
  if (pathBess) {
    var bessClass = isCharging ? 'flow-bess-charging' : (isDischarging ? 'flow-bess-discharging' : 'flow-bess-standby');
    pathBess.className.baseVal = 'flow-line ' + bessClass;
  }
  if (bessTopline) {
    bessTopline.setAttribute('stroke', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#64748b'));
  }

  var pathDg = container.querySelector('#path-dg');
  if (pathDg) {
    pathDg.className.baseVal = 'flow-line ' + (isDgRunning ? 'flow-dg-running' : 'flow-dg-standby');
  }

  // ── 3. ACTUALIZAR TARJETAS DE EQUIPO (ENERGÍA ACUMULADA Y ESTADO) ──
  // Nodo 1: Solar
  var elSolKw = container.querySelector('#svg-solar-kw');
  if (elSolKw) {
    elSolKw.innerHTML = solarKw.toFixed(1) + ' <tspan font-size="13" fill="#94a3b8">kW</tspan>';
    elSolKw.setAttribute('fill', isSolarProducing ? '#f7d048' : '#94a3b8');
  }
  var elSolKwh = container.querySelector('#svg-solar-kwh');
  if (elSolKwh) elSolKwh.textContent = 'Hoy: ' + solarKwh.toFixed(1) + ' kWh';

  var elSolStatus = container.querySelector('#svg-solar-status');
  if (elSolStatus) {
    if (isSolarProducing) {
      elSolStatus.textContent = '● Inyección Activa';
      elSolStatus.setAttribute('fill', '#22c55e');
    } else {
      elSolStatus.textContent = '○ Standby Nocturno';
      elSolStatus.setAttribute('fill', '#64748b');
    }
  }

  // Nodo 2: BESS
  var elSoc = container.querySelector('#svg-bess-soc');
  if (elSoc) elSoc.innerHTML = Math.round(soc) + ' <tspan font-size="13" fill="#94a3b8">% SOC</tspan>';
  var elBessKw = container.querySelector('#svg-bess-kw');
  if (elBessKw) {
    var arrow = isCharging ? '▲' : (isDischarging ? '▼' : '○');
    var text = isCharging ? ' (CARGANDO)' : (isDischarging ? ' (DESCARGANDO)' : ' (STANDBY)');
    elBessKw.textContent = arrow + ' ' + pBatDisp.toFixed(1) + ' kW' + text;
    elBessKw.setAttribute('fill', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#94a3b8'));
  }
  var elBessDc = container.querySelector('#svg-bess-dc');
  if (elBessDc) {
    var idcSign = idc >= 0 ? '+' : '';
    elBessDc.textContent = 'Bus DC: ' + vdc.toFixed(1) + ' V | ' + idcSign + idc.toFixed(1) + ' A';
  }

  // Nodo 3: Inversores PCS
  var setPcs = function(id, val) {
    var e = container.querySelector(id);
    if (e) e.textContent = Math.abs(val).toFixed(1) + ' kW';
  };
  setPcs('#svg-pcs1-kw', pcs1);
  setPcs('#svg-pcs2-kw', pcs2);
  setPcs('#svg-pcs3-kw', pcs3);

  // Nodo 4: Carga
  var elLdKw = container.querySelector('#svg-load-kw');
  if (elLdKw) elLdKw.innerHTML = loadKw.toFixed(1) + ' <tspan font-size="13" fill="#94a3b8">kW</tspan>';
  var elLdKwh = container.querySelector('#svg-load-kwh');
  if (elLdKwh) elLdKwh.textContent = 'Hoy: ' + loadKwh.toFixed(1) + ' kWh';

  // Nodo 5: Diésel y ATS
  var elDgKw = container.querySelector('#svg-dg-kw');
  if (elDgKw) {
    elDgKw.innerHTML = dgKw.toFixed(1) + ' <tspan font-size="13" fill="#94a3b8">kW</tspan>';
    elDgKw.setAttribute('fill', isDgRunning ? '#a855f7' : '#64748b');
  }
  var elAts = container.querySelector('#svg-ats-state');
  var elAtsSw = container.querySelector('#svg-ats-switch');
  var elDgSt = container.querySelector('#svg-dg-status');
  var dgTopline = container.querySelector('#svg-dg-topline');
  if (elAts) {
    elAts.textContent = isDgRunning ? 'ATS: CERRADO (EN CARGA)' : 'ATS: DESCONECTADO';
    elAts.setAttribute('fill', isDgRunning ? '#a855f7' : '#64748b');
  }
  if (elAtsSw) {
    elAtsSw.setAttribute('fill', isDgRunning ? '#a855f7' : '#64748b');
  }
  if (elDgSt) {
    elDgSt.textContent = isDgRunning ? '● EN GENERACIÓN' : '○ STANDBY AUTOMÁTICO';
    elDgSt.setAttribute('fill', isDgRunning ? '#22c55e' : '#94a3b8');
  }
  if (dgTopline) dgTopline.setAttribute('stroke', isDgRunning ? '#a855f7' : '#64748b');

  // Barra Colectora AC
  var elBus = container.querySelector('#svg-bus-telemetry');
  if (elBus) elBus.textContent = vac.toFixed(1) + ' V | ' + freqHz.toFixed(2) + ' Hz';

  // ── 4. BALANCE DE PLANTA EN MICRORRED AUTÓNOMA ──
  var elBal = container.querySelector('#footer-balance-text');
  if (elBal) {
    if (isDgRunning) {
      elBal.textContent = 'RESPALDO DIÉSEL ACTIVO (DG: +' + dgKw.toFixed(1) + ' kW | BESS: ' + pBatDisp.toFixed(1) + ' kW)';
      elBal.style.color = '#a855f7';
    } else if (isSolarProducing && solarKw >= loadKw) {
      var surplus = solarKw - loadKw;
      elBal.textContent = 'SUPERÁVIT SOLAR (+' + surplus.toFixed(1) + ' kW NETO) → BESS EN CARGA';
      elBal.style.color = '#22c55e';
    } else if (isDischarging) {
      elBal.textContent = 'DESCARGA BESS NOCTURNA / STANDBY SOLAR (Carga ' + loadKw.toFixed(1) + ' kW cubierta por BESS: ' + pBatDisp.toFixed(1) + ' kW)';
      elBal.style.color = '#f59e0b';
    } else {
      elBal.textContent = 'MICRORRED EN EQUILIBRIO OPERATIVO (Carga: ' + loadKw.toFixed(1) + ' kW)';
      elBal.style.color = '#64B856';
    }
  }
};

self.onDestroy = function() {};
