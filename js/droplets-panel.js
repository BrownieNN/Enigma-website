/* ============================================================================================
   DROPLETS CONTROL PANEL — art-direction UI for js/droplets.js

   Everything writes through window.__MOLTEN.set(), so the panel has no privileged access and
   cannot drift from the effect: if a control works here it works from the console, and vice
   versa. Values are read back out of __MOLTEN.cfg on open, so the panel always shows the real
   state rather than its own defaults.

   NOT PRODUCT CODE. Self-contained, inline-styled, and touches no stylesheet. To strip it,
   delete this file and its one <script> tag — nothing else references it.

   Toggle: the ⚙ button at the top-right of the section, or press G.
   COPY CONFIG dumps the current values as JSON so a look can be pasted back into CONFIG (or to
   me) and baked in permanently — the panel is for finding numbers, not for storing them.
   ============================================================================================ */
(function () {
  "use strict";

  /* label, key, min, max, step   —   grouped as the AD asked: highlights / glows / colour */
  var GROUPS = [
    ["Highlights", [
      ["Specular strength", "specStrength", 0, 2, 0.01],
      ["Specular tightness", "specPower", 1, 40, 0.5],
      ["Highlight whiteness", "coreTint", 0, 1, 0.01]
    ]],
    /* Its own group rather than buried in Body: these three are the see-through look, which is
       the thing most often being judged, and a control at position 13 of a scrolling panel may as
       well not exist. */
    ["Refraction / see-through", [
      ["Warp amount", "warp", 0, 0.12, 0.002],
      ["Refraction (IOR)", "ior", 1.0, 2.2, 0.01],
      ["Wobble amount", "warpNoise", 0, 0.08, 0.001],
      ["Wobble scale", "warpNoiseScale", 0.5, 8, 0.1]
    ]],
    ["Inner glow", [
      ["Outline brightness", "coreGlow", 0, 2, 0.01],
      ["Outline thinness", "rimPower", 0.5, 16, 0.1],
      ["Edge glow spread", "innerPower", 0.3, 6, 0.05],
      ["Core depth", "interior", 0, 2, 0.01],
      ["Core spread", "corePower", 0.2, 6, 0.05]
    ]],
    ["Outer glow", [
      ["Outer glow", "glowStrength", 0, 2, 0.01],
      ["Outer falloff", "glowFalloff", 1, 14, 0.1]
    ]],
    ["Body", [
      ["Fill colour amount", "tint", 0, 1, 0.01],
      ["Blend / gooeyness", "smoothK", 2, 12, 0.1],
      ["Part size", "partRadius", 0.08, 0.6, 0.01]
    ]],
    ["Motion", [
      ["Cohesion (one nucleus)", "cohesion", 0, 1.2, 0.01],
      ["Breathing", "breathe", 0, 2.5, 0.01],
      ["Drag responsiveness", "grabEase", 0.05, 1, 0.01]
    ]]
  ];

  var COLORS = [
    ["Central Intelligence", "ci"],
    ["Creative", "creative"],
    ["Media", "media"]
  ];
  var HEX = [["Background", "background"], ["Headline", "typeColor"]];

  function toHex(a) {
    function c(v) { return ("0" + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2); }
    return "#" + c(a[0]) + c(a[1]) + c(a[2]);
  }
  function toArr(h) {
    return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  }

  function build() {
    var M = window.__MOLTEN;
    if (!M) return false;
    var host = document.querySelector(".al-resin-host");
    if (!host) return false;

    /* NOT ON MOBILE. At 268px wide the panel covers most of a phone screen, and its sliders sit
       over the canvas where they compete with the drag interaction for the same touch events.
       `pointer: coarse` catches touch devices at any size; the width test catches a narrow desktop
       window, where it also does not fit. Returning TRUE (not false) is deliberate — it tells
       boot() this is a settled decision so it stops retrying every 100ms for six seconds.
       Escape hatch: append ?panel=1 to force it on, e.g. for a tablet review. */
    var forced = /[?&]panel=1/.test(location.search);
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (!forced && (coarse || window.innerWidth < 900)) return true;

    var wrap = document.createElement("div");
    wrap.id = "droplet-panel";
    wrap.style.cssText =
      "position:absolute;top:12px;right:12px;z-index:60;width:268px;max-height:calc(100% - 24px);" +
      "overflow-y:auto;background:rgba(10,12,16,0.92);color:#e8eef5;border:1px solid rgba(255,255,255,0.14);" +
      "border-radius:10px;padding:10px 12px 12px;font:11px/1.45 ui-monospace,Menlo,monospace;" +
      "backdrop-filter:blur(8px);box-shadow:0 8px 30px rgba(0,0,0,0.45);";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "⚙";
    btn.title = "Toggle controls (G)";
    btn.style.cssText =
      "position:absolute;top:12px;right:12px;z-index:61;width:30px;height:30px;border-radius:8px;" +
      "border:1px solid rgba(255,255,255,0.18);background:rgba(10,12,16,0.75);color:#e8eef5;" +
      "cursor:pointer;font-size:14px;line-height:1;padding:0;";

    function row(label, key, min, max, step) {
      var r = document.createElement("div");
      r.style.cssText = "margin:7px 0;";
      var top = document.createElement("div");
      top.style.cssText = "display:flex;justify-content:space-between;gap:8px;opacity:.85;";
      var out = document.createElement("span");
      var val = M.cfg[key];
      out.textContent = (+val).toFixed(step < 0.01 ? 3 : 2);
      top.innerHTML = "<span>" + label + "</span>";
      top.appendChild(out);
      var i = document.createElement("input");
      i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = val;
      i.style.cssText = "width:100%;margin:3px 0 0;accent-color:#00e592;";
      i.addEventListener("input", function () {
        var v = parseFloat(i.value);
        out.textContent = v.toFixed(step < 0.01 ? 3 : 2);
        var o = {}; o[key] = v; M.set(o);
      });
      r.appendChild(top); r.appendChild(i);
      return r;
    }

    function heading(t) {
      var h = document.createElement("div");
      h.textContent = t.toUpperCase();
      h.style.cssText = "margin:12px 0 2px;letter-spacing:.08em;font-size:9px;opacity:.55;";
      return h;
    }

    var title = document.createElement("div");
    title.textContent = "DROPLET CONTROLS";
    title.style.cssText = "letter-spacing:.08em;font-size:9px;opacity:.55;margin-bottom:2px;";
    wrap.appendChild(title);

    // colours first — they change the look most
    wrap.appendChild(heading("Part colours"));
    COLORS.forEach(function (c) {
      var r = document.createElement("label");
      r.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin:5px 0;gap:8px;";
      r.innerHTML = "<span style='opacity:.85'>" + c[0] + "</span>";
      var i = document.createElement("input");
      i.type = "color"; i.value = toHex(M.cfg[c[1]]);
      i.style.cssText = "width:38px;height:20px;border:0;background:none;padding:0;cursor:pointer;";
      i.addEventListener("input", function () { var o = {}; o[c[1]] = toArr(i.value); M.set(o); });
      r.appendChild(i); wrap.appendChild(r);
    });
    HEX.forEach(function (c) {
      var r = document.createElement("label");
      r.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin:5px 0;gap:8px;";
      r.innerHTML = "<span style='opacity:.85'>" + c[0] + "</span>";
      var i = document.createElement("input");
      i.type = "color"; i.value = M.cfg[c[1]];
      i.style.cssText = "width:38px;height:20px;border:0;background:none;padding:0;cursor:pointer;";
      i.addEventListener("input", function () {
        var o = {}; o[c[1]] = i.value; M.set(o);
        /* The CSS background only shows pre-WebGL, but keeping it in step avoids a flash on
           reload and makes the picker feel like it changed the section, not just the canvas. */
        if (c[1] === "background") host.style.background = i.value;
      });
      r.appendChild(i); wrap.appendChild(r);
    });

    GROUPS.forEach(function (g) {
      wrap.appendChild(heading(g[0]));
      g[1].forEach(function (c) {
        if (M.cfg[c[1]] === undefined) return;   // tolerate params that no longer exist
        wrap.appendChild(row(c[0], c[1], c[2], c[3], c[4]));
      });
    });

    var copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "COPY CONFIG";
    copy.style.cssText =
      "width:100%;margin-top:12px;padding:7px;border-radius:6px;cursor:pointer;" +
      "border:1px solid rgba(255,255,255,0.2);background:#00e592;color:#04140d;font:700 10px/1 ui-monospace,monospace;" +
      "letter-spacing:.08em;";
    copy.addEventListener("click", function () {
      var keys = [];
      COLORS.concat(HEX).forEach(function (c) { keys.push(c[1]); });
      GROUPS.forEach(function (g) { g[1].forEach(function (c) { keys.push(c[1]); }); });
      var out = {};
      keys.forEach(function (k) { if (M.cfg[k] !== undefined) out[k] = M.cfg[k]; });
      var txt = JSON.stringify(out, null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      console.log("[droplets] current config:\n" + txt);
      copy.textContent = "COPIED ✓";
      setTimeout(function () { copy.textContent = "COPY CONFIG"; }, 1400);
    });
    wrap.appendChild(copy);

    var hint = document.createElement("div");
    hint.textContent = "G toggles · values also log to console";
    hint.style.cssText = "margin-top:7px;opacity:.4;font-size:9px;";
    wrap.appendChild(hint);

    host.appendChild(btn);
    host.appendChild(wrap);

    /* Open by default so it is discoverable; the state sticks across reloads, which matters when
       you are reloading repeatedly to compare looks. */
    var open = localStorage.getItem("dropletPanel") !== "0";
    function apply() {
      wrap.style.display = open ? "block" : "none";
      btn.style.display = open ? "none" : "block";
      localStorage.setItem("dropletPanel", open ? "1" : "0");
    }
    apply();
    btn.addEventListener("click", function () { open = true; apply(); });
    wrap.addEventListener("dblclick", function (e) { if (e.target === wrap) { open = false; apply(); } });
    document.addEventListener("keydown", function (e) {
      if (e.key === "g" || e.key === "G") {
        if (/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || "")) return;
        open = !open; apply();
      }
    });

    /* The panel sits over the canvas, so its pointer events would otherwise reach the blob and
       drag a part around while you are trying to move a slider. */
    ["pointermove", "pointerdown"].forEach(function (ev) {
      wrap.addEventListener(ev, function (e) { e.stopPropagation(); });
      btn.addEventListener(ev, function (e) { e.stopPropagation(); });
    });

    return true;
  }

  // __MOLTEN is created inside the effect's own init, which may land after this file parses.
  function boot(tries) {
    if (build()) return;
    if (tries > 60) return;
    setTimeout(function () { boot(tries + 1); }, 100);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(0); });
  else boot(0);
})();
