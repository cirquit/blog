/*
 * Gallery viewer -- the site's one deliberate JavaScript exception.
 *
 * Everything else on this site (posts, tags, the inline photo lightbox) is
 * pure CSS and stays that way. Cross-photo navigation is the one thing CSS
 * genuinely cannot do: there is no selector-level way to jump from one
 * slide to another.
 *
 * There is no thumbnail grid -- a gallery's page IS this viewer, at its own
 * URL, which is how a gallery gets linked at all. Without this script, the
 * slide strip is still a real native CSS scroll-snap carousel: swipe/scroll
 * works, just without synced metadata, buttons, or the title/note behavior.
 * Slide 0 doubles as the gallery's cover (permanent title, gallery-level
 * metadata/description instead of that photo's own).
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
  var closeLink  = root.querySelector('.gv-close');
  var titleBtn   = document.getElementById('gv-title-reveal');
  var titleEl    = root.querySelector('.gallery-title');

  var coverMeta = root.dataset.coverMeta || '';
  var coverNote = root.dataset.coverNote || '';

  var SETTING_KEY   = 'gv:title-reveal';
  var TITLE_FALLBACK_MS = 3000;  // reduced-motion only: hold, no animated fade
  var FADE_MS       = 160;       // half of the crossfade
  var EDGE_FRAC     = 0.18;      // how close to an edge counts as "approaching" it
  var NOTE_MIN_W    = 230;       // px of *usable* gutter needed to host the note

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0;
  var titleFallbackTimer = null;
  var markTimers = {};
  var rafPending = false;

  /* ---------------------------------------------------------------- state */

  function titleEnabled() {
    return !!(titleBtn && titleBtn.getAttribute('aria-pressed') === 'true');
  }

  function loadSetting() {
    if (!titleBtn) { return; }
    var stored = null;
    try { stored = window.localStorage.getItem(SETTING_KEY); } catch (e) { /* private mode */ }
    setTitleEnabled(stored === null ? true : stored === '1');   // default: on
  }

  function setTitleEnabled(on) {
    titleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    titleBtn.setAttribute('aria-label', 'Title reveal ' + (on ? 'on' : 'off') + ' (T)');
    try { window.localStorage.setItem(SETTING_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- title */

  // One fixed timeline, always: instant at full opacity, then a linear fade
  // starting partway through. The whole curve lives in the CSS keyframe
  // (_gallery-title.scss) -- this function only (re)starts it. Restarting an
  // already-finished CSS animation needs the class removed and the element
  // reflowed before re-adding it, or the browser treats it as a no-op.
  function flashTitle() {
    if (!titleEl || !titleEnabled() || current === 0) { return; }  // slide 0 is permanent, not flashed
    positionTitle();
    window.clearTimeout(titleFallbackTimer);
    titleEl.classList.remove('is-revealed');
    void titleEl.offsetWidth;   // force reflow so the animation restarts
    titleEl.classList.add('is-revealed');
    if (reduced.matches) {
      // The CSS animation is suppressed under reduced motion (see the media
      // query), so this is the only thing that ever removes the class there.
      titleFallbackTimer = window.setTimeout(hideTitle, TITLE_FALLBACK_MS);
    }
  }

  function hideTitle() {
    window.clearTimeout(titleFallbackTimer);
    if (titleEl) { titleEl.classList.remove('is-revealed'); }
  }

  // The cover (slide 0) shows its title permanently -- no flash, no fade,
  // just always on for as long as you're looking at the cover. Every other
  // slide gets the timed flash. This is the only difference between the two;
  // everything else (position, the component itself) is identical.
  function updateTitleMode() {
    if (!titleEl) { return; }
    var isCover = current === 0;
    titleEl.classList.toggle('is-cover', isCover);
    if (isCover) { hideTitle(); }   // no flash timers running behind the cover
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

  // The cover (slide 0) shows the gallery's own description instead of that
  // photo's note -- same field, same rules, just a different source.
  function noteFor(i) {
    if (i === 0) { return coverNote; }
    return slides[i].getAttribute('data-note') || '';
  }

  // Adaptive placement: the side gutter when one is wide enough (a portrait
  // photo on a wide screen), otherwise the tap-to-expand dropdown that
  // overlays the bottom of the photo behind a gradient.
  function placeNote() {
    var note = noteFor(current);
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
      noteBox.style.left   = (rect.right + 24) + 'px';
      noteBox.style.top    = rect.top + 'px';
      noteBox.style.bottom = '';
    } else {
      // "One line below the image": anchor to the image's own measured
      // bottom edge, not the viewport's. This is the same rule gutter mode
      // already follows -- one placement code path, not two, so there is no
      // way for one of them to silently drift out of sync with the other.
      noteBox.style.left   = rect.left + 'px';
      noteBox.style.width  = rect.width + 'px';
      noteBox.style.top    = (rect.bottom + 8) + 'px';
      noteBox.style.bottom = '';
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

  // positionTitle() needs the image's real rendered box. A lazy-loaded image
  // that hasn't finished loading yet has no intrinsic size, so its rect is
  // 0x0 and the title silently ends up unpositioned (defaulting to the
  // corner) until something repositions it later. Wait for the actual image
  // rather than trusting that it's already there.
  function flashTitleForSlide(i) {
    var img = slides[i] && slides[i].querySelector('img');
    if (img && !img.complete) {
      img.addEventListener('load', flashTitle, { once: true });
      return;
    }
    flashTitle();
  }

  function sync(navigated) {
    var i = indexFromScroll();
    var changed = i !== current;
    current = i;
    if (metaBox) { metaBox.textContent = (i === 0 ? coverMeta : slides[i].getAttribute('data-meta')) || ''; }
    placeNote();
    updateTitleMode();
    positionTitle();
    if (changed || navigated) { flashTitleForSlide(i); }
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

  /* -------------------------------------------------------------- wiring */

  if (prevBtn) { prevBtn.addEventListener('click', function () { go(-1); }); }
  if (nextBtn) { nextBtn.addEventListener('click', function () { go(1); }); }
  if (noteToggle) { noteToggle.addEventListener('click', toggleNote); }

  if (titleBtn) {
    loadSetting();
    titleBtn.addEventListener('click', function () {
      var on = !titleEnabled();
      setTitleEnabled(on);
      if (on) { flashTitle(); } else { hideTitle(); }
    });
  }

  // Keyboard is bound to the viewer's own root, never to document, so it
  // can't hijack keys anywhere else on the page. Escape follows the same
  // real link "back to galleries" already in the markup -- there is no
  // separate JS-only close state to manage.
  root.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft')  { ev.preventDefault(); go(-1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
    else if (ev.key === 'Escape' && closeLink) { closeLink.click(); }
    else if (ev.key === 't' || ev.key === 'T') { ev.preventDefault(); titleBtn && titleBtn.click(); }
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

  // Hovering the stage (mouse) or tapping the photo (touch) both play the
  // same fixed-timeline flash on non-cover slides -- one trigger path, not a
  // hover-mode and a tap-mode with different hold behavior. Clicking the
  // black margin does nothing; the only way back is the real link, Escape,
  // or the browser's own back button.
  strip.addEventListener('pointerenter', function (ev) {
    if (ev.pointerType !== 'touch') { flashTitle(); }
  });
  strip.addEventListener('click', function (ev) {
    if (ev.target.tagName === 'IMG') { flashTitle(); }
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
    strip.scrollLeft = current * strip.clientWidth;
    placeNote();
    positionTitle();
  });

  /* --------------------------------------------------------------- init */

  // The page loads straight into the viewer, on the cover slide -- there is
  // no separate "open" step. Reading clientWidth forces layout, so this is
  // already correct synchronously.
  strip.scrollLeft = 0;
  sync(true);
}());
