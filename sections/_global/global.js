/* ============================================================
   ENIGMA — GLOBAL JS
   Paste once into the CMS site-wide JS field (or add the <script>
   tags below to the site template head/footer).

   Only two sections need a library:
     03-unignorability      → GSAP (uses gsap.ticker + gsap.utils.random)
     04-central-intelligence → three.js (WebGL metaball shader)

   Sections 01, 02 and 05 are dependency-free — if you are not
   using 03 or 04, this file can be skipped entirely.
   ============================================================ */

/* ---- Option A: self-host (what the source build does) -------------------
   Upload js/gsap.min.js, js/ScrollTrigger.min.js and js/three.min.js to
   the site root and add these tags BEFORE any section JS:

     <script src="/js/gsap.min.js"></script>
     <script src="/js/ScrollTrigger.min.js"></script>
     <script src="/js/three.min.js"></script>

   ---- Option B: loader (paste-able into a single CMS JS field) ----------
   Loads the same two libraries in order and fires `enigma:libs-ready`.
   Each section's JS waits for that event, so load order does not matter. */

(function enigmaLibs() {
  var SRC = {
    gsap:  "/js/gsap.min.js",
    st:    "/js/ScrollTrigger.min.js",
    three: "/js/three.min.js"
  };

  /* Only fetch what the page actually contains. */
  var needGsap  = !!document.querySelector(".al-constel");
  var needThree = !!document.querySelector(".al-resin-host");

  var queue = [];
  if (needGsap  && !window.gsap)  queue.push(SRC.gsap, SRC.st);
  if (needThree && !window.THREE) queue.push(SRC.three);

  function done() {
    window.__ENIGMA_LIBS_READY = true;
    document.dispatchEvent(new CustomEvent("enigma:libs-ready"));
  }

  (function next() {
    if (!queue.length) return done();
    var s = document.createElement("script");
    s.src = queue.shift();
    s.onload = next;
    s.onerror = next;          // a missing lib must not stall the rest
    document.head.appendChild(s);
  })();
})();

/* ---- Helper every section uses to defer until its libs exist ---- */
window.enigmaReady = function (fn) {
  if (window.__ENIGMA_LIBS_READY) return fn();
  document.addEventListener("enigma:libs-ready", fn, { once: true });
};
