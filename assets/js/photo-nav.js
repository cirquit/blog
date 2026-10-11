(function () {
  function link(sel) {
    return [].find.call(document.querySelectorAll(sel), function (a) {
      return a.getClientRects().length > 0;
    });
  }
  function go(a) { if (a) location.href = a.href; }
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowLeft') go(link('a[rel=prev]'));
    else if (e.key === 'ArrowRight') go(link('a[rel=next]'));
    else if (e.key === 'Escape') go(link('a.close'));
  });
  var x0, y0;
  document.addEventListener('touchstart', function (e) {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) go(link(dx > 0 ? 'a[rel=prev]' : 'a[rel=next]'));
  }, { passive: true });
  // Prefetch the next photo after this one has loaded; never added to the page.
  addEventListener('load', function () {
    var d = (document.querySelector('[data-next-src]') || {}).dataset;
    if (!d) return;
    var img = new Image();
    img.fetchPriority = 'low';
    if (d.nextSrcset) { img.sizes = d.nextSizes; img.srcset = d.nextSrcset; }
    img.src = d.nextSrc;
  });
})();
