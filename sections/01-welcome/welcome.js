/* ENIGMA / 01 — Welcome
   Extracted from index.html:1648–1724 (bigWordPan + bigWordFonts).

   PORTED: bigWordPan ran on gsap.ticker in the source build. The tick is a
   plain time-delta loop, so it is reproduced here on requestAnimationFrame —
   identical motion, and it keeps this section dependency-free (no GSAP).

   bigWordFonts is the per-character typeface flip. It is OFF in the source
   build (the AD called it "jumps around too much"; a bespoke SVG animation is
   meant to replace it). The flag and the code are carried over verbatim so it
   can be switched back on — set DISABLE_WELCOME_ANIM to false. */

(function () {
  var DISABLE_WELCOME_ANIM = true;   // gates ONLY bigWordFonts (the per-char swap)

  /* ---- Big background word: slow, seamless horizontal pan ---- */
  (function bigWordPan() {
    var tracks = document.querySelectorAll(".al-welcome .bigbg");
    if (!tracks.length) return;
    // Pixel-based marquee (not xPercent): x anchors the first copy's left edge, so when the
    // random font swap below changes the word width the visible copy does NOT jump. Two identical
    // copies + wrapping x by the current copy width keeps the loop seamless at any width.
    tracks.forEach(function (track) {
      var x = 0, last = 0;
      requestAnimationFrame(function tick(now) {
        requestAnimationFrame(tick);
        var dt = last ? now - last : 0;
        last = now;
        if (track.offsetParent === null) return;   // skip hidden blocks
        if (dt <= 0 || dt > 200) return;           // ignore backgrounded-tab jumps
        var w = track.scrollWidth / 2 || 1;        // width of one of the two copies
        x -= (w / 72) * (dt / 1000);               // one copy width per 72s, leftward
        if (x <= -w) x += w;                       // seamless wrap
        track.style.transform = "translateX(" + x + "px)";
      });
    });
  })();

  /* ---- "Unignorability" randomly flips a FEW characters' font (not the whole word). Applies to
          BOTH the headline word (front) AND the two background scroll copies (back), all in sync
          per welcome panel -- like the art director's mockup (e.g. "ab" -> italic). ---- */
  (function bigWordFonts() {
    if (DISABLE_WELCOME_ANIM) return;
    var panels = document.querySelectorAll(".al-welcome");
    if (!panels.length) return;
    var FONTS = [ // alternates only — non-selected chars stay the base Enigma Large
      ['"ABC Favorit Mono", monospace', "normal"],
      ['"ABC Gaisyr", serif', "italic"],
      ['"ABC Gaisyr", serif', "normal"],
      ['"Enigma Large Extended", serif', "normal"],
      ['"Helvetica Neue", sans-serif', "normal"]
    ];
    // Split the "Unignorability" text node that sits right before a .reg (®) into .ch char spans.
    function splitWord(reg) {
      var parent = reg.parentNode;
      var textNode = reg.previousSibling;
      if (!textNode || textNode.nodeType !== 3) return [];
      var text = textNode.textContent;
      parent.removeChild(textNode);
      var chars = [];
      text.split("").forEach(function (chr) {
        var s = document.createElement("span");
        s.className = "ch";
        s.textContent = chr;
        parent.insertBefore(s, reg);
        chars.push(s);
      });
      return chars;
    }
    panels.forEach(function (panel) {
      var regs = [];
      var h1reg = panel.querySelector("h1 .reg");              // the headline word (front)
      if (h1reg) regs.push(h1reg);
      panel.querySelectorAll(".bigbg span.cap > .reg, .bigbg span.cap .reg").forEach(function (r) { regs.push(r); }); // the 2 background copies (back)
      var charCols = regs.map(splitWord).filter(function (a) { return a.length; });
      if (!charCols.length) return;
      var n = charCols.reduce(function (m, a) { return Math.min(m, a.length); }, Infinity);
      (function tick() {
        charCols.forEach(function (chars) { chars.forEach(function (c) { c.style.fontFamily = ""; c.style.fontStyle = ""; }); });
        var count = 2 + Math.floor(Math.random() * 3); // 2-4 characters at a time
        for (var k = 0; k < count; k++) {
          var idx = Math.floor(Math.random() * n);
          var f = FONTS[Math.floor(Math.random() * FONTS.length)];
          charCols.forEach(function (chars) { // same index+font across headline + both bg copies -> synced
            chars[idx].style.fontFamily = f[0];
            chars[idx].style.fontStyle = f[1];
          });
        }
        setTimeout(tick, 1000 + Math.random() * 1300); // slower, calmer cadence
      })();
    });
  })();
})();
