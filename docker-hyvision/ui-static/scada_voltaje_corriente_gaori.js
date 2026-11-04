self.onInit = function() {
  self.initChart();
  self.setupHoverSync();
  self.onDataUpdated();
};

self.ensureEcharts = function(cb) {
  if (window.echarts) {
    cb();
    return;
  }
  var existing = document.querySelector('script[src*="echarts"]');
  if (!existing) {
    var s = document.createElement('script');
    s.src = '/echarts.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  } else {
    existing.addEventListener('load', cb);
    var attempts = 0;
    var intv = setInterval(function() {
      attempts++;
      if (window.echarts || attempts > 50) {
        clearInterval(intv);
        if (window.echarts) cb();
      }
    }, 100);
  }
};

self.initChart = function() {
  var container = self.ctx.$container ? (self.ctx.$container[0] || self.ctx.$container) : null;
  if (!container) return;
  var el = container.querySelector('#echarts-trend-bess');
  if (!el) return;

  self.ensureEcharts(function() {
    if (!self.myChart && window.echarts && el.clientWidth > 0 && el.clientHeight > 0) {
      self.myChart = window.echarts.init(el);
      if (self.onResize) self.onResize();
      if (self.onDataUpdated) self.onDataUpdated();
    } else if (!self.myChart && window.echarts) {
      setTimeout(function() {
        if (!self.myChart && el.clientWidth > 0 && el.clientHeight > 0) {
          self.myChart = window.echarts.init(el);
          if (self.onResize) self.onResize();
          if (self.onDataUpdated) self.onDataUpdated();
        }
      }, 200);
    }
  });
};

self.setupHoverSync = function() {
  var container = self.ctx.$container ? (self.ctx.$container[0] || self.ctx.$container) : null;
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
  } else {
    self.initChart();
  }
};

self.restoreDefaultCards = function() {
  var container = self.ctx.$container ? (self.ctx.$container[0] || self.ctx.$container) : null;
  if (!container || !self.cardMetrics) return;

  var m = self.cardMetrics;
  var elV = container.querySelector('#vbat-live-val');
  var elVSub = container.querySelector('#vbat-sub-val');
  var elLoad = container.querySelector('#iload-live-val');
  var elLoadSub = container.querySelector('#iload-sub-val');
  var elRect = container.querySelector('#irect-live-val');
  var elRectSub = container.querySelector('#irect-sub-val');
  var elIbat = container.querySelector('#ibat-live-val');
  var elIbatSub = container.querySelector('#ibat-sub-val');
  var elCell = container.querySelector('#cell-live-val');
  var elCellSub = container.querySelector('#cell-sub-val');

  if (elV && m.v) { elV.textContent = m.v.primary.toFixed(1); if (elVSub) elVSub.textContent = m.v.sub; }
  if (elLoad && m.load) { elLoad.textContent = m.load.primary.toFixed(1); if (elLoadSub) elLoadSub.textContent = m.load.sub; }
  if (elRect && m.pBess) { elRect.textContent = m.pBess.primary.toFixed(1); if (elRectSub) elRectSub.textContent = m.pBess.sub; }
  if (elIbat && m.ibat) { elIbat.textContent = m.ibat.primary.toFixed(1); if (elIbatSub) elIbatSub.textContent = m.ibat.sub; }
  if (elCell && m.cell) { elCell.textContent = m.cell.primary.toFixed(3); if (elCellSub) elCellSub.textContent = m.cell.sub; }
};

