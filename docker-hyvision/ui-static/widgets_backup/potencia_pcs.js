self.onInit = function() { self.onDataUpdated(); };
self.onDataUpdated = function() {
  var data = self.ctx.data;
  var p1 = 15.0, p2 = 14.9, p3 = 14.9;
  var nominalMax = 250.0;

  if (data && data.length > 0) {
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item.data && item.data.length > 0) {
        var v = parseFloat(item.data[item.data.length - 1][1]);
        var k = (item.dataKey.label || item.dataKey.name || "").toLowerCase();
        if (!isNaN(v)) {
          if (k.indexOf('pcs1') !== -1 || i === 0) p1 = v;
          else if (k.indexOf('pcs2') !== -1 || i === 1) p2 = v;
          else if (k.indexOf('pcs3') !== -1 || i === 2) p3 = v;
        }
      }
    }
  }

  var total = p1 + p2 + p3;
  var maxVal = Math.max(p1, p2, p3, nominalMax, 1);
  var container = self.ctx.$container ? self.ctx.$container[0] : null;
  if (container) {
    var elTot = container.querySelector('#pac-total-val');
    if (elTot) elTot.textContent = total.toFixed(1);

    var setRow = function(idVal, idBar, val) {
      var ev = container.querySelector(idVal);
      var eb = container.querySelector(idBar);
      if (ev) ev.textContent = val.toFixed(1) + ' kW';
      if (eb) eb.style.width = Math.min(100, Math.max(0, (val / maxVal) * 100)) + '%';
    };
    setRow('#pac-pcs1-val', '#pac-pcs1-bar', p1);
    setRow('#pac-pcs2-val', '#pac-pcs2-bar', p2);
    setRow('#pac-pcs3-val', '#pac-pcs3-bar', p3);
  }
};
self.onDestroy = function() {};