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
  var el = container.querySelector('#echarts-trend-therm');
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
  } else {
    self.initChart();
  }
};

self.restoreDefaultCards = function() {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container || !self.cardMetrics) return;

  var m = self.cardMetrics;
  var card = container.querySelector('#therm-card');
  var elDt = container.querySelector('#dt-live-val');
  var elDtSub = container.querySelector('#dt-sub-val');
  var elMax = container.querySelector('#tmax-live-val');
  var elMaxSub = container.querySelector('#tmax-sub-val');
  var elMin = container.querySelector('#tmin-live-val');
  var elMinSub = container.querySelector('#tmin-sub-val');
  var elBadge = container.querySelector('#therm-trend-badge');
  var elDiag = container.querySelector('#therm-diag-text');

  if (elDt) elDt.textContent = m.dt.toFixed(1);
  if (elDtSub) elDtSub.textContent = 'En Vivo';

  if (elMax) elMax.textContent = m.tMax > 0 ? m.tMax.toFixed(1) : '--';
  if (elMaxSub) elMaxSub.textContent = 'En Vivo';

  if (elMin) elMin.textContent = m.tMin > 0 ? m.tMin.toFixed(1) : '--';
  if (elMinSub) elMinSub.textContent = 'En Vivo';

  var isAlert = (m.dt > 12.0) || (m.tMax >= 35.0);
  if (card) card.className = 'trend-card-container therm ' + (isAlert ? 'alert' : 'ok');
  if (elBadge) {
    elBadge.textContent = isAlert ? 'ΔT > 12°C DESBALANCE' : 'ΔT CONTROLADO (HVAC)';
    elBadge.className = 'trend-badge ' + (isAlert ? 'alert' : 'ok');
  }
  if (elDiag) {
    var strMax = m.tMax > 0 ? (' (T.Máx ' + m.tMax.toFixed(1) + '°C)') : '';
    elDiag.innerHTML = 'Estado: <strong style="color:' + (isAlert ? '#ef4444' : '#64B856') + ';">' +
                       (isAlert ? 'Desbalance Térmico Crítico' : ('Climatizado / Seguro' + strMax)) + '</strong>';
  }
};

self.onHoverPoint = function(params) {
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (!container || !params || params.length === 0) return;

  var d = new Date(params[0].value[0]);
  var months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var timeStr = months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);

  var dtVal = null, tMaxVal = null, tMinVal = null;
  for (var i = 0; i < params.length; i++) {
    var p = params[i];
    var sName = p.seriesName || '';
    if (sName.indexOf('ΔT') !== -1 || sName.indexOf('Dispersión') !== -1) {
      dtVal = parseFloat(p.value[1]);
    } else if (sName.indexOf('Máx') !== -1) {
      tMaxVal = parseFloat(p.value[1]);
    } else if (sName.indexOf('Mín') !== -1) {
      tMinVal = parseFloat(p.value[1]);
    }
  }

  if (tMaxVal === null && self.tMaxMap) {
    tMaxVal = self.tMaxMap[params[0].value[0]] || null;
  }
  if (tMinVal === null && self.tMinMap) {
    tMinVal = self.tMinMap[params[0].value[0]] || null;
  }

  var elDt = container.querySelector('#dt-live-val');
  var elDtSub = container.querySelector('#dt-sub-val');
  var elMax = container.querySelector('#tmax-live-val');
  var elMaxSub = container.querySelector('#tmax-sub-val');
  var elMin = container.querySelector('#tmin-live-val');
  var elMinSub = container.querySelector('#tmin-sub-val');
  var elBadge = container.querySelector('#therm-trend-badge');
  var elDiag = container.querySelector('#therm-diag-text');

  if (dtVal !== null && elDt) {
    elDt.textContent = dtVal.toFixed(1);
    if (elDtSub) elDtSub.textContent = timeStr;
  }
  if (tMaxVal !== null && elMax) {
    elMax.textContent = tMaxVal.toFixed(1);
    if (elMaxSub) elMaxSub.textContent = timeStr;
  }
  if (tMinVal !== null && elMin) {
    elMin.textContent = tMinVal.toFixed(1);
    if (elMinSub) elMinSub.textContent = timeStr;
  }

  var evalDt = dtVal !== null ? dtVal : (self.cardMetrics ? self.cardMetrics.dt : 0);
  var evalTmax = tMaxVal !== null ? tMaxVal : (self.cardMetrics ? self.cardMetrics.tMax : 0);
  var isAlert = (evalDt > 12.0) || (evalTmax >= 35.0);

  if (elBadge) {
    elBadge.textContent = isAlert ? 'ΔT > 12°C DESBALANCE' : 'ΔT CONTROLADO (HVAC)';
    elBadge.className = 'trend-badge ' + (isAlert ? 'alert' : 'ok');
  }
  if (elDiag) {
    var strMax = evalTmax > 0 ? (' (T.Máx ' + evalTmax.toFixed(1) + '°C)') : '';
    elDiag.innerHTML = 'Estado: <strong style="color:' + (isAlert ? '#ef4444' : '#64B856') + ';">' +
                       (isAlert ? 'Desbalance Térmico Crítico' : ('Climatizado / Seguro' + strMax)) + '</strong>';
  }
};

self.smoothSeries = function(pts, targetWindow) {
  if (!pts || pts.length <= 5) return pts;
  var w = targetWindow || 15;
  if (pts.length < 150) w = 3;
  else if (pts.length < 600) w = 7;
  else w = 15;

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
    res.push([pts[i][0], Math.round((sum / count) * 10) / 10]);
  }
  return res;
};