self.onHoverPoint = function(params) {
  var container = self.ctx.$container ? (self.ctx.$container[0] || self.ctx.$container) : null;
  if (!container || !params || params.length === 0) return;

  var d = new Date(params[0].value[0]);
  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var timeStr = months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);

  var vVal = null, ibatVal = null, cellVal = null;
  for (var i = 0; i < params.length; i++) {
    var p = params[i];
    var sName = p.seriesName || '';
    if (sName.indexOf('Tensión') !== -1) {
      vVal = parseFloat(p.value[1]);
    } else if (sName.indexOf('Corriente') !== -1) {
      ibatVal = parseFloat(p.value[1]);
    } else if (sName.indexOf('Celda') !== -1) {
      cellVal = parseFloat(p.value[1]);
    }
  }

  var elV = container.querySelector('#vbat-live-val');
  var elVSub = container.querySelector('#vbat-sub-val');
  var elLoadSub = container.querySelector('#iload-sub-val');
  var elRect = container.querySelector('#irect-live-val');
  var elRectSub = container.querySelector('#irect-sub-val');
  var elIbat = container.querySelector('#ibat-live-val');
  var elIbatSub = container.querySelector('#ibat-sub-val');
  var elCell = container.querySelector('#cell-live-val');
  var elCellSub = container.querySelector('#cell-sub-val');

  if (vVal !== null && elV) {
    elV.textContent = vVal.toFixed(1);
    if (elVSub) elVSub.textContent = timeStr;
  }
  if (ibatVal !== null && elIbat) {
    elIbat.textContent = ibatVal.toFixed(1);
    if (elIbatSub) elIbatSub.textContent = timeStr;
  }
  if (cellVal !== null && elCell) {
    elCell.textContent = cellVal.toFixed(3);
    if (elCellSub) elCellSub.textContent = timeStr;
  }
  if (vVal !== null && ibatVal !== null && elRect) {
    var pInstKw = (vVal * ibatVal) / 1000.0;
    elRect.textContent = pInstKw.toFixed(1);
    if (elRectSub) elRectSub.textContent = timeStr;
  }
  if (elLoadSub) elLoadSub.textContent = timeStr;
};

// Zero-Phase Centered Moving Average Adaptive
self.smoothSeries = function(pts, targetWindow) {
  if (!pts || pts.length <= 5) return pts;
  var w = targetWindow || 25;
  if (pts.length < 150) w = 3;
  else if (pts.length < 600) w = 9;
  else if (pts.length < 1800) w = 15;
  else w = 25;

  var half = Math.floor(w / 2);
  var res = [];
  for (var i = 0; i < pts.length; i++) {
    var sum = 0, count = 0;
    var start = Math.max(0, i - half);
    var end = Math.min(pts.length - 1, i + half);
    for (var j = start; j <= end; j++) {
      sum += pts[j][1];
      count++;
    }
    res.push([pts[i][0], Math.round((sum / count) * 1000) / 1000]);
  }
  return res;
};

