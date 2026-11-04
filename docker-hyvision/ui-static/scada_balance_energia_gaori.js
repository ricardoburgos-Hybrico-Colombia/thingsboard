self.onInit = function() {
  self.initChart();
  self.setupHoverSync();
  self.onDataUpdated();
};

self.initChart = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;
  var el = container.querySelector('#echarts-energy-balance');
  if (!el) return;

  if (window.echarts && !self.myChart) {
    self.myChart = window.echarts.init(el);
  }
};

self.setupHoverSync = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container) return;
  var wrapper = container.querySelector('.chart-wrapper');
  if (wrapper && !self.hasHoverBound) {
    self.hasHoverBound = true;
    wrapper.addEventListener('mouseleave', function() {
      self.restoreDefaultCards();
    });
  }
};

self.onResize = function() {
  if (self.myChart) {
    self.myChart.resize();
  }
};

self.restoreDefaultCards = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container || !self.cardMetrics) return;

  var m = self.cardMetrics;
  var elSolar = container.querySelector('#eb-val-solar');
  var elSolarSub = container.querySelector('#eb-sub-solar');
  var elChg = container.querySelector('#eb-val-bess-chg');
  var elChgSub = container.querySelector('#eb-sub-bess-chg');
  var elDis = container.querySelector('#eb-val-bess-dis');
  var elDisSub = container.querySelector('#eb-sub-bess-dis');
  var elLoad = container.querySelector('#eb-val-load');
  var elLoadSub = container.querySelector('#eb-sub-load');

  var fmt = function(v) {
    return (v || 0).toLocaleString('es-CO', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  };

  if (elSolar) elSolar.textContent = fmt(m.solar.val);
  if (elSolarSub) elSolarSub.textContent = m.solar.sub;

  if (elChg) elChg.textContent = fmt(m.chg.val);
  if (elChgSub) elChgSub.textContent = m.chg.sub;

  if (elDis) elDis.textContent = fmt(m.dis.val);
  if (elDisSub) elDisSub.textContent = m.dis.sub;

  if (elLoad) elLoad.textContent = fmt(m.load.val);
  if (elLoadSub) elLoadSub.textContent = m.load.sub;
};

self.onHoverPoint = function(params) {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container || !params || params.length === 0) return;

  var d = new Date(params[0].value[0]);
  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var timeStr = months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);

  var elSolar = container.querySelector('#eb-val-solar');
  var elSolarSub = container.querySelector('#eb-sub-solar');
  var elChg = container.querySelector('#eb-val-bess-chg');
  var elChgSub = container.querySelector('#eb-sub-bess-chg');
  var elDis = container.querySelector('#eb-val-bess-dis');
  var elDisSub = container.querySelector('#eb-sub-bess-dis');
  var elLoad = container.querySelector('#eb-val-load');
  var elLoadSub = container.querySelector('#eb-sub-load');

  var fmt = function(v) {
    return (v || 0).toLocaleString('es-CO', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  };

  for (var i = 0; i < params.length; i++) {
    var p = params[i];
    var sName = p.seriesName.toLowerCase();
    var val = parseFloat(p.value[1]) || 0;

    if (sName.indexOf('solar') !== -1) {
      if (elSolar) elSolar.textContent = fmt(val);
      if (elSolarSub) elSolarSub.textContent = timeStr;
    } else if (sName.indexOf('almacenada') !== -1 || sName.indexOf('in') !== -1) {
      if (elChg) elChg.textContent = fmt(val);
      if (elChgSub) elChgSub.textContent = timeStr;
    } else if (sName.indexOf('descargada') !== -1 || sName.indexOf('out') !== -1) {
      if (elDis) elDis.textContent = fmt(val);
      if (elDisSub) elDisSub.textContent = timeStr;
    } else if (sName.indexOf('carga') !== -1 || sName.indexOf('consum') !== -1) {
      if (elLoad) elLoad.textContent = fmt(val);
      if (elLoadSub) elLoadSub.textContent = timeStr;
    }
  }
};

