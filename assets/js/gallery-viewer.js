/*
 * Gallery viewer -- the site's one deliberate JavaScript exception.
 *
 * Everything else on this site (posts, tags, the gallery grid, the inline
 * photo lightbox) is pure CSS and stays that way. Cross-photo navigation is
 * the one thing CSS genuinely cannot do: jumping from one <details>' open
 * state to another's has no selector-level mechanism.
 *
 * This file is a progressive enhancement, not a dependency. With it off,
 * the grid's CSS-only <details> lightbox still opens each photo. With it on,
 * the thumbnails instead open the full-frame viewer, which adds prev/next,
 * the crossfade, the title reveal and the title-reveal setting.
 *
 * Self-hosted and vendored -- no build step, no dependencies, no network.
 * Loaded (deferred) only by _layouts/gallery.html.
 */
(function () {
  'use strict';

  var root = document.getElementById('gallery-viewer');
  if (!root) { return; }

  var strip  = document.getElementById('gv-strip');
  var slides = Array.prototype.slice.call(root.querySelectorAll('.gv-slide'));
  if (!strip || !slides.length) { return; }

  var metaBox    = document.getElementById('gv-meta');
  var noteBox    = document.getElementById('gv-note');
  var noteText   = noteBox.querySelector('.gv-note-text');
  var noteToggle = root.querySelector('.gv-note-toggle');
  var prevBtn    = root.querySelector('.gv-nav--prev');
  var nextBtn    = root.querySelector('.gv-nav--next');
  var closeBtn   = root.querySelector('.gv-close');
  var setting    = document.getElementById('gv-title-reveal');
  var titleEl    = root.querySelector('.gallery-title');

  var SETTING_KEY = 'gv:title-reveal';
  var TITLE_HOLD  = 2000;   // spec: hold the reveal exactly 2s per navigation
  var FADE_MS     = 160;    // half of the crossfade
  var EDGE_FRAC   = 0.18;   // how close to an edge counts as "approaching" it
  var NOTE_MIN_W  = 230;    // px of *usable* gutter needed to host the note

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0;
  var opened  = false;
  var titleTimer = null;
  var markTimers = {};
  var rafPending = false;
  var lastFocus  = null;

  // Tell the stylesheet the enhancement is live, so the CSS-only lightbox
  // markup can step aside (its full-size <img>s stay display:none and are
  // therefore never fetched -- no double download).
  document.documentElement.classList.add('gv-js');

  /* ---------------------------------------------------------------- state */

  function titleEnabled() {
    return !!(setting && setting.checked);
  }

  function loadSetting() {
    if (!setting) { return; }
    var stored = null;
    try { stored = window.localStorage.getItem(SETTING_KEY); } catch (e) { /* private mode */ }
    setting.checked = stored === null ? true : stored === '1';   // default: on
  }

  function saveSetting() {
    try { window.localStorage.setItem(SETTING_KEY, setting.checked ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- title */

  function showTitle(hold) {
    if (!titleEl || !titleEnabled()) { return; }
    window.clearTimeout(titleTimer);
    positionTitle();
    titleEl.classList.add('is-revealed');
    if (hold) {
      titleTimer = window.setTimeout(hideTitle, TITLE_HOLD);
    }
  }

  function hideTitle() {
    window.clearTimeout(titleTimer);
    if (titleEl) { titleEl.classList.remove('is-revealed'); }
  }

  // "Positioned to fit the specific photo's composition": anchor to the
  // image's own rendered box and scale with it, rather than a fixed corner
  // of the frame that would sit in dead space beside a portrait photo.
  function positionTitle() {
    if (!titleEl) { return; }
    var img = slides[current] && slides[current].querySelector('img');
    if (!img) { return; }
    var r = img.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    var size = Math.max(20, Math.min(r.width * 0.11, 92));
    titleEl.style.left     = r.left + 'px';
    titleEl.style.width    = r.width + 'px';
    titleEl.style.top      = (r.top + r.height * 0.62) + 'px';
    titleEl.style.height   = (r.height * 0.38) + 'px';
    titleEl.style.fontSize = size + 'px';
  }

  /* ----------------------------------------------------------------- note */

  // Adaptive placement: the side gutter when one is wide enough (a portrait
  // photo on a wide screen), otherwise the tap-to-expand dropdown that
  // overlays the bottom of the photo behind a gradient.
  function placeNote() {
    var note = slides[current] ? slides[current].getAttribute('data-note') : '';
    var has  = !!(note && note.trim());
    root.classList.toggle('gv-has-note', has);
    if (noteText) { noteText.textContent = note || ''; }
    if (!has) { collapseNote(); return; }

    // Usable gutter = the space beside the photo, less the breathing room
    // and the edge zone the next-triangle lives in. Wide enough, and the
    // note goes there; otherwise it becomes the tap-to-expand dropdown.
    var img  = slides[current].querySelector('img');
    var rect = img ? img.getBoundingClientRect() : null;
    var zone = nextBtn ? nextBtn.getBoundingClientRect().width : 0;
    var gutter = rect && rect.width ? (root.clientWidth - rect.width) / 2 : 0;
    var usable = gutter - 24 - zone;
    var inGutter = usable >= NOTE_MIN_W;
    root.classList.toggle('gv-note-gutter', inGutter);
    root.classList.toggle('gv-note-drop', !inGutter);

    if (inGutter) {
      collapseNote();                       // the toggle is irrelevant here
      noteBox.style.left  = (rect.right + 24) + 'px';
      noteBox.style.width = Math.min(usable, 640) + 'px';
      noteBox.style.top   = rect.top + 'px';
    } else {
      noteBox.style.left = '';
      noteBox.style.width = '';
      noteBox.style.top = '';
    }
  }

  function collapseNote() {
    root.classList.remove('gv-note-open');
    if (noteToggle) {
      noteToggle.setAttribute('aria-expanded', 'false');
      noteToggle.setAttribute('aria-label', 'Show note');
    }
  }

  function toggleNote() {
    var open = root.classList.toggle('gv-note-open');
    noteToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    noteToggle.setAttribute('aria-label', open ? 'Hide note' : 'Show note');
  }

  /* ------------------------------------------------------------ nav marks */

  function showMark(side, timeout) {
    root.classList.add('gv-near-' + side);
    window.clearTimeout(markTimers[side]);
    if (timeout) {
      markTimers[side] = window.setTimeout(function () {
        root.classList.remove('gv-near-' + side);
      }, timeout);
    }
  }

  function hideMark(side) {
    window.clearTimeout(markTimers[side]);
    root.classList.remove('gv-near-' + side);
  }

  function markVisible(side) {
    return root.classList.contains('gv-near-' + side);
  }

  /* ------------------------------------------------------------ navigate */

  function indexFromScroll() {
    var w = strip.clientWidth || 1;
    return Math.max(0, Math.min(slides.length - 1, Math.round(strip.scrollLeft / w)));
  }

  function sync(navigated) {
    var i = indexFromScroll();
    var changed = i !== current;
    current = i;
    if (metaBox) { metaBox.textContent = slides[i].getAttribute('data-meta') || ''; }
    placeNote();
    positionTitle();
    if (changed || navigated) { showTitle(true); }
    if (prevBtn) { prevBtn.disabled = i === 0; }
    if (nextBtn) { nextBtn.disabled = i === slides.length - 1; }
  }

  // Crossfade, never a slide motion: fade the strip out, jump the scroll
  // position, fade back in. Swiping still gets the native scroll-snap
  // movement -- this is only the button/keyboard path.
  function goTo(i, animate) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    var x = i * strip.clientWidth;
    if (!animate || reduced.matches) {
      strip.scrollLeft = x;
      sync(true);
      return;
    }
    strip.classList.add('is-fading');
    window.setTimeout(function () {
      strip.scrollLeft = x;
      strip.classList.remove('is-fading');
      sync(true);
    }, FADE_MS);
  }

  function go(delta) {
    goTo(current + delta, true);
  }

  /* -------------------------------------------------------- open / close */

  function open(i) {
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add('gv-open');
    opened = true;
    // Reading clientWidth after unhiding forces layout, so this is already
    // correct synchronously -- don't leave the persistent metadata line
    // empty waiting on a frame a throttled tab may not paint.
    current = i;
    strip.scrollLeft = i * strip.clientWidth;
    sync(true);
    root.focus();
    // Re-assert once the frame has settled (image decode can change the
    // rendered box, and the note/title are positioned against it).
    window.requestAnimationFrame(function () {
      strip.scrollLeft = current * strip.clientWidth;
      placeNote();
      positionTitle();
    });
  }

  function close() {
    if (!opened) { return; }
    opened = false;
    hideTitle();
    collapseNote();
    hideMark('left');
    hideMark('right');
    root.hidden = true;
    document.documentElement.classList.remove('gv-open');
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  /* -------------------------------------------------------------- wiring */

  // Thumbnails: take over the <details> disclosure instead of letting it open.
  Array.prototype.forEach.call(
    document.querySelectorAll('.photo-gallery-grid .photo-lightbox-summary'),
    function (summary, i) {
      summary.addEventListener('click', function (ev) {
        ev.preventDefault();
        open(i);
      });
      summary.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          open(i);
        }
      });
    }
  );

  if (prevBtn) { prevBtn.addEventListener('click', function () { go(-1); }); }
  if (nextBtn) { nextBtn.addEventListener('click', function () { go(1); }); }
  if (closeBtn) { closeBtn.addEventListener('click', close); }
  if (noteToggle) { noteToggle.addEventListener('click', toggleNote); }

  if (setting) {
    loadSetting();
    setting.addEventListener('change', function () {
      saveSetting();
      if (setting.checked) { showTitle(true); } else { hideTitle(); }
    });
  }

  // Keyboard is bound to the viewer's own root, never to document, so it
  // can't hijack arrow keys anywhere else on the page.
  root.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft')  { ev.preventDefault(); go(-1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
    else if (ev.key === 'Escape') { ev.preventDefault(); close(); }
  });

  // Proximity reveal: the mark fades in only as the cursor nears that edge.
  root.addEventListener('pointermove', function (ev) {
    if (ev.pointerType === 'touch') { return; }
    var frac = ev.clientX / root.clientWidth;
    if (frac <= EDGE_FRAC) { showMark('left'); } else { hideMark('left'); }
    if (frac >= 1 - EDGE_FRAC) { showMark('right'); } else { hideMark('right'); }
  });
  root.addEventListener('pointerleave', function () {
    hideMark('left');
    hideMark('right');
    hideTitle();
  });

  // Touch has no hover: the first tap in an edge zone reveals the mark,
  // the next one navigates. Swiping needs no mark at all.
  [[prevBtn, 'left'], [nextBtn, 'right']].forEach(function (pair) {
    var btn = pair[0], side = pair[1];
    if (!btn) { return; }
    btn.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'touch') { return; }
      if (!markVisible(side)) { ev.preventDefault(); }   // first tap only reveals
      showMark(side, 2500);
    });
  });

  // Hover over the stage reveals the title; leaving hides it again.
  strip.addEventListener('pointerenter', function (ev) {
    if (ev.pointerType === 'touch') { return; }
    showTitle(false);
  });

  // Tap/click on the photo reveals the title; on the black around it, closes
  // (inherited from the original <details> click-outside behavior).
  strip.addEventListener('click', function (ev) {
    if (ev.target.tagName === 'IMG') { showTitle(true); }
    else { close(); }
  });

  strip.addEventListener('scroll', function () {
    if (rafPending) { return; }
    rafPending = true;
    window.requestAnimationFrame(function () {
      rafPending = false;
      sync(false);
    });
  });

  window.addEventListener('resize', function () {
    if (!opened) { return; }
    strip.scrollLeft = current * strip.clientWidth;
    placeNote();
    positionTitle();
  });
}());
