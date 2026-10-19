// Controller Script: SCADA - Tableros DC y Strings MPPT (Multi-PBD Searchable Dropdown)
self.selectedPbd = sessionStorage.getItem('hybrico_pbd_sel') || 'PBD-01';
self.pbdMatrix = null;
self.menuOpen = false;
self.searchFilter = '';
self._docClickListener = null;

self.onInit = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var selBtn = container.querySelector('#pbd-selector-btn');
  var menu = container.querySelector('#pbd-menu');
  var searchInput = container.querySelector('#pbd-search-input');
  var chevron = container.querySelector('#pbd-chevron');

  if (selBtn && menu) {
    selBtn.onclick = function(e) {
      e.stopPropagation();
      self.menuOpen = !self.menuOpen;
      menu.style.display = self.menuOpen ? 'flex' : 'none';
      if (chevron) {
        if (self.menuOpen) chevron.classList.add('open');
        else chevron.classList.remove('open');
      }
      if (self.menuOpen && searchInput) {
        searchInput.value = '';
        self.searchFilter = '';
        self.filterPbdList(container);
        setTimeout(function() { searchInput.focus(); }, 50);
      }
    };
  }

  if (searchInput) {
    searchInput.onclick = function(e) { e.stopPropagation(); };
    searchInput.oninput = function(e) {
      self.searchFilter = (e.target.value || '').trim().toLowerCase();
      self.filterPbdList(container);
    };
  }

  // Cerrar al hacer click fuera
  self._docClickListener = function(e) {
    if (self.menuOpen && menu && !menu.contains(e.target) && !selBtn.contains(e.target)) {
      self.menuOpen = false;
      menu.style.display = 'none';
      if (chevron) chevron.classList.remove('open');
    }
  };
  document.addEventListener('click', self._docClickListener);

  self.onDataUpdated();
};

self.filterPbdList = function(container) {
  if (!container) return;
  var items = container.querySelectorAll('.pbd-item');
  var q = self.searchFilter;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var searchData = (it.getAttribute('data-search') || '').toLowerCase();
    if (!q || searchData.indexOf(q) !== -1) {
      it.style.display = 'flex';
    } else {
      it.style.display = 'none';
    }
  }
};

self.renderDropdownList = function(container) {
  if (!container || !self.pbdMatrix) return;
  var listScroll = container.querySelector('#pbd-list-scroll');
  if (!listScroll) return;

  var keys = Object.keys(self.pbdMatrix).sort(function(a, b) {
    var nA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    var nB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return nA - nB;
  });

  var html = '';
  for (var i = 0; i < keys.length; i++) {
    var pKey = keys[i];
    var pData = self.pbdMatrix[pKey];
    var isSel = (pKey === self.selectedPbd);
    var stCode = pData.status_code !== undefined ? pData.status_code : (pData.status === 'CERRADO' ? 2 : 1);
    var dotClass = stCode === 2 ? 'ok' : (stCode === 1 ? 'warn' : 'err');
    var pwrVal = (pData.kw !== undefined ? pData.kw : 0.0).toFixed(1) + ' kW';
    var snText = pData.sn || '';
    var searchStr = (pKey + ' ' + snText + ' ' + pData.status + ' ' + pwrVal).toLowerCase();

    html += '<div class="pbd-item' + (isSel ? ' active' : '') + '" data-pbd="' + pKey + '" data-search="' + searchStr + '">';
    html += '  <div class="pbd-item-left">';
    html += '    <span class="pbd-dot ' + dotClass + '">●</span>';
    html += '    <span class="pbd-item-name">' + pKey + '</span>';
    html += '    <span class="pbd-item-sn">' + snText + '</span>';
    html += '  </div>';
    html += '  <div class="pbd-item-right">';
    html += '    <span class="pbd-item-pwr">' + pwrVal + '</span>';
    html += '  </div>';
    html += '</div>';
  }
  listScroll.innerHTML = html;

  // Bind click handlers
  var itemEls = listScroll.querySelectorAll('.pbd-item');
  for (var j = 0; j < itemEls.length; j++) {
    (function(el) {
      el.onclick = function(e) {
        e.stopPropagation();
        var targetPbd = el.getAttribute('data-pbd');
        if (targetPbd) {
          self.selectedPbd = targetPbd;
          try { sessionStorage.setItem('hybrico_pbd_sel', targetPbd); } catch(err) {}
        }
        var menu = container.querySelector('#pbd-menu');
        var chevron = container.querySelector('#pbd-chevron');
        if (menu) menu.style.display = 'none';
        if (chevron) chevron.classList.remove('open');
        self.menuOpen = false;
        self.updateWidgetView(container);
        self.renderDropdownList(container);
      };
    })(itemEls[j]);
  }

  self.filterPbdList(container);
};