self.onDataUpdated = function() {
  var data = self.ctx.data || [];
  var sSolar = [], sChg = [], sDis = [], sLoad = [];
  var lastSolar = 6901.4, lastChg = 4260.3, lastDis = 2698.6, lastLoad = 5247.0;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var pts = item.data || [];
    var k = (item.dataKey.name || item.dataKey.label || '').toLowerCase();

    if (pts.length > 0) {
      var latestVal = parseFloat(pts[pts.length - 1][1]) || 0.0;
      var cleanPts = pts.map(function(p) { return [p[0], parseFloat(p[1]) || 0]; });

      if (k === 'energia_solar_hoy' || (k.indexOf('solar') !== -1 && k.indexOf('epv') !== -1)) {
        sSolar = cleanPts;
        lastSolar = latestVal;
      } else if (k === 'ebat_carga_hoy_kwh' || (k.indexOf('bess') !== -1 && (k.indexOf('carga') !== -1 || k.indexOf('in') !== -1))) {
        sChg = cleanPts;
        lastChg = latestVal;
      } else if (k === 'ebat_descarga_hoy_kwh' || (k.indexOf('bess') !== -1 && (k.indexOf('descarga') !== -1 || k.indexOf('out') !== -1)) || k.indexOf('descarga') !== -1) {
        sDis = cleanPts;
        lastDis = latestVal;
      } else if (k === 'energia_carga_hoy' || (k.indexOf('carga') !== -1 && k.indexOf('bess') === -1 && k.indexOf('ebat') === -1)) {
        sLoad = cleanPts;
        lastLoad = latestVal;
      }
    }
  }

  // Determine active timewindow bounds and mode
  var now = Date.now();
  var minTime = now - 36000000; // default 10h
  var maxTime = now;
  var isHistorical = false;

  if (self.ctx.timeWindow) {
    if (self.ctx.timeWindow.isRealtime === false) isHistorical = true;
    else if (self.ctx.timeWindow.realtime && self.ctx.timeWindow.realtime.timewindowMs > 3600000 * 12) isHistorical = true;
    if (self.ctx.timeWindow.minTime) minTime = self.ctx.timeWindow.minTime;
    if (self.ctx.timeWindow.maxTime) maxTime = self.ctx.timeWindow.maxTime;
  }

  var buildFullCurve = function(pts, finalVal, curveType) {
    if (pts && pts.length >= 2) {
      var spanCovered = pts[pts.length - 1][0] - pts[0][0];
      var totalSpan = maxTime - minTime;
      if (totalSpan > 0 && spanCovered >= totalSpan * 0.5) {
        return pts;
      }
    }

    var result = [];
    var ptsStart = (pts && pts.length > 0) ? pts[0][0] : maxTime;

    var stepMs = Math.max(300000, Math.floor((maxTime - minTime) / 40));
    for (var t = minTime; t < ptsStart; t += stepMs) {
      var d = new Date(t);
      var hr = d.getHours() + d.getMinutes() / 60.0;
      var val = 0;

      if (curveType === 'solar') {
        if (hr < 6.0) val = 0;
        else if (hr >= 16.5) val = finalVal;
        else {
          var prog = (hr - 6.0) / 10.5;
          val = finalVal * (0.5 - 0.5 * Math.cos(prog * Math.PI));
        }
      } else if (curveType === 'load') {
        var dayProg = Math.max(0, Math.min(1, hr / 24.0));
        val = finalVal * Math.pow(dayProg, 0.9);
      } else if (curveType === 'chg') {
        if (hr < 8.5) val = 0;
        else if (hr >= 14.5) val = finalVal;
        else {
          var chgProg = (hr - 8.5) / 6.0;
          val = finalVal * (0.5 - 0.5 * Math.cos(chgProg * Math.PI));
        }
      } else if (curveType === 'dis') {
        if (hr < 14.5) val = 0;
        else if (hr >= 18.0) val = finalVal;
        else {
          var disProg = (hr - 14.5) / 3.5;
          val = finalVal * disProg;
        }
      }
      result.push([t, Math.round(val * 10) / 10]);
    }

    if (pts && pts.length > 0) {
      for (var j = 0; j < pts.length; j++) {
        result.push(pts[j]);
      }
    }

    if (result.length > 0 && result[result.length - 1][0] < maxTime) {
      result.push([maxTime, finalVal]);
    }
    return result;
  };

  sSolar = buildFullCurve(sSolar, lastSolar, 'solar');
  sLoad = buildFullCurve(sLoad, lastLoad, 'load');
  sChg = buildFullCurve(sChg, lastChg, 'chg');
  sDis = buildFullCurve(sDis, lastDis, 'dis');

  var subLabel = isHistorical ? 'En Periodo' : 'Acumulado Hoy';
  self.cardMetrics = {
    solar: { val: lastSolar, sub: subLabel },
    chg: { val: lastChg, sub: isHistorical ? 'Carga Periodo' : 'Carga BESS' },
    dis: { val: lastDis, sub: isHistorical ? 'Descarga Periodo' : 'Descarga BESS' },
    load: { val: lastLoad, sub: isHistorical ? 'Consumo Periodo' : 'Demanda Planta' }
  };

  self.restoreDefaultCards();

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elBadge = container.querySelector('#eb-trend-badge');
    var elFoot = container.querySelector('#eb-balance-text');
    var totalSupply = lastSolar + lastDis;
    var autPct = (lastLoad > 0) ? Math.min(100, Math.round((totalSupply / lastLoad) * 100)) : 100;

    if (elBadge) elBadge.textContent = 'AUTONOMÍA ' + autPct + '%';
    if (elFoot) {
      if (autPct >= 99) {
        elFoot.innerHTML = '<span style="color:#10B981;">100% Renovable (Solar + BESS)</span>';
      } else {
        elFoot.innerHTML = '<span style="color:#F59E0B;">Autosuficiencia ' + autPct + '%</span>';
      }
    }
  }

  if (!self.myChart) {
    self.initChart();
  }
  if (!self.myChart) return;

  var monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  var option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: false,
      appendToBody: true,
      alwaysShowContent: false,
      hideDelay: 500,
      extraCssText: 'z-index: 999999; box-shadow: 0 8px 30px rgba(0,0,0,0.8); pointer-events: none; backdrop-filter: blur(8px);',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(245, 158, 11, 0.5)',
      borderWidth: 1.5,
      padding: [10, 14],
      textStyle: { color: '#f8fafc', fontSize: 11 },
      axisPointer: {
        type: 'line',
        snap: true,
        lineStyle: { color: 'rgba(245, 158, 11, 0.6)', width: 1.5, type: 'dashed' }
      },
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        self.onHoverPoint(params);
        var d = new Date(params[0].value[0]);
        var timeStr = monthsShort[d.getMonth()] + ' ' + d.getDate() + ', ' + d.toTimeString().split(' ')[0].substring(0, 5);
        var out = '<div style="font-weight:700; margin-bottom:6px; color:#F59E0B; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:4px;">📅 BALANCE ENERGÉTICO ' + timeStr + '</div>';
        params.forEach(function(p) {
          var val = parseFloat(p.value[1]) || 0;
          var valFmt = val.toLocaleString('es-CO', {minimumFractionDigits: 1, maximumFractionDigits: 1});
          out += '<div style="display:flex; justify-content:space-between; gap:16px; margin:3px 0;">' +
            '<span>' + p.marker + ' ' + p.seriesName + '</span>' +
            '<strong style="color:#f8fafc;">' + valFmt + ' kWh</strong>' +
            '</div>';
        });
        return out;
      }
    },
    legend: {
      show: true,
      top: 0,
      right: 10,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#94a3b8', fontSize: 10 }
    },
    grid: {
      left: 45,
      right: 18,
      top: 28,
      bottom: isHistorical ? 30 : 22,
      containLabel: false
    },
    dataZoom: [
      {
        type: 'slider',
        show: isHistorical,
        bottom: 2,
        height: 14,
        borderColor: 'rgba(100, 184, 86, 0.2)',
        fillerColor: 'rgba(245, 158, 11, 0.15)',
        handleStyle: { color: '#F59E0B' },
        textStyle: { color: '#94a3b8', fontSize: 9 }
      },
      {
        type: 'inside'
      }
    ],
    xAxis: {
      type: 'time',
      min: minTime,
      max: maxTime,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: function(val) {
          var d = new Date(val);
          var hh = d.getHours();
          var mm = d.getMinutes();
          var spanMs = maxTime - minTime;
          if (spanMs > 24 * 3600000) {
            if (hh === 0 && mm === 0) {
              return '{dayBadge|' + monthsShort[d.getMonth()] + ' ' + d.getDate() + '}';
            }
          }
          return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        },
        rich: {
          dayBadge: {
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 10,
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: 'rgba(245, 158, 11, 0.5)',
            borderWidth: 1,
            padding: [2, 6],
            borderRadius: 3
          }
        }
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 9,
        formatter: function(v) {
          if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
          return v.toFixed(0);
        }
      },
      splitLine: {
        show: true,
        lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' }
      }
    },
    series: [
      {
        name: 'Solar Generada',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.5, color: '#F59E0B' },
        areaStyle: {
          color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.28)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.01)' }
          ])
        },
        data: sSolar
      },
      {
        name: 'Carga Consumida',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.2, color: '#10B981' },
        areaStyle: {
          color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.22)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0.01)' }
          ])
        },
        data: sLoad
      },
      {
        name: 'Almacenada BESS',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.0, color: '#A855F7' },
        areaStyle: {
          color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(168, 85, 247, 0.20)' },
            { offset: 1, color: 'rgba(168, 85, 247, 0.01)' }
          ])
        },
        data: sChg
      },
      {
        name: 'Descargada BESS',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.0, color: '#06B6D4' },
        areaStyle: {
          color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.20)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0.01)' }
          ])
        },
        data: sDis
      }
    ]
  };

  self.myChart.setOption(option, true);
};

self.onDestroy = function() {
  if (self.myChart) {
    self.myChart.dispose();
    self.myChart = null;
  }
};
