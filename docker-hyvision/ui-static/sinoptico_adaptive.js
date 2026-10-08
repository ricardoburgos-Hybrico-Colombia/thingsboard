// Controller Script: SCADA - Sinóptico Animado Microrred Universal con Topología y Distribución Espacial Dinámica
// Soporta 100% Telemetría Real de Stellar (New Sun Road) / HyNet sin solapamientos espaciales.
self.onInit = function() {
  self.onDataUpdated();
};

self.onDataUpdated = function() {
  var data = self.ctx.data;

  // Variables normalizadas
  var solarKw = 0.0, solarKwh = 0.0, scKw = 0.0, invSolKw = 0.0;
  var scVolt = null, scCurr = null;
  var soc = null, bessKw = 0.0, vdc = 0.0, idc = 0.0, estadoBess = 'STANDBY';
  var batNetEnergy = null;
  var loadKw = 0.0, loadKwh = 0.0, loadDcKw = 0.0;
  var ldVolt = null, ldCurr = null;
  var dgKw = 0.0, dgEstado = 'STANDBY', dgHours = 0.0, dgKwh = 0.0;
  var gridKw = 0.0, gridV = null, gridHz = null, gridKwh = 0.0, gridAvail = 0;
  var rectKw = 0.0, rectV = 0.0, rectI = 0.0, rectKwh = 0.0;
  var freqHz = null, vac = null;
  var pcs1 = 0.0, pcs2 = 0.0, pcs3 = 0.0;
  var hasPcsData = false;
  var ambientTemp = null, tempBat = null, solarFraction = null, netBalance = null;
  var siteTopology = '';

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var rawVal = item.data[item.data.length - 1][1];
        var v = parseFloat(rawVal);
        var strV = String(rawVal);
        var k = (item.dataKey.name || item.dataKey.label || '').toLowerCase();

        // 1. Solar
        if (k.indexOf('solar_charger_power') !== -1) { if (!isNaN(v)) scKw = v; }
        else if (k.indexOf('solar_inverter_power') !== -1) { if (!isNaN(v)) invSolKw = v; }
        else if (k === 'solar_power_kw' || k === 'generacion_solar_kw' || k === 'potencia_solar') {
          if (!isNaN(v)) solarKw = v;
        }
        else if (k.indexOf('epv_hoy') !== -1 || k.indexOf('solar_energy') !== -1) {
          if (!isNaN(v)) solarKwh = v;
        }
        else if (k === 'solar_charger_voltage') {
          if (!isNaN(v) && v > 0) scVolt = v;
        }
        else if (k === 'solar_charger_current') {
          if (!isNaN(v)) scCurr = v;
        }
        // 2. Batería (BESS)
        else if (k === 'battery_soc' || k === 'soc_promedio' || k === 'bess_soc') {
          if (!isNaN(v)) soc = v;
        }
        else if (k === 'battery_voltage' || k === 'vbat_promedio') {
          if (!isNaN(v) && v > 0) vdc = v;
        }
        else if (k === 'battery_current' || k === 'ibat_total' || k === 'ibat') {
          if (!isNaN(v)) idc = v;
        }
        else if (k === 'battery_power_kw' || k === 'potencia_bess_kw') {
          if (!isNaN(v)) bessKw = v;
        }
        else if (k.indexOf('estado_bess') !== -1) {
          estadoBess = strV.toUpperCase();
        }
        else if (k === 'temp_bateria_max' || k.indexOf('temp_bateria') !== -1 || k === 'battery_temperature') {
          if (!isNaN(v)) tempBat = v;
        }
        else if (k.indexOf('net_energy') !== -1 || k === 'battery_net_energy_kwh') {
          if (!isNaN(v)) batNetEnergy = v;
        }
        else if (k === 'ambient_temperature') {
          if (!isNaN(v)) ambientTemp = v;
        }
        // 3. Rectificador
        else if (k === 'rectifier_voltage') { if (!isNaN(v) && v > 0) rectV = v; }
        else if (k === 'rectifier_power_kw') { if (!isNaN(v)) rectKw = v; }
        else if (k === 'rectifier_current') { if (!isNaN(v)) rectI = v; }
        else if (k === 'rectifier_energy_kwh') { if (!isNaN(v)) rectKwh = v; }
        // 4. Cargas
        else if (k === 'load_dc_power_kw') { if (!isNaN(v)) loadDcKw = v; }
        else if (k === 'load_power_kw' || k === 'demanda_carga_kw' || k === 'carga_kw') {
          if (!isNaN(v)) loadKw = v;
        }
        else if (k.indexOf('eload_hoy') !== -1 || k.indexOf('load_energy') !== -1) {
          if (!isNaN(v)) loadKwh = v;
        }
        else if (k === 'load_dc_voltage') {
          if (!isNaN(v) && v > 0) ldVolt = v;
        }
        else if (k === 'load_dc_current') {
          if (!isNaN(v)) ldCurr = v;
        }
        // 5. Inversores PCS (Industrial GAORI)
        else if (k.indexOf('carga_pcs1') !== -1 || k.indexOf('pac_pcs1') !== -1) {
          if (!isNaN(v) && v > 0.05) { pcs1 = v; hasPcsData = true; }
        }
        else if (k.indexOf('carga_pcs2') !== -1 || k.indexOf('pac_pcs2') !== -1) {
          if (!isNaN(v) && v > 0.05) { pcs2 = v; hasPcsData = true; }
        }
        else if (k.indexOf('carga_pcs3') !== -1 || k.indexOf('pac_pcs3') !== -1) {
          if (!isNaN(v) && v > 0.05) { pcs3 = v; hasPcsData = true; }
        }
        // 6. Generador Diésel
        else if (k.indexOf('generator_power') !== -1 || k.indexOf('dg_potencia') !== -1) {
          if (!isNaN(v)) dgKw = v;
        }
        else if (k.indexOf('generator_runtime') !== -1) {
          if (!isNaN(v)) dgHours = v;
        }
        else if (k.indexOf('generator_energy') !== -1) {
          if (!isNaN(v)) dgKwh = v;
        }
        else if (k.indexOf('estado_generador') !== -1) {
          dgEstado = strV.toUpperCase();
        }
        // 7. Red Comercial
        else if (k.indexOf('grid_power') !== -1) { if (!isNaN(v)) gridKw = v; }
        else if (k.indexOf('grid_energy') !== -1) { if (!isNaN(v)) gridKwh = v; }
        else if (k.indexOf('grid_available') !== -1) { if (!isNaN(v)) gridAvail = Math.round(v); }
        else if (k.indexOf('grid_voltage') !== -1) { if (!isNaN(v) && v > 50 && v < 500) gridV = v; }
        else if (k.indexOf('grid_frequency') !== -1 || k.indexOf('frecuencia_red') !== -1) {
          if (!isNaN(v) && v > 40 && v < 70) gridHz = v;
        }
        else if (k.indexOf('frecuencia') !== -1) { if (!isNaN(v) && v > 40 && v < 70) freqHz = v; }
        else if (k.indexOf('tension_fase') !== -1 || k === 'vacu') {
          if (!isNaN(v) && v > 80) vac = v > 180 ? v : Math.round(v * 1.732 * 10) / 10;
        }
        // 8. KPIs adicionales y Topología
        else if (k === 'solar_fraction_pct') { if (!isNaN(v)) solarFraction = v; }
        else if (k === 'net_balance_kw') { if (!isNaN(v)) netBalance = v; }
        else if (k === 'site_topology' || k === 'topologia') { siteTopology = strV.toUpperCase(); }
      }
    }
  }

  // Consolidaciones y adaptaciones de telemetría
  if (solarKw === 0 && (scKw > 0 || invSolKw > 0)) {
    solarKw = scKw + invSolKw;
  }
  if (scKw === 0 && solarKw > 0 && invSolKw === 0) {
    scKw = solarKw;
  }
  if (vdc === 0 && rectV > 0) {
    vdc = rectV;
  }
  if (rectV === 0 && vdc > 40 && vdc < 65) {
    rectV = vdc;
  }
  if (gridV === null && vac !== null && vac > 80) {
    gridV = vac;
  }
  if (vac === null && gridV !== null && gridV > 80) {
    vac = gridV;
  }
  if (gridHz === null && freqHz !== null) {
    gridHz = freqHz;
  }
  if (freqHz === null && gridHz !== null) {
    freqHz = gridHz;
  }

  // DETECCIÓN ESTRICTA DE MODO OPERATIVO
  var isIndustrial = (vdc > 200.0) && hasPcsData;
  if (vdc > 0 && vdc < 100.0) {
    isIndustrial = false; // Imposible ser industrial con bus telecom 48V
  }
  if (vdc === 0) {
    vdc = isIndustrial ? 768.5 : 51.1;
  }

  // Telemetría externa y estados de operación (Inyección activa real > 0.05 kW)
  var isSolarProducing = solarKw > 0.05;
  var isDgRunning = (dgKw > 0.05) || (dgEstado && (dgEstado.indexOf('OPER') !== -1 || dgEstado.indexOf('RUN') !== -1 || dgEstado.indexOf('MARCHA') !== -1) && dgKw > 0.05);
  var isGridActive = (gridKw > 0.05);
  var siteHasGrid = (gridKw > 0.05) || (gridKwh > 0.5) || (gridV !== null && gridV > 50.0);
  var hasDgInstalled = (dgHours > 10.0) || (dgKw > 0.05) || (dgKwh > 0.5) || (dgEstado && dgEstado !== 'APAGADO' && dgEstado !== 'STANDBY');

  // Clasificación de Topología Estricta
  var topologyMode = 'FULL_SOLAR';
  if (isIndustrial) {
    topologyMode = 'INDUSTRIAL';
  } else if (siteTopology.indexOf('OFF_GRID_100') !== -1 || siteTopology.indexOf('FULL_SOLAR') !== -1) {
    topologyMode = 'FULL_SOLAR';
    siteHasGrid = false;
    isGridActive = false;
    hasDgInstalled = false;
    isDgRunning = false;
  } else if (siteTopology.indexOf('OFF_GRID_DG') !== -1) {
    topologyMode = 'DG_SOLAR';
    siteHasGrid = false;
    isGridActive = false;
  } else if (siteTopology.indexOf('ON_GRID') !== -1) {
    topologyMode = 'GRID_ONLY';
    hasDgInstalled = false;
    isDgRunning = false;
  } else if (siteTopology.indexOf('HIBRIDO') !== -1) {
    topologyMode = 'HYBRID';
  } else if (siteHasGrid && hasDgInstalled) {
    topologyMode = 'HYBRID';
  } else if (siteHasGrid && !hasDgInstalled) {
    topologyMode = 'GRID_ONLY';
  } else if (!siteHasGrid && hasDgInstalled) {
    topologyMode = 'DG_SOLAR';
  } else {
    topologyMode = 'FULL_SOLAR';
    siteHasGrid = false;
    isGridActive = false;
    hasDgInstalled = false;
    isDgRunning = false;
  }

  // Cálculos de batería
  var isDischarging = estadoBess.indexOf('DESC') !== -1 || idc < -0.5 || (bessKw < -0.2);
  var isCharging = !isDischarging && (estadoBess.indexOf('CARG') !== -1 || idc > 0.5 || bessKw > 0.2);
  var pBatDisp = Math.abs(bessKw);
  if (pBatDisp === 0 && idc !== 0 && vdc > 0) {
    pBatDisp = Math.abs(Math.round((vdc * idc) / 100) / 10);
  }

  // Sanitización de fiabilidad física: Cargas, solar, rectificador y red son no-negativos
  loadKw = Math.max(0, loadKw);
  loadDcKw = Math.max(0, loadDcKw);
  solarKw = Math.max(0, solarKw);
  scKw = Math.max(0, scKw);
  gridKw = Math.max(0, gridKw);
  dgKw = Math.max(0, dgKw);
  rectKw = Math.max(0, rectKw);
  loadKwh = Math.max(0, loadKwh);
  solarKwh = Math.max(0, solarKwh);
  gridKwh = Math.max(0, gridKwh);

  // Corriente de carga BTS estimada/real (I = P / V)
  var loadAmps = vdc > 0 ? (loadKw * 1000 / vdc).toFixed(1) : '0.0';
  var expectedRectAmps = (vdc > 0 && rectKw > 0) ? (rectKw * 1000 / vdc) : 0;
  var rectAmps = '0.0';
  if (rectI > 0 && expectedRectAmps > 0 && rectI <= expectedRectAmps * 1.35) {
    rectAmps = Math.max(0, rectI).toFixed(1);
  } else if (expectedRectAmps > 0) {
    rectAmps = expectedRectAmps.toFixed(1);
  } else if (rectI > 0) {
    rectAmps = Math.max(0, rectI).toFixed(1);
  }

  // Filtrado Modbus 65535
  if (loadKwh >= 60000) loadKwh = Math.round((loadKwh % 65535) * 100) / 100;
  if (solarKwh >= 60000) solarKwh = Math.round((solarKwh % 65535) * 100) / 100;
  if (gridKwh >= 60000) gridKwh = Math.round((gridKwh % 65535) * 100) / 100;

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  // ── 1. HEADER Y BADGES GENERALES ──
  var elTitle = container.querySelector('.scada-title');
  var elSub = container.querySelector('.scada-subtitle');
  var elMode = container.querySelector('#scada-mode-badge');

  if (topologyMode === 'INDUSTRIAL') {
    if (elTitle) elTitle.textContent = 'DIAGRAMA UNIFILAR SINÓPTICO DE PLANTA';
    if (elSub) elSub.textContent = 'BESS Industrial 750V Alta Tensión: 3 × PCS250 (750 kVA) + Batería LFP + Carga Crítica';
    if (elMode) {
      elMode.textContent = 'BESS UTILITY (750V DC)';
      elMode.className = 'scada-badge ongrid';
    }
  } else if (topologyMode === 'FULL_SOLAR') {
    if (elTitle) elTitle.textContent = 'DIAGRAMA UNIFILAR SINÓPTICO DE MICRORRED';
    if (elSub) elSub.textContent = 'Topología 100% Solar Autónoma: MPPT Solar + Banco Baterías 48V + Bus DC + BTS Telecom';
    if (elMode) {
      elMode.textContent = '100% SOLAR AUTÓNOMO (OFF-GRID)';
      elMode.className = 'scada-badge offgrid';
    }
  } else if (topologyMode === 'GRID_ONLY') {
    if (elTitle) elTitle.textContent = 'DIAGRAMA UNIFILAR SINÓPTICO DE SITIO';
    if (elSub) elSub.textContent = 'Red Comercial + Banco Rectificadores 48V + Flotación DC + Cargas Telecom';
    if (elMode) {
      elMode.textContent = isGridActive ? 'RED COMERCIAL ACTIVA (ON-GRID)' : 'CORTE DE RED COMERCIAL';
      elMode.className = 'scada-badge ' + (isGridActive ? 'ongrid' : 'offgrid');
    }
  } else if (topologyMode === 'DG_SOLAR') {
    if (elTitle) elTitle.textContent = 'DIAGRAMA UNIFILAR SOLAR + GENERADOR';
    if (elSub) elSub.textContent = 'Microrred Autónoma Off-Grid: Generación Solar + Batería 48V + Respaldo Motogenerador';
    if (elMode) {
      if (isDgRunning) {
        elMode.textContent = 'RESPALDO DIÉSEL (MG ACTIVO)';
        elMode.className = 'scada-badge dg';
      } else {
        elMode.textContent = 'AUTÓNOMO SOLAR + BESS (MG EN STANDBY)';
        elMode.className = 'scada-badge offgrid';
      }
    }
  } else {
    // HYBRID
    if (elTitle) elTitle.textContent = 'DIAGRAMA UNIFILAR SINÓPTICO HÍBRIDO';
    if (elSub) {
      var hDesc = 'Microrred Híbrida: Solar Dual + Batería 48V + Red Comercial + Respaldo MG + ATS';
      elSub.textContent = hDesc;
    }
    if (elMode) {
      if (isDgRunning) {
        elMode.textContent = 'RESPALDO DIÉSEL (MG ACTIVO)';
        elMode.className = 'scada-badge dg';
      } else if (isGridActive) {
        elMode.textContent = 'RED COMERCIAL ACTIVA (ON-GRID)';
        elMode.className = 'scada-badge ongrid';
      } else {
        elMode.textContent = 'MICRORRED EN ISLA (SOLAR+BESS)';
        elMode.className = 'scada-badge offgrid';
      }
    }
  }

  // ── 2. MOTOR DE MAQUETACIÓN ESPACIAL SVG DINÁMICO (CERO SOLAPAMIENTOS) ──
  var nSolar = container.querySelector('#node-solar');
  var nBess = container.querySelector('#node-bess');
  var nPcs = container.querySelector('#node-pcs');
  var nBusGroup = container.querySelector('#node-busbar-group');
  var nLoad = container.querySelector('#node-load');
  var nDg = container.querySelector('#node-dg');
  var nAts = container.querySelector('#node-ats');

  var pSolar = container.querySelector('#path-solar');
  var pBess = container.querySelector('#path-bess');
  var pPcs = container.querySelector('#path-pcs-bus');
  var pLoad = container.querySelector('#path-load');
  var pDg = container.querySelector('#path-dg');

  var bSolar = container.querySelector('#badge-solar');
  var bBess = container.querySelector('#badge-bess');
  var bPcs = container.querySelector('#badge-pcs');
  var bLoad = container.querySelector('#badge-load');
  var bDg = container.querySelector('#badge-dg');

  var busLine = container.querySelector('#svg-busbar-line');
  var busTitle = container.querySelector('#svg-busbar-title');
  var busTel = container.querySelector('#svg-bus-telemetry');

  // SOLAR siempre en Cuadrante Superior Izquierdo (25, 45)
  if (nSolar) {
    nSolar.style.display = 'inline';
    nSolar.setAttribute('transform', 'translate(25, 45)');
  }
  // BESS siempre en Cuadrante Inferior Izquierdo (25, 305)
  if (nBess) {
    nBess.style.display = 'inline';
    nBess.setAttribute('transform', 'translate(25, 305)');
  }
  // RECTIFICADOR / PCS siempre en Centro (385, 155)
  if (nPcs) {
    nPcs.style.display = 'inline';
    nPcs.setAttribute('transform', 'translate(385, 155)');
  }

  // Barra Colectora siempre en x=645
  if (busLine) {
    busLine.setAttribute('x1', '645');
    busLine.setAttribute('y1', '75');
    busLine.setAttribute('x2', '645');
    busLine.setAttribute('y2', '410');
  }
  if (busTitle) {
    busTitle.setAttribute('x', '645');
    busTitle.setAttribute('y', '48');
    busTitle.textContent = isIndustrial ? 'BARRA COLECTORA AC' : 'BARRA COLECTORA DC';
  }
  if (busTel) {
    busTel.setAttribute('x', '645');
    busTel.setAttribute('y', '64');
    var dispVac = (vac !== null && !isNaN(vac)) ? vac : ((gridV !== null && !isNaN(gridV)) ? gridV : 480.0);
    var dispHz = (freqHz !== null && !isNaN(freqHz)) ? freqHz : ((gridHz !== null && !isNaN(gridHz)) ? gridHz : 60.0);
    var dispVdc = (vdc !== null && !isNaN(vdc) && vdc > 0) ? vdc : 54.0;
    busTel.textContent = isIndustrial 
      ? (dispVac.toFixed(1) + ' V | ' + dispHz.toFixed(2) + ' Hz') 
      : (dispVdc.toFixed(1) + ' V DC | Bus -48V');
  }

  // Rutas Solar y BESS al centro
  if (pSolar) {
    pSolar.style.display = 'inline';
    pSolar.setAttribute('d', 'M 205 105 L 305 105 L 305 205 L 385 205');
  }
  if (bSolar) {
    bSolar.style.display = 'inline';
    bSolar.setAttribute('transform', 'translate(255, 105)');
  }

  if (pBess) {
    pBess.style.display = 'inline';
    pBess.setAttribute('d', 'M 205 365 L 305 365 L 305 265 L 385 265');
  }
  if (bBess) {
    bBess.style.display = 'inline';
    bBess.setAttribute('transform', 'translate(255, 365)');
  }

  if (pPcs) {
    pPcs.style.display = 'inline';
    pPcs.setAttribute('d', 'M 555 235 L 645 235');
  }
  if (bPcs) {
    bPcs.style.display = 'inline';
    bPcs.setAttribute('transform', 'translate(600, 235)');
  }

  if (topologyMode === 'FULL_SOLAR') {
    // ── FULL SOLAR: Sin fuente externa, Carga centrada en la derecha ──
    if (nDg) nDg.style.display = 'none';
    if (nAts) nAts.style.display = 'none';
    if (pDg) pDg.style.display = 'none';
    if (bDg) bDg.style.display = 'none';

    if (nLoad) {
      nLoad.style.display = 'inline';
      nLoad.setAttribute('transform', 'translate(775, 175)');
    }
    if (pLoad) {
      pLoad.style.display = 'inline';
      pLoad.setAttribute('d', 'M 645 235 L 775 235');
    }
    if (bLoad) {
      bLoad.style.display = 'inline';
      bLoad.setAttribute('transform', 'translate(710, 235)');
    }
  } else {
    // ── HÍBRIDO / RED / DG / INDUSTRIAL: Carga arriba-derecha, Fuente Externa abajo-derecha ──
    if (nLoad) {
      nLoad.style.display = 'inline';
      nLoad.setAttribute('transform', 'translate(775, 45)');
    }
    if (pLoad) {
      pLoad.style.display = 'inline';
      pLoad.setAttribute('d', 'M 645 105 L 775 105');
    }
    if (bLoad) {
      bLoad.style.display = 'inline';
      bLoad.setAttribute('transform', 'translate(710, 105)');
    }

    if (nDg) {
      nDg.style.display = 'inline';
      nDg.setAttribute('transform', 'translate(775, 305)');
    }
    if (nAts) {
      nAts.style.display = 'inline';
      nAts.setAttribute('transform', 'translate(685, 355)');
    }
    if (pDg) {
      pDg.style.display = 'inline';
      pDg.setAttribute('d', 'M 775 365 L 710 365 L 710 285 L 645 285');
    }
    if (bDg) {
      bDg.style.display = 'inline';
      bDg.setAttribute('transform', 'translate(710, 325)');
    }
  }

  // ── 3. ACTUALIZACIÓN DE TELEMETRÍA EN NODOS ──
  // A. Solar (Top-Left)
  var elFlowSol = container.querySelector('#flow-val-solar');
  var elFlowBgSol = container.querySelector('#flow-bg-solar');
  if (elFlowSol) {
    elFlowSol.textContent = solarKw.toFixed(2) + ' kW';
    elFlowSol.setAttribute('fill', isSolarProducing ? '#f7d048' : '#64748b');
  }
  if (elFlowBgSol) elFlowBgSol.setAttribute('stroke', isSolarProducing ? '#f7d048' : '#475569');

  var elSolKw = container.querySelector('#svg-solar-kw');
  if (elSolKw) {
    elSolKw.innerHTML = solarKw.toFixed(2) + ' <tspan font-size="13" fill="#94a3b8">kW</tspan>';
    elSolKw.setAttribute('fill', isSolarProducing ? '#f7d048' : '#94a3b8');
  }
  var elSolKwh = container.querySelector('#svg-solar-kwh');
  if (elSolKwh) elSolKwh.textContent = 'Hoy: ' + solarKwh.toFixed(1) + ' kWh';

  var elSolV = container.querySelector('#svg-solar-v');
  if (elSolV) {
    if (scVolt !== null && scVolt > 0) {
      elSolV.textContent = 'Cargador: ' + scVolt.toFixed(1) + ' V' + (scCurr !== null ? (' | ' + Math.max(0, scCurr).toFixed(1) + ' A') : '');
    } else {
      var vMppt = rectV > 0 ? rectV : (vdc > 0 ? vdc : 50.0);
      elSolV.textContent = 'MPPT: ' + vMppt.toFixed(1) + ' V';
    }
  }

  var elSolSt = container.querySelector('#svg-solar-status');
  if (elSolSt) {
    if (isSolarProducing) {
      if (!isIndustrial && invSolKw > 0 && scKw > 0) {
        elSolSt.textContent = '● DUAL SOLAR (DC+AC)';
      } else {
        elSolSt.textContent = isIndustrial ? '● Inyección Activa' : '● MPPT SOLAR ACTIVO';
      }
      elSolSt.setAttribute('fill', '#22c55e');
    } else {
      elSolSt.textContent = '○ Standby Solar';
      elSolSt.setAttribute('fill', '#64748b');
    }
  }

  // B. Batería (Bottom-Left)
  var elFlowBess = container.querySelector('#flow-val-bess');
  var elFlowBgBess = container.querySelector('#flow-bg-bess');
  if (elFlowBess) {
    var bessPrefix = isCharging ? '▲ ' : (isDischarging ? '▼ ' : '○ ');
    elFlowBess.textContent = bessPrefix + pBatDisp.toFixed(2) + ' kW';
    elFlowBess.setAttribute('fill', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#94a3b8'));
  }
  if (elFlowBgBess) elFlowBgBess.setAttribute('stroke', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#475569'));

  var elBessHeader = container.querySelector('#svg-bess-header');
  if (elBessHeader) {
    elBessHeader.textContent = isIndustrial ? '🔋 ALMACENAMIENTO BESS' : (soc !== null ? '🔋 BANCO BATERÍAS 48V' : '🔋 BUS DC FLOTACIÓN');
  }
  var elSoc = container.querySelector('#svg-bess-soc');
  if (elSoc) {
    if (soc !== null) {
      elSoc.innerHTML = Math.round(soc) + ' <tspan font-size="13" fill="#94a3b8">% SOC</tspan>';
    } else {
      elSoc.innerHTML = vdc.toFixed(1) + ' <tspan font-size="13" fill="#94a3b8">V DC</tspan>';
    }
  }
  var elBessKw = container.querySelector('#svg-bess-kw');
  if (elBessKw) {
    if (soc !== null) {
      var arrow = isCharging ? '▲' : (isDischarging ? '▼' : '○');
      var tBat = isCharging ? ' (CARGANDO)' : (isDischarging ? ' (DESCARGANDO)' : ' (STANDBY)');
      elBessKw.textContent = arrow + ' ' + pBatDisp.toFixed(2) + ' kW' + tBat;
      elBessKw.setAttribute('fill', isCharging ? '#64B856' : (isDischarging ? '#f59e0b' : '#94a3b8'));
    } else {
      elBessKw.textContent = '● MODO FLOTACIÓN (' + vdc.toFixed(1) + 'V)';
      elBessKw.setAttribute('fill', '#64B856');
    }
  }
  var elBessDc = container.querySelector('#svg-bess-dc');
  if (elBessDc) {
    var sIdc = idc >= 0 ? '+' : '';
    elBessDc.textContent = 'Banco: ' + vdc.toFixed(1) + ' V | ' + (idc !== 0 ? (sIdc + idc.toFixed(1) + ' A') : '0.0 A');
  }
  var elBessTemp = container.querySelector('#svg-bess-temp');
  if (elBessTemp) {
    var tReal = tempBat !== null ? tempBat : (ambientTemp !== null ? ambientTemp : 28.0);
    var strTemp = 'Temp: ' + tReal.toFixed(0) + ' °C';
    if (batNetEnergy !== null && batNetEnergy > 0) {
      strTemp += ' | Neta: ' + batNetEnergy.toFixed(1) + ' kWh';
    }
    elBessTemp.textContent = strTemp;
  }

  // C. Conversión / Rectificador / MPPT (Center)
  var elPcsHeader = container.querySelector('#svg-pcs-header');
  var elPcsSubTag = container.querySelector('#svg-pcs-subtag');
  var elPcs1 = container.querySelector('#svg-pcs1-row');
  var elPcs2 = container.querySelector('#svg-pcs2-row');
  var elPcs3 = container.querySelector('#svg-pcs3-row');
  var elPcsStatus = container.querySelector('#svg-pcs-status');
  var elFlowPcs = container.querySelector('#flow-val-pcs');

  if (isIndustrial) {
    if (elPcsHeader) elPcsHeader.textContent = '⚡ INVERSORES PCS';
    if (elPcsSubTag) elPcsSubTag.textContent = '3 × PCS250 (750 kVA)';
    if (elPcs1) elPcs1.innerHTML = 'PCS-1: <tspan fill="#38bdf8" font-weight="700">' + pcs1.toFixed(1) + ' kW</tspan>';
    if (elPcs2) elPcs2.innerHTML = 'PCS-2: <tspan fill="#38bdf8" font-weight="700">' + pcs2.toFixed(1) + ' kW</tspan>';
    if (elPcs3) elPcs3.innerHTML = 'PCS-3: <tspan fill="#38bdf8" font-weight="700">' + pcs3.toFixed(1) + ' kW</tspan>';
    if (elPcsStatus) elPcsStatus.textContent = '● 3/3 SINCRONIZADOS';
    if (elFlowPcs) elFlowPcs.textContent = loadKw.toFixed(1) + ' kW';
  } else {
    if (elPcsHeader) elPcsHeader.textContent = '⚡ RECTIFICADOR & MPPT';
    if (elPcsSubTag) elPcsSubTag.textContent = 'CONVERSIÓN 48V DC';
    if (elPcs1) elPcs1.innerHTML = 'MPPT Solar: <tspan fill="#f7d048" font-weight="700">' + scKw.toFixed(2) + ' kW</tspan>';
    var pRectShow = rectKw > 0 ? rectKw : (gridKw > 0 ? (gridKw * 0.95) : 0.0);
    if (elPcs2) elPcs2.innerHTML = 'Rectificador: <tspan fill="#38bdf8" font-weight="700">' + pRectShow.toFixed(2) + ' kW (' + rectAmps + 'A)</tspan>';
    if (elPcs3) elPcs3.innerHTML = 'Tensión Salida: <tspan fill="#64B856" font-weight="700">' + vdc.toFixed(1) + ' V</tspan>';
    if (elPcsStatus) {
      if (rectKw > 0.05) {
        elPcsStatus.textContent = '● RECTIFICADOR ACTIVO';
        elPcsStatus.setAttribute('fill', '#38bdf8');
      } else if (scKw > 0.05) {
        elPcsStatus.textContent = '● MPPT EN CONVERSIÓN';
        elPcsStatus.setAttribute('fill', '#22c55e');
      } else {
        elPcsStatus.textContent = '○ BUS DC ESTABILIZADO';
        elPcsStatus.setAttribute('fill', '#64748b');
      }
    }
    if (elFlowPcs) elFlowPcs.textContent = (loadKw > 0 ? loadKw : (solarKw + pRectShow)).toFixed(2) + ' kW';
  }

  // D. Carga Telecom BTS (Top-Right o Centrada)
  var elLdHeader = container.querySelector('#svg-load-header');
  if (elLdHeader) elLdHeader.textContent = isIndustrial ? '🏭 DEMANDA DE CARGA' : '📡 CARGAS TELECOM BTS';
  var elLdKw = container.querySelector('#svg-load-kw');
  if (elLdKw) elLdKw.innerHTML = loadKw.toFixed(2) + ' <tspan font-size="13" fill="#94a3b8">kW</tspan>';
  var elLdKwh = container.querySelector('#svg-load-kwh');
  if (elLdKwh) elLdKwh.textContent = 'Hoy: ' + loadKwh.toFixed(1) + ' kWh';
  var elLdTel = container.querySelector('#svg-load-telemetry');
  if (elLdTel) {
    if (ldVolt !== null && ldCurr !== null) {
      elLdTel.textContent = 'Tensión: ' + ldVolt.toFixed(1) + ' V | ' + Math.max(0, ldCurr).toFixed(1) + ' A';
    } else {
      elLdTel.textContent = 'DC: ' + vdc.toFixed(1) + ' V | ' + loadAmps + ' A';
    }
  }
  var elLdSub = container.querySelector('#svg-load-sub');
  if (elLdSub) {
    elLdSub.textContent = isIndustrial ? 'Carga Crítica Industrial' : (loadDcKw > 0 ? ('DC BTS: ' + loadDcKw.toFixed(2) + ' kW | 48V') : 'Estación Base BTS 48V');
  }
  var elFlowLoad = container.querySelector('#flow-val-load');
  if (elFlowLoad) elFlowLoad.textContent = loadKw.toFixed(2) + ' kW';

  // E. Fuente Externa Red / Diésel (Bottom-Right)
  if (nDg && nDg.style.display !== 'none') {
    var elDgHeader = container.querySelector('#svg-dg-header');
    if (elDgHeader) {
      if (isIndustrial || (siteHasGrid && hasDgInstalled)) {
        elDgHeader.textContent = '🌐 RED & GENERADOR';
      } else if (siteHasGrid) {
        elDgHeader.textContent = '🌐 RED COMERCIAL';
      } else {
        elDgHeader.textContent = '⚡ GRUPO ELECTRÓGENO';
      }
    }

    var elDgKw = container.querySelector('#svg-dg-kw');
    var pExt = gridKw > 0.05 ? gridKw : (dgKw > 0.05 ? dgKw : 0.0);
    if (elDgKw) {
      elDgKw.innerHTML = pExt.toFixed(2) + ' <tspan font-size="13" fill="#94a3b8">kW</tspan>';
      elDgKw.setAttribute('fill', isDgRunning ? '#a855f7' : (isGridActive ? '#38bdf8' : '#94a3b8'));
    }

    var elDgEn = container.querySelector('#svg-dg-energy');
    if (elDgEn) {
      var eExt = gridKwh > 0 ? gridKwh : dgKwh;
      elDgEn.textContent = 'Hoy: ' + eExt.toFixed(2) + ' kWh';
    }

    var elAts = container.querySelector('#svg-ats-state');
    if (elAts) {
      if (isDgRunning) {
        elAts.textContent = 'ATS: CONECTADO A DIÉSEL';
        elAts.setAttribute('fill', '#a855f7');
      } else if (isGridActive) {
        elAts.textContent = 'ATS: CONECTADO A RED';
        elAts.setAttribute('fill', '#38bdf8');
      } else {
        elAts.textContent = 'ATS: EN ESPERA (STANDBY)';
        elAts.setAttribute('fill', '#64748b');
      }
    }

    var elDgSt = container.querySelector('#svg-dg-status');
    if (elDgSt) {
      if (isDgRunning) {
        elDgSt.textContent = '● DIÉSEL EN MARCHA (' + dgKw.toFixed(2) + ' kW)';
        elDgSt.setAttribute('fill', '#a855f7');
      } else if (isGridActive) {
        var strGV = (gridV !== null && gridV > 0) ? gridV.toFixed(0) : '220';
        var strGH = (gridHz !== null && gridHz > 0) ? gridHz.toFixed(1) : '60.0';
        elDgSt.textContent = '● RED: ' + strGV + ' V | ' + strGH + ' Hz';
        elDgSt.setAttribute('fill', '#38bdf8');
      } else if (gridV !== null && gridV > 50.0) {
        var strGV = gridV.toFixed(0);
        var strGH = (gridHz !== null && gridHz > 0) ? gridHz.toFixed(1) : '60.0';
        elDgSt.textContent = '○ RED EN ESPERA (' + strGV + ' V | ' + strGH + ' Hz)';
        elDgSt.setAttribute('fill', '#64748b');
      } else if (topologyMode === 'GRID_ONLY') {
        elDgSt.textContent = '○ RED DESCONECTADA';
        elDgSt.setAttribute('fill', '#64748b');
      } else {
        elDgSt.textContent = '○ STANDBY AUTOMÁTICO';
        elDgSt.setAttribute('fill', '#64748b');
      }
    }

    var elFlowDg = container.querySelector('#flow-val-dg');
    var elFlowBgDg = container.querySelector('#flow-bg-dg');
    if (elFlowDg) {
      elFlowDg.textContent = pExt.toFixed(2) + ' kW';
      elFlowDg.setAttribute('fill', isDgRunning ? '#a855f7' : (isGridActive ? '#38bdf8' : '#94a3b8'));
    }
    if (elFlowBgDg) {
      elFlowBgDg.setAttribute('stroke', isDgRunning ? '#a855f7' : (isGridActive ? '#38bdf8' : '#475569'));
    }
  }

  // ── 4. CLASES DE ANIMACIÓN EN TIEMPO REAL ──
  if (pSolar) pSolar.className.baseVal = 'flow-line ' + (isSolarProducing ? 'flow-solar' : 'flow-solar-standby');
  if (pBess) {
    var clBess = isCharging ? 'flow-bess-charging' : (isDischarging ? 'flow-bess-discharging' : 'flow-bess-standby');
    pBess.className.baseVal = 'flow-line ' + clBess;
  }
  if (pDg) {
    var clDg = isDgRunning ? 'flow-dg-running' : (isGridActive ? 'flow-grid' : 'flow-dg-standby');
    pDg.className.baseVal = 'flow-line ' + clDg;
  }

  // ── 5. BALANCE DE PLANTA EN FOOTER ──
  var elBal = container.querySelector('#footer-balance-text');
  var elDisp = container.querySelector('#footer-dispatch-text');
  if (elBal) {
    var autoPct = solarFraction !== null ? solarFraction.toFixed(1) : (loadKw > 0 ? Math.min(100, Math.round((solarKw / loadKw) * 100)) : 100);
    if (isIndustrial) {
      if (isDgRunning) {
        elBal.textContent = 'RESPALDO DIÉSEL ACTIVO (DG: +' + dgKw.toFixed(1) + ' kW | BESS: ' + pBatDisp.toFixed(1) + ' kW)';
        elBal.style.color = '#a855f7';
      } else if (isSolarProducing && solarKw >= loadKw) {
        elBal.textContent = 'SUPERÁVIT SOLAR (+' + (solarKw - loadKw).toFixed(2) + ' kW NETO) → BESS EN CARGA';
        elBal.style.color = '#64B856';
      } else if (isDischarging) {
        elBal.textContent = 'DESCARGA BESS NOCTURNA (Carga ' + loadKw.toFixed(2) + ' kW cubierta por BESS)';
        elBal.style.color = '#f59e0b';
      } else {
        elBal.textContent = 'MICRORRED EN EQUILIBRIO OPERATIVO (Carga: ' + loadKw.toFixed(2) + ' kW)';
        elBal.style.color = '#64B856';
      }
    } else {
      if (isGridActive) {
        elBal.textContent = 'ALIMENTACIÓN DE RED COMERCIAL (Red: ' + gridKw.toFixed(2) + ' kW | Solar: ' + solarKw.toFixed(2) + ' kW | Autonomía Solar: ' + autoPct + '%)';
        elBal.style.color = '#38bdf8';
      } else if (isDgRunning) {
        elBal.textContent = 'RESPALDO GRUPO ELECTRÓGENO ACTIVO (DG: +' + dgKw.toFixed(2) + ' kW → Bus 48V)';
        elBal.style.color = '#a855f7';
      } else if (solarKw >= loadKw && isSolarProducing) {
        elBal.textContent = '100% AUTONOMÍA SOLAR (Solar +' + solarKw.toFixed(2) + ' kW cubre Carga ' + loadKw.toFixed(2) + ' kW BTS)';
        elBal.style.color = '#64B856';
      } else if (isDischarging) {
        elBal.textContent = 'RESPALDO POR BANCO DE BATERÍAS (Descarga: ' + pBatDisp.toFixed(2) + ' kW → Carga BTS: ' + loadKw.toFixed(2) + ' kW)';
        elBal.style.color = '#f59e0b';
      } else {
        elBal.textContent = 'MICRORRED TELECOM EN EQUILIBRIO OPERATIVO (Carga BTS: ' + loadKw.toFixed(2) + ' kW | ' + loadAmps + ' A)';
        elBal.style.color = '#64B856';
      }
    }
  }

  if (elDisp) {
    if (topologyMode === 'FULL_SOLAR') {
      elDisp.innerHTML = 'Prioridad: <strong style="color:#f7d048;">1° Solar MPPT</strong> → <strong style="color:#64B856;">2° Batería 48V</strong>';
    } else if (topologyMode === 'GRID_ONLY') {
      elDisp.innerHTML = 'Prioridad: <strong style="color:#f7d048;">1° Solar</strong> → <strong style="color:#38bdf8;">2° Red Comercial</strong> → <strong style="color:#64B856;">3° Batería Flotación</strong>';
    } else if (topologyMode === 'DG_SOLAR') {
      elDisp.innerHTML = 'Prioridad: <strong style="color:#f7d048;">1° Solar MPPT</strong> → <strong style="color:#64B856;">2° Batería 48V</strong> → <strong style="color:#a855f7;">3° Grupo Electrógeno</strong>';
    } else if (topologyMode === 'INDUSTRIAL') {
      elDisp.innerHTML = 'Prioridad: <strong style="color:#f7d048;">1° Solar</strong> → <strong style="color:#64B856;">2° BESS</strong> → <strong style="color:#38bdf8;">3° Red / Diésel</strong>';
    } else {
      elDisp.innerHTML = 'Prioridad: <strong style="color:#f7d048;">1° Solar</strong> → <strong style="color:#38bdf8;">2° Red</strong> → <strong style="color:#64B856;">3° Batería</strong> → <strong style="color:#a855f7;">4° Diésel</strong>';
    }
  }
};

self.onDestroy = function() {};
