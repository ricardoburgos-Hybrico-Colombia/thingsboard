self.onInit = function() { self.onDataUpdated(); };
self.onDataUpdated = function() {
  var data = self.ctx.data;
  var igbt = [48.5, 47.8, 49.1];
  var amb = [29.2, 28.9, 29.5];

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('igbt_pcs1') !== -1) igbt[0] = v;
          else if (k.indexOf('igbt_pcs2') !== -1) igbt[1] = v;
          else if (k.indexOf('igbt_pcs3') !== -1) igbt[2] = v;
          else if (k.indexOf('amb_pcs1') !== -1) amb[0] = v;
          else if (k.indexOf('amb_pcs2') !== -1) amb[1] = v;
          else if (k.indexOf('amb_pcs3') !== -1) amb[2] = v;
        }
      }
    }
  }

  var maxTemp = Math.max.apply(null, igbt);
  var status = 'safe';
  var badgeText = 'ÓPTIMO (<65°C)';
  if (maxTemp >= 80) {
    status = 'danger';
    badgeText = 'CRÍTICO (>80°C)';
  } else if (maxTemp >= 65) {
    status = 'warning';
    badgeText = 'ELEVADO (>65°C)';
  }

  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var card = container.querySelector('#thermal-card');
    if (card) card.className = 'pcs-card-container thermal ' + status;

    var elMax = container.querySelector('#max-temp-val');
    if (elMax) {
      elMax.textContent = maxTemp.toFixed(1);
      elMax.className = 'main-num thermal ' + status;
    }

    var elBadge = container.querySelector('#thermal-badge');
    if (elBadge) {
      elBadge.textContent = badgeText;
      elBadge.className = 'pcs-badge thermal ' + status;
    }

    for (var idx = 0; idx < 3; idx++) {
      var elI = container.querySelector('#t-igbt' + (idx + 1));
      var elA = container.querySelector('#t-amb' + (idx + 1));
      if (elI) {
        elI.textContent = igbt[idx].toFixed(1) + ' °C';
        elI.className = 't-value ' + (igbt[idx] >= 80 ? 'danger' : (igbt[idx] >= 65 ? 'warning' : 'safe'));
      }
      if (elA) elA.textContent = amb[idx].toFixed(1) + ' °C';
    }
  }
};
self.onDestroy = function() {};