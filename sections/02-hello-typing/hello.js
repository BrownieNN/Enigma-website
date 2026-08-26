/* ENIGMA / 02 — Hello (typewriter)
   Extracted from index.html:1441–1507 (typeGreetings).
   No library dependency.

   Changed for CMS use: the `#view-aldo` page-scope prefix on the h2 selector
   is dropped, and the caret path is root-relative (/assets/aldo/cursor.svg). */

/* ---- Hello title: typewriter with blinking cursor, triggered when the section scrolls into
   view. Types "Hello" first, then cycles the greetings. (Was the 14-col treatment; now the only
   one — the Aldo/Proposed fade cycle was removed with the scope strip.) ---- */
(function typeGreetings() {
  var h2 = document.querySelector(".al-hello-title h2");
  if (!h2) return;
  // NB: no "Hei" here — a trailing cursor makes it read "Heil". Fine in the fade version.
  var greetings = ["Hello", "Hola", "こんにちは", "Kia ora", "Ciao", "Bonjour",
    "Xin chào", "你好", "Hallo", "Aloha", "Grüezi", "olá", "Namaste"];
  h2.textContent = "";
  var textEl = document.createElement("span");
  var cursorEl = document.createElement("img");   // SVG I-beam caret (assets/aldo/cursor.svg)
  cursorEl.className = "type-cursor";
  cursorEl.src = "/assets/aldo/cursor.svg";
  cursorEl.alt = "";
  cursorEl.setAttribute("aria-hidden", "true");
  h2.appendChild(textEl);
  h2.appendChild(cursorEl);

  var TYPE = 95, DEL = 45, HOLD = 1500, GAP = 380;
  var BLINK = 260, INTRO_BLINKS = 4;   // enter viewport -> blink a few times, THEN type
  var i = 0, started = false, restTimer = null;

  // --- cursor blink control (opacity-driven, so the caret is STEADY while typing/deleting
  //     and blinks only during the intro and while resting on a completed word) ---
  function stopBlink() { if (restTimer) { clearInterval(restTimer); restTimer = null; } cursorEl.style.opacity = "1"; }
  function restBlink() { stopBlink(); var on = true; restTimer = setInterval(function () { on = !on; cursorEl.style.opacity = on ? "1" : "0"; }, 530); }
  function introBlink(times, done) {
    var k = 0;
    cursorEl.style.opacity = "0";
    var iv = setInterval(function () {
      k++;
      cursorEl.style.opacity = (k % 2) ? "1" : "0";     // on, off, on, off, ...
      if (k >= times * 2) { clearInterval(iv); cursorEl.style.opacity = "1"; done(); }
    }, BLINK);
  }

  function typeWord(w, done) {
    var n = 0;
    (function step() {
      textEl.textContent = w.slice(0, ++n);
      if (n < w.length) setTimeout(step, TYPE); else done();
    })();
  }
  function delWord(done) {
    (function step() {
      textEl.textContent = textEl.textContent.slice(0, -1);
      if (textEl.textContent.length) setTimeout(step, DEL);
      else setTimeout(done, GAP);
    })();
  }
  function loop() {
    typeWord(greetings[i], function () {
      restBlink();                                       // blink while resting on the full word
      setTimeout(function () {
        stopBlink();                                     // steady again for the delete
        delWord(function () { i = (i + 1) % greetings.length; loop(); });
      }, HOLD);
    });
  }

  var io = new IntersectionObserver(function (entries) {
    // enter viewport -> the caret blinks a few times, then types "Hello" first, then cycles.
    if (entries[0].isIntersecting && !started) { started = true; io.disconnect(); introBlink(INTRO_BLINKS, loop); }
  }, { threshold: 0.35 });
  io.observe(h2.closest(".al-hello-title") || h2);
})();
