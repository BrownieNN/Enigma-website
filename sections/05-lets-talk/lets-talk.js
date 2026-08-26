/* ENIGMA / 05 — Let's Talk!
   Extracted from index.html:1509–1646 (typeLetsTalk).
   No library dependency.

   Changed for CMS use: the `#view-aldo` page-scope prefix on the panel
   selector is dropped, and the caret path is root-relative.

   Replay hook: window.__LETS.retype() */

/* ---- Contact "Let's Talk!" types itself in, same cadence and blink logic as the Hello
   greetings. Intro-blinks, types "Let's", moves to the second line, types "Talk!" left to
   right, then rests blinking. Fires once; __LETS.retype() replays.

   The untyped remainder of each word stays in the DOM as a `visibility: hidden` span, so the
   line always occupies its FULL width and height. That matters most on line 2, which is
   ranged right: without it, characters would build out leftwards from the right margin
   instead of reading left to right. It also means the 365px line boxes never collapse, so no
   height pinning is needed.

   One caret PER LINE (only one ever visible) so both lines reserve the caret's width from
   the start -- a single shared caret would make the right-aligned line jump sideways by its
   width the moment it arrived. ---- */
(function typeLetsTalk() {
  var panel = document.querySelector(".al-lets");
  if (!panel) return;
  var lines = [].slice.call(panel.querySelectorAll(".al-lets-line"));
  if (lines.length < 2) return;

  var WORDS = lines.map(function (l) { return l.textContent.trim(); });
  var TYPE = 105, BLINK = 260, INTRO_BLINKS = 3, LINE_GAP = 380;
  var typedEls = [], restEls = [], carets = [], runs = [], restTimer = null, started = false;

  function build() {
    if (restTimer) { clearInterval(restTimer); restTimer = null; }
    panel.setAttribute("aria-label", WORDS.join(" "));
    lines.forEach(function (l, i) {
      l.setAttribute("aria-hidden", "true");
      l.textContent = "";

      // Everything lives inside a fixed-width RUN. See pinRunWidths().
      var run = document.createElement("span");
      run.className = "al-lets-run";
      var typed = document.createElement("span");
      var caret = document.createElement("img");
      caret.className = "type-cursor";
      caret.src = "/assets/aldo/cursor.svg";
      caret.alt = "";
      caret.setAttribute("aria-hidden", "true");
      caret.style.opacity = "0";
      var rest = document.createElement("span");
      rest.className = "al-lets-rest";
      rest.textContent = WORDS[i];      // holds the full width from the outset

      run.appendChild(typed);
      run.appendChild(caret);
      run.appendChild(rest);
      l.appendChild(run);
      typedEls[i] = typed; carets[i] = caret; restEls[i] = rest; runs[i] = run;
    });
    pinRunWidths();
  }

  /* Pin each run to the width of its FINISHED state (whole word + caret).
     Splitting a word across two spans breaks the kerning pair at the split, so
     `typed + rest` does NOT sum to the unsplit word's width -- measured a 17.4px jump at
     the "Tal|k!" boundary, which shunted the ranged-right second line sideways mid-type.
     With the run's width fixed, splits can only move the caret INSIDE it; the word's own
     left edge never moves. The reserved width includes the caret, which is also what gives
     "Talk!" its gap from the right margin to sit the cursor in. */
  function pinRunWidths() {
    runs.forEach(function (run, i) {
      var t = typedEls[i].textContent, r = restEls[i].textContent;
      typedEls[i].textContent = WORDS[i];
      restEls[i].textContent = "";
      run.style.width = "";
      run.style.width = run.getBoundingClientRect().width + "px";
      typedEls[i].textContent = t;
      restEls[i].textContent = r;
    });
  }

  function stopBlink(c) { if (restTimer) { clearInterval(restTimer); restTimer = null; } c.style.opacity = "1"; }
  function restBlink(c) {
    stopBlink(c);
    var on = true;
    restTimer = setInterval(function () { on = !on; c.style.opacity = on ? "1" : "0"; }, 530);
  }
  function introBlink(c, times, cb) {
    var k = 0;
    c.style.opacity = "0";
    var iv = setInterval(function () {
      k++;
      c.style.opacity = (k % 2) ? "1" : "0";
      if (k >= times * 2) { clearInterval(iv); c.style.opacity = "1"; cb(); }
    }, BLINK);
  }
  // Characters move from the hidden remainder into the typed span, so the caret advances
  // left to right through a block that never changes width.
  function typeInto(idx, cb) {
    var w = WORDS[idx], n = 0;
    (function step() {
      n++;
      typedEls[idx].textContent = w.slice(0, n);
      restEls[idx].textContent = w.slice(n);
      if (n < w.length) setTimeout(step, TYPE); else cb();
    })();
  }

  function run() {
    introBlink(carets[0], INTRO_BLINKS, function () {
      typeInto(0, function () {
        setTimeout(function () {
          carets[0].style.opacity = "0";      // hand the caret to the next line
          carets[1].style.opacity = "1";
          typeInto(1, function () { restBlink(carets[1]); });
        }, LINE_GAP);
      });
    });
  }

  build();

  /* AD 2026-07-30: the typing started far too early on phones. The panel is 800u tall on
     desktop but only ~210px on a phone, so a 0.3 threshold fired on a 63px SLIVER at the very
     bottom edge of the screen -- and since the headline is 134px tall starting 24px in, barely
     a third of the type was even on screen when it began. It had finished before you could
     read it.

     Phones therefore watch the HEADLINE rather than the whole panel (so the trigger tracks the
     type, not the box around it), and rootMargin holds it off until the head clears the bottom
     30% of the viewport. Desktop keeps the panel + 0.3 it was tuned with. */
  var PHONE_LETS = window.matchMedia("(max-width: 599px)").matches;
  var letsTarget = (PHONE_LETS && panel.querySelector(".al-lets-head")) || panel;
  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !started) { started = true; io.disconnect(); run(); }
  }, PHONE_LETS
    ? { threshold: 0.6, rootMargin: "0px 0px -30% 0px" }
    : { threshold: 0.3 });
  io.observe(letsTarget);

  // Re-measure on resize: --u changes the type size, so the run widths change with it.
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(pinRunWidths, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pinRunWidths);

  window.__LETS = { retype: function () { build(); run(); } };
})();