self.onDataUpdated = function() {
  var data = self.ctx.data;
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;

  var legacyVbus = 0.0;
  var legacyStrings = [0.0, 0.0, 0.0, 0.0, 0.0];
  var legacyStatus = 'CERRADO';
  var rawMatrix = null;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = item.data[item.data.length - 1][1];
        var k = (item.dataKey.label || item.dataKey.name || '').toLowerCase();

        if (k === 'pbd_matrix_json') {
          try {
            rawMatrix = typeof v === 'string' ? JSON.parse(v) : v;
          } catch(e) {
            console.error('Error parsing pbd_matrix_json:', e);
          }
        } else {
          var num = parseFloat(v);
          if (!isNaN(num)) {
            if (k === 'solar_charger_current') {
              if (num > 0) legacyStrings[0] = num;
            } else if (k === 'solar_charger_voltage' || k.indexOf('bus_voltage') !== -1 || k.indexOf('vbus') !== -1) {
              if (num > 0) legacyVbus = num;
            } else if (k.indexOf('string_1') !== -1 || k.indexOf('ipv1') !== -1) legacyStrings[0] = num;
            else if (k.indexOf('string_2') !== -1 || k.indexOf('ipv2') !== -1) legacyStrings[1] = num;
            else if (k.indexOf('string_3') !== -1 || k.indexOf('ipv3') !== -1) legacyStrings[2] = num;
            else if (k.indexOf('string_4') !== -1 || k.indexOf('ipv4') !== -1) legacyStrings[3] = num;
            else if (k.indexOf('string_5') !== -1 || k.indexOf('ipv5') !== -1) legacyStrings[4] = num;
          }
          if (k.indexOf('status') !== -1 || k.indexOf('disconnect') !== -1) {
            legacyStatus = String(v).toUpperCase();
          }
        }
      }
    }
  }

  if (rawMatrix && typeof rawMatrix === 'object') {
    self.pbdMatrix = rawMatrix;
    self.renderDropdownList(container);
  }

  self.updateWidgetView(container, legacyVbus, legacyStrings, legacyStatus);
};