self.onDataUpdated = function() {
  var data = self.ctx.data || [];
  var rawVSeries = [], rawIBatSeries = [], rawCellSeries = [];
  var vVals = [], iBatVals = [], loadVals = [], cellVals = [];
  var curMinCellV = 0.0;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var pts = item.data || [];
    var k = (item.dataKey.name || item.dataKey.label || '').toLowerCase();

    if (pts.length > 0) {
      if (k.indexOf('min_volt_celda') !== -1 || k.indexOf('min_volt') !== -1 || k.indexOf('celda') !== -1) {
        rawCellSeries = pts.map(function(p) {
          var val = parseFloat(p[1]) || 0;
          var vInVolts = val > 100 ? val / 1000.0 : val;
          return [p[0], Math.round(vInVolts * 1000) / 1000];
        });
        cellVals = rawCellSeries.map(function(p) { return p[1]; });
        if (cellVals.length > 0) {
          curMinCellV = cellVals[cellVals.length - 1];
        }
      } else if (k.indexOf('vbat') !== -1 || (k.indexOf('voltage') !== -1 && k.indexOf('celda') === -1)) {
        rawVSeries = pts.map(function(p) { return [p[0], parseFloat(p[1]) || 0]; });
        vVals = pts.map(function(p) { return parseFloat(p[1]) || 0; });
      } else if (k.indexOf('ibat') !== -1 || k.indexOf('current') !== -1) {
        rawIBatSeries = pts.map(function(p) { return [p[0], parseFloat(p[1]) || 0]; });
        iBatVals = pts.map(function(p) { return parseFloat(p[1]) || 0; });
      } else if (k.indexOf('load') !== -1 || k.indexOf('demanda') !== -1) {
        loadVals = pts.map(function(p) { return parseFloat(p[1]) || 0; });
      }
    }
  }

  // Calculate statistics (RAW Exact Average & Peak/Max)
  var calcStats = function(arr, fallbackLast) {
    if (!arr || arr.length === 0) return { avg: fallbackLast, max: fallbackLast, min: fallbackLast, last: fallbackLast };
    var sum = 0, max = arr[0], min = arr[0];
    for (var j = 0; j < arr.length; j++) {
      var val = arr[j];
      sum += val;
      if (val > max) max = val;
      if (val < min) min = val;
    }
    return {
      avg: sum / arr.length,
      max: max,
      min: min,
      last: arr[arr.length - 1]
    };
  };

  var vStats = calcStats(vVals, 765.0);
  var ibatStats = calcStats(iBatVals, 0.0);
  var loadStats = calcStats(loadVals, 0.0);
  var cellStats = calcStats(cellVals, curMinCellV || 3.305);

  // Check if historical range vs real-time
  var isHistorical = false;
  if (self.ctx.timeWindow) {
    if (self.ctx.timeWindow.isRealtime === false) isHistorical = true;
    else if (self.ctx.timeWindow.realtime && self.ctx.timeWindow.realtime.timewindowMs > 3600000 * 12) isHistorical = true;
  }

  // Cards display verified statistics
  if (isHistorical) {
    self.cardMetrics = {
      v: { primary: vStats.avg, sub: 'Pico: ' + vStats.max.toFixed(1) + ' V' },
      load: { primary: loadStats.avg, sub: 'Pico: ' + loadStats.max.toFixed(1) + ' kW' },
      pBess: {
        primary: (vStats.avg * ibatStats.avg / 1000.0),
        sub: 'Pico: ' + ((vStats.max * ibatStats.max / 1000.0)).toFixed(1) + ' kW'
      },
      ibat: { primary: ibatStats.avg, sub: 'Pico: ' + ibatStats.max.toFixed(1) + ' A' },
      cell: { primary: cellStats.avg, sub: 'Mín: ' + cellStats.min.toFixed(3) + ' V' }
    };
  } else {
    self.cardMetrics = {
      v: { primary: vStats.last, sub: 'Pico: ' + vStats.max.toFixed(1) + ' V' },
      load: { primary: loadStats.last, sub: 'Pico: ' + loadStats.max.toFixed(1) + ' kW' },
      pBess: {
        primary: (vStats.last * ibatStats.last / 1000.0),
        sub: 'Pico: ' + ((vStats.max * ibatStats.max / 1000.0)).toFixed(1) + ' kW'
      },
      ibat: { primary: ibatStats.last, sub: 'Pico: ' + ibatStats.max.toFixed(1) + ' A' },
      cell: { primary: cellStats.last, sub: 'Mín: ' + cellStats.min.toFixed(3) + ' V' }
    };
  }

  self.restoreDefaultCards();

  var container = self.ctx.$container ? (self.ctx.$container[0] || self.ctx.$container) : null;
  if (container) {
    var elReg = container.querySelector('#trend-regimen-text');
    if (elReg) {
      if (curMinCellV > 0) {
        elReg.innerHTML = 'Bus DC 750V · Celda Mín: <strong style="color:#ec4899;">' + curMinCellV.toFixed(3) + ' V</strong>';
      } else {
        elReg.textContent = 'Bus DC 750V · LFP Operativo';
      }
    }
  }

  if (!self.myChart) {
    self.initChart();
  }
  if (!self.myChart) return;

  var cleanIBatSeries = self.smoothSeries(rawIBatSeries, 15);
  var cleanVSeries = self.smoothSeries(rawVSeries, 15);
  var cleanCellSeries = self.smoothSeries(rawCellSeries, 9);

  var monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  var option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      alwaysShowContent: false,
      hideDelay: 500,
      extraCssText: 'z-index: 999999; box-shadow: 0 4px 20px rgba(0,0,0,0.7); pointer-events: none;',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(100, 184, 86, 0.4)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#f8fafc', fontSize: 11 },
      axisPointer: {
        type: 'line',
        snap: true,
        lineStyle: { color: 'rgba(255, 255, 255, 0.4)', width: 1.5, type: 'dashed' }
      },
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        self.onHoverPoint(params);
        var d = new Date(params[0].value[0]);
        var timeStr = monthsShort[d.getMonth()] + ' ' + d.getDate() + ', ' + d.toTimeString().split(' ')[0];
        var out = '<div style="font-weight:700; margin-bottom:5px; color:#38bdf8; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">📅 ' + timeStr + '</div>';
        params.forEach(function(p) {
          var unit = ' V';
          var valFormatted = p.value[1];
          var sName = p.seriesName || '';
          if (sName.indexOf('Corriente') !== -1) {
            unit = ' A';
            valFormatted = Number(p.value[1]).toFixed(1);
          } else if (sName.indexOf('Celda') !== -1) {
            unit = ' V';
            valFormatted = Number(p.value[1]).toFixed(3);
          } else {
            valFormatted = Number(p.value[1]).toFixed(1);
          }
          out += '<div style="display:flex; justify-content:space-between; gap:16px; margin: 3px 0;">' +
                 '<span>' + p.marker + ' ' + sName + ':</span>' +
                 '<strong style="color:#ffffff;">' + valFormatted + unit + '</strong>' +
                 '</div>';
        });
        return out;
      }
    },
    legend: {
      show: true,
      top: 2,
      left: 'center',
      itemWidth: 14,
      itemHeight: 4,
      itemGap: 18,
      textStyle: { color: '#94a3b8', fontSize: 10 },
      data: ['Tensión Bus DC', 'Corriente BESS', 'Voltaje Mín Celda']
    },
    grid: {
      left: 48,
      right: 100,
      top: 32,
      bottom: 28,
      containLabel: false
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        bottom: 2,
        height: 18,
        borderColor: 'rgba(100, 184, 86, 0.3)',
        backgroundColor: 'rgba(14, 25, 16, 0.7)',
        fillerColor: 'rgba(100, 184, 86, 0.22)',
        handleStyle: { color: '#64B856', borderColor: '#22C55E' },
        moveHandleStyle: { color: 'rgba(100, 184, 86, 0.4)' },
        showDetail: true,
        showDataShadow: true,
        dataBackground: {
          lineStyle: { color: '#38bdf8', width: 1 },
          areaStyle: { color: 'rgba(56, 189, 248, 0.25)' }
        },
        selectedDataBackground: {
          lineStyle: { color: '#64B856', width: 1 },
          areaStyle: { color: 'rgba(100, 184, 86, 0.4)' }
        },
        textStyle: { color: '#94a3b8', fontSize: 9 }
      },
      {
        type: 'inside'
      }
    ],
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: 'rgba(100, 184, 86, 0.25)' } },
      axisTick: { show: true, lineStyle: { color: 'rgba(100, 184, 86, 0.25)' } },
      splitLine: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        formatter: function(val) {
          var d = new Date(val);
          var hh = d.getHours();
          var mm = d.getMinutes();
          if (hh === 0 && mm === 0) {
            return '{dayBadge|' + monthsShort[d.getMonth()] + ' ' + d.getDate() + '}';
          }
          return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        },
        rich: {
          dayBadge: {
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 10,
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: 'rgba(100, 184, 86, 0.5)',
            borderWidth: 1,
            padding: [2, 6],
            borderRadius: 3
          }
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Bus DC (V)',
        nameTextStyle: { color: '#38bdf8', fontSize: 9.5, align: 'left', padding: [0, 0, 4, -4] },
        position: 'left',
        scale: true,
        axisLine: { show: true, lineStyle: { color: 'rgba(56, 189, 248, 0.4)' } },
        axisLabel: { color: '#38bdf8', fontSize: 9.5, formatter: '{value} V' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      {
        type: 'value',
        name: 'Corriente (A)',
        nameTextStyle: { color: '#f59e0b', fontSize: 9.5, align: 'right', padding: [0, 12, 4, 0] },
        position: 'right',
        scale: true,
        axisLine: { show: true, lineStyle: { color: 'rgba(245, 158, 11, 0.4)' } },
        axisLabel: { color: '#f59e0b', fontSize: 9.5, formatter: '{value} A' },
        splitLine: { show: false }
      },
      {
        type: 'value',
        name: 'Celda Mín (V)',
        nameTextStyle: { color: '#ec4899', fontSize: 9.5, align: 'center', padding: [0, 14, 4, 0] },
        position: 'right',
        offset: 50,
        scale: true,
        axisLine: { show: true, lineStyle: { color: 'rgba(236, 72, 153, 0.4)' } },
        axisLabel: {
          color: '#ec4899',
          fontSize: 9.5,
          formatter: function(v) {
            return Number(v).toFixed(2) + ' V';
          }
        },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Tensión Bus DC',
        type: 'line',
        yAxisIndex: 0,
        data: cleanVSeries,
        smooth: 0.3,
        showSymbol: false,
        lineStyle: { color: '#38bdf8', width: 2.2 },
        itemStyle: { color: '#38bdf8' }
      },
      {
        name: 'Corriente BESS',
        type: 'line',
        yAxisIndex: 1,
        data: cleanIBatSeries,
        smooth: 0.3,
        showSymbol: false,
        lineStyle: { color: '#f59e0b', width: 2.2 },
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: 'Voltaje Mín Celda',
        type: 'line',
        yAxisIndex: 2,
        data: cleanCellSeries,
        smooth: 0.25,
        showSymbol: false,
        lineStyle: { color: '#ec4899', width: 2.2 },
        itemStyle: { color: '#ec4899' }
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