self.onDataUpdated = function() {
  var data = self.ctx.data || [];
  var rawDtSeries = [], rawTmaxSeries = [], rawTminSeries = [];
  var dtLatest = 0.0, tMaxLatest = 0.0, tMinLatest = 0.0;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var pts = item.data || [];
    var k = (item.dataKey.name || item.dataKey.label || '').toLowerCase();

    if (pts.length > 0) {
      var lastVal = parseFloat(pts[pts.length - 1][1]) || 0;
      if (k.indexOf('delta_temp_bateria') !== -1 || k.indexOf('delta_t') !== -1) {
        rawDtSeries = pts.map(function(p) { return [p[0], parseFloat(p[1]) || 0]; });
        dtLatest = lastVal;
      } else if (k.indexOf('temp_bateria_max') !== -1) {
        rawTmaxSeries = pts.map(function(p) { return [p[0], parseFloat(p[1]) || 0]; });
        tMaxLatest = lastVal;
      } else if (k.indexOf('temp_bateria_min') !== -1) {
        rawTminSeries = pts.map(function(p) { return [p[0], parseFloat(p[1]) || 0]; });
        tMinLatest = lastVal;
      }
    }
  }

  self.tMaxMap = {};
  for (var a = 0; a < rawTmaxSeries.length; a++) {
    self.tMaxMap[rawTmaxSeries[a][0]] = rawTmaxSeries[a][1];
  }
  self.tMinMap = {};
  for (var b = 0; b < rawTminSeries.length; b++) {
    self.tMinMap[rawTminSeries[b][0]] = rawTminSeries[b][1];
  }

  if (rawDtSeries.length === 0 && rawTmaxSeries.length > 0 && rawTminSeries.length > 0) {
    rawDtSeries = rawTmaxSeries.map(function(p) {
      var tmin = self.tMinMap[p[0]] || tMinLatest;
      return [p[0], Math.max(0, p[1] - tmin)];
    });
    dtLatest = Math.max(0, tMaxLatest - tMinLatest);
  }

  self.cardMetrics = {
    dt: dtLatest,
    tMax: tMaxLatest,
    tMin: tMinLatest
  };

  self.restoreDefaultCards();

  if (!self.myChart) {
    self.initChart();
  }
  if (!self.myChart) return;

  var cleanDtSeries = self.smoothSeries(rawDtSeries, 15);
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
        var out = '<div style="font-weight:700; margin-bottom:5px; color:#64B856; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">📅 ' + timeStr + '</div>';
        
        var curDt = 0;
        params.forEach(function(p) {
          if (p.seriesName.indexOf('ΔT') !== -1) curDt = parseFloat(p.value[1]);
          out += '<div style="display:flex; justify-content:space-between; gap:16px; margin: 3px 0;">' +
                 '<span>' + p.marker + ' ' + p.seriesName + ':</span>' +
                 '<strong style="color:#ffffff;">' + p.value[1] + ' °C</strong>' +
                 '</div>';
        });

        var tMaxPt = self.tMaxMap ? self.tMaxMap[params[0].value[0]] : null;
        var tMinPt = self.tMinMap ? self.tMinMap[params[0].value[0]] : null;

        if (tMaxPt !== null && tMaxPt !== undefined) {
          out += '<div style="display:flex; justify-content:space-between; gap:16px; margin: 3px 0;">' +
                 '<span><span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:#ef4444;"></span>Ref. Máx (T.Caliente):</span>' +
                 '<strong style="color:#ef4444;">' + tMaxPt.toFixed(1) + ' °C</strong>' +
                 '</div>';
        }
        if (tMinPt !== null && tMinPt !== undefined) {
          out += '<div style="display:flex; justify-content:space-between; gap:16px; margin: 3px 0;">' +
                 '<span><span style="display:inline-block;margin-right:4px;border-radius:10px;width:8px;height:8px;background-color:#38bdf8;"></span>Ref. Mín (T.Fría HVAC):</span>' +
                 '<strong style="color:#38bdf8;">' + tMinPt.toFixed(1) + ' °C</strong>' +
                 '</div>';
        }

        var isAlert = curDt > 12.0;
        out += '<div style="margin-top:6px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.1); font-size:10px; color:' + (isAlert ? '#ef4444' : '#64B856') + ';">' +
               '<strong>Estado: ' + (isAlert ? 'ΔT > 12°C Alarma Desbalance' : 'Gradiente Controlado por HVAC') + '</strong></div>';
        return out;
      }
    },
    grid: {
      left: 38,
      right: 35,
      top: 15,
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
          lineStyle: { color: '#64B856', width: 1 },
          areaStyle: { color: 'rgba(100, 184, 86, 0.25)' }
        },
        selectedDataBackground: {
          lineStyle: { color: '#f97316', width: 1 },
          areaStyle: { color: 'rgba(249, 115, 22, 0.4)' }
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
    ],
    yAxis: {
      type: 'value',
      position: 'left',
      min: 0,
      max: function(v) {
        return Math.max(15, Math.ceil(v.max + 2));
      },
      axisLine: { show: false },
      axisLabel: { color: '#64B856', fontSize: 10, formatter: '{value} °C' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    series: [
      {
        name: 'Dispersión Térmica BESS (ΔT)',
        type: 'line',
        data: cleanDtSeries,
        smooth: 0.35,
        showSymbol: false,
        lineStyle: { color: '#64B856', width: 2.2 },
        itemStyle: { color: '#64B856' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 184, 86, 0.32)' },
              { offset: 1, color: 'rgba(100, 184, 86, 0.0)' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 12.0,
              lineStyle: { color: 'rgba(239, 68, 68, 0.85)', type: 'dashed', width: 1.5 },
              label: {
                show: true,
                position: 'end',
                formatter: 'LÍMITE 12°C',
                color: '#ef4444',
                fontSize: 9,
                fontWeight: 'bold'
              }
            }
          ]
        }
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