self.updateWidgetView = function(container, fallbackVbus, fallbackStrings, fallbackStatus) {
  if (!container) return;

  var vbus = 0.0;
  var totalI = 0.0;
  var pwrKw = 0.0;
  var tempVal = 0.0;
  var stringsI = [0.0, 0.0, 0.0, 0.0, 0.0];
  var stringsV = [0.0, 0.0, 0.0, 0.0, 0.0];
  var statusStr = 'CERRADO';
  var pbdSn = '';
  var isMultiPbd = false;
  var isIndustrial = false;
  var maxStrAmp = 25.0;

  if (self.pbdMatrix && self.pbdMatrix[self.selectedPbd]) {
    isMultiPbd = true;
    var cur = self.pbdMatrix[self.selectedPbd];
    pbdSn = cur.sn || '';
    pwrKw = cur.kw !== undefined ? cur.kw : 0.0;
    vbus = cur.vbus !== undefined ? cur.vbus : 0.0;
    tempVal = cur.temp !== undefined ? cur.temp : 0.0;
    statusStr = cur.status || 'CERRADO';
    if (cur.currents && cur.currents.length >= 5) {
      stringsI = cur.currents;
    }
    if (cur.voltages && cur.voltages.length >= 5) {
      stringsV = cur.voltages;
    }
    totalI = stringsI[0] + stringsI[1] + stringsI[2] + stringsI[3] + stringsI[4];
    isIndustrial = true;
  } else {
    // Fallback unificado para Telecom 48V o legado
    vbus = fallbackVbus || 0.0;
    stringsI = fallbackStrings || [0.0, 0.0, 0.0, 0.0, 0.0];
    statusStr = fallbackStatus || 'CERRADO';
    totalI = stringsI[0] + stringsI[1] + stringsI[2] + stringsI[3] + stringsI[4];
    isIndustrial = vbus > 200.0;
    pwrKw = (totalI * vbus) / 1000.0;
  }

  var isClosed = statusStr.indexOf('ABIERTO') === -1 && statusStr.indexOf('DESCONECT') === -1;

  // 1. Título y Selector
  var elTitle = container.querySelector('#pbd-title-text');
  if (elTitle) {
    if (isMultiPbd) {
      elTitle.textContent = 'TABLERO SOLAR ' + self.selectedPbd;
    } else {
      elTitle.textContent = isIndustrial ? 'TABLERO SOLAR PBD-01 (STRINGS DC)' : 'TABLEROS DC / STRINGS MPPT';
    }
  }

  var elChevron = container.querySelector('#pbd-chevron');
  if (elChevron) {
    elChevron.style.display = isMultiPbd ? 'inline-block' : 'none';
  }

  // 2. Badges de Header
  var elPwrBadge = container.querySelector('#pbd-power-badge');
  if (elPwrBadge) {
    elPwrBadge.textContent = pwrKw.toFixed(1) + ' kW';
    elPwrBadge.style.display = isIndustrial ? 'block' : 'none';
  }

  var elBadge = container.querySelector('#pbd-status-badge');
  if (elBadge) {
    if (isIndustrial) {
      elBadge.textContent = isClosed ? 'SECCIONADOR CERRADO' : 'SECCIONADOR ABIERTO';
      elBadge.className = 'pbd-badge ' + (isClosed ? 'ok' : 'warn');
    } else {
      elBadge.textContent = isClosed ? 'BUS DC ACTIVO' : 'BUS DESCONECTADO';
      elBadge.className = 'pbd-badge ' + (isClosed ? 'ok' : 'warn');
    }
  }

  // 3. Métricas Principales (KPI)
  var elV = container.querySelector('#pbd-vbus-val');
  if (elV) elV.textContent = vbus > 0 ? vbus.toFixed(1) : '--';

  var elTot = container.querySelector('#pbd-itot-val');
  if (elTot) elTot.textContent = totalI.toFixed(1);

  var elPwr = container.querySelector('#pbd-pwr-val');
  if (elPwr) elPwr.textContent = pwrKw.toFixed(1);

  var elTemp = container.querySelector('#pbd-temp-val');
  if (elTemp) elTemp.textContent = tempVal > 0 ? tempVal.toFixed(1) : '--';

  // 4. Matriz de Strings (5 Canales MPPT)
  for (var s = 0; s < 5; s++) {
    var idx = s + 1;
    var elSVal = container.querySelector('#str' + idx + '-val');
    var elSBar = container.querySelector('#str' + idx + '-bar');
    var elSVolt = container.querySelector('#str' + idx + '-volt');
    var elSDot = container.querySelector('#str' + idx + '-dot');

    var amp = stringsI[s] || 0.0;
    var volt = stringsV[s] || 0.0;

    if (elSVal) elSVal.textContent = amp.toFixed(1) + ' A';
    if (elSBar) {
      var pct = Math.min(100, Math.max(0, (amp / maxStrAmp) * 100));
      elSBar.style.width = pct + '%';
    }
    if (elSVolt) {
      elSVolt.textContent = volt > 0 ? volt.toFixed(0) + ' V' : '-- V';
    }
    if (elSDot) {
      if (amp > 0.5) elSDot.classList.add('active');
      else elSDot.classList.remove('active');
    }
  }

  // 5. Pie de Tarjeta
  var elSecText = container.querySelector('#pbd-secc-text');
  if (elSecText) {
    elSecText.textContent = isClosed ? 'Conectado (Normal)' : 'Abierto (Desconectado)';
    elSecText.style.color = isClosed ? '#64B856' : '#ef4444';
  }

  var elSnText = container.querySelector('#pbd-sn-text');
  if (elSnText) {
    elSnText.textContent = pbdSn ? '· SN: ' + pbdSn : '';
  }

  var elCap = container.querySelector('#pbd-footer-cap');
  if (elCap) {
    elCap.innerHTML = isIndustrial ? 'Capacidad PBD: <strong>250 kW DC · 5 MPPT</strong>' : 'Capacidad: <strong>Bus Telecom 48V</strong>';
  }
};

self.onDestroy = function() {
  if (self._docClickListener) {
    document.removeEventListener('click', self._docClickListener);
    self._docClickListener = null;
  }
};
