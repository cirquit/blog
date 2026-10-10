// Optional: arrow keys and horizontal swipe follow the prev/next links.
(function () {
  var prev = document.querySelector('a[rel=prev]');
  var next = document.querySelector('a[rel=next]');
  function go(a) { if (a) location.href = a.href; }
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowLeft') go(prev);
    else if (e.key === 'ArrowRight') go(next);
  });
  var x0, y0;
  document.addEventListener('touchstart', function (e) {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) go(dx > 0 ? prev : next);
  }, { passive: true });
})();
