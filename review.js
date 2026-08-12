/* ============================================================================
   REVIEW LAYER — pinned comments for AD review. NOT product code.

   Deliberately self-contained: no GSAP, no ScrollTrigger, no three.js, no site
   CSS variables, no site classes touched. The homepage runs a physics sim, a
   scrubbed timeline and a WebGL scene; this must not be able to perturb any of
   them, and it must be removable in one line.

   Talks to: GET  /api/comments
             POST /api/comments
             POST /api/comments/resolve
             POST /api/comments/delete
   That contract is implemented twice — devserve.py locally, a Netlify function
   backed by Netlify Blobs on deploy — so this file is identical in both.
   ============================================================================ */
(function reviewLayer() {
  "use strict";

  if (new URLSearchParams(location.search).get("review") === "0") return;
  if (window.top !== window.self) return;   // never inside the simulator iframe

  var API = "/api/comments";
  var POLL_MS = 8000;
  var comments = [];
  var armed = false;
  var pending = null;      // the anchor awaiting text
  var els = {};

  /* ---- author, asked once per device ---------------------------------------- */
  function author() {
    var a = localStorage.getItem("rv.author");
    if (!a) {
      a = (window.prompt("Your name (for review comments)") || "").trim();
      if (!a) return null;
      localStorage.setItem("rv.author", a);
    }
    return a;
  }

  /* Pins are positioned in viewport space, so anything that moves the page has to re-place
     them. rAF-throttled. Declared at MODULE scope, not inside build(): sim() hooks the
     simulator frame's scroll and calls this, and while `function` declarations hoist, they
     only hoist within their own scope -- left inside build() it was simply not visible to
     sim(), so the first scroll inside the frame would have thrown. */
  var _repoQueued = false;
  function reposition() {
    if (_repoQueued) return;
    _repoQueued = true;
    requestAnimationFrame(function () { _repoQueued = false; renderPins(); });
  }

  /* ---- the screen-size simulator -------------------------------------------
     AD 2026-07-30: at a real phone browser width the drawer covers the page, so you cannot
     read the layout and write about it at the same time. Fix is to comment on the SIMULATED
     screen instead: the review UI stays in the full-width top window (room for the drawer)
     while pins target elements inside the iframe.

     Two things make this work and are easy to get wrong:
       - the iframe is CSS transform: scale()d to fit the stage, so top-window coordinates must
         be UNSCALED before they mean anything inside it. getBoundingClientRect() already
         reflects the transform, so the factor is rect.width / offsetWidth.
       - it is same-origin (both localhost), so contentDocument is readable. review.js still
         refuses to run *inside* the frame -- one UI, in the top window only. */
  function sim() {
    var stage = document.getElementById("sim-stage");
    var f = document.getElementById("sim-frame");
    if (!stage || stage.hidden || !f) return null;
    var doc;
    try { doc = f.contentDocument; } catch (e) { return null; }
    if (!doc || !doc.body || !doc.querySelector(".al-hero")) return null;   // still blank/loading
    var r = f.getBoundingClientRect();
    if (!r.width) return null;
    var s = {
      frame: f, doc: doc, win: f.contentWindow, rect: r,
      scale: (f.offsetWidth ? r.width / f.offsetWidth : 1) || 1
    };
    // the frame scrolls independently; pins live in the top window so they must follow it
    if (s.win && !s.win.__rvScrollHooked) {
      s.win.__rvScrollHooked = true;
      s.win.addEventListener("scroll", function () { reposition(); }, { passive: true });
    }
    return s;
  }

  /* ---- which view are we looking at? --------------------------------------- */
  /* All Work is a fixed OVERLAY, not a route, so there is no URL to read -- ask
     the transition module directly. A pin dropped on one view must not render
     over the other. */
  function currentView(s) {
    var w = s ? s.win : window;
    try {
      return w.__WORKPAGE && w.__WORKPAGE.isOpen() ? "work" : "home";
    } catch (e) { return "home"; }
  }
  // Which frame are we commenting on right now? Sim comments and top-window comments are
  // separate sets -- showing one over the other would put pins on the wrong layout entirely.
  function currentFrame() { return sim() ? "sim" : "top"; }

  function scrollerFor(c) {
    var doc = c.anchor && c.anchor.frame === "sim" ? (sim() && sim().doc) : document;
    if (!doc) return null;
    if ((c.view || "home") === "work") return doc.getElementById("page-work");
    return doc === document ? null : doc.defaultView;   // null = top window
  }

  /* ---- anchoring ------------------------------------------------------------
     Raw x/y is useless here: the site reflows hard between 390 and 1900px, so a
     stored coordinate drifts onto whatever happens to be there at another width.
     Instead: remember the nearest sensible ELEMENT (class-based selector + its
     index among matches) plus a FRACTION of that element's box. On load, resolve
     the selector and place the pin at that fraction of its current box -- so a
     pin on the Careers headline stays on the Careers headline at any width.
     If the element is gone we fall back to document fractions and mark the pin
     approximate rather than quietly pointing at the wrong thing. */
  function classesOf(el) {
    return (el.className || "").toString().trim().split(/\s+/)
      .filter(function (c) { return c && c.indexOf("rv-") !== 0; });
  }
  /* An id is unique and survives anything; a class list is stable across reflow.
     A BARE TAG is not good enough -- an early version fell back to `div` with
     nth:254, an index among every div on the page, which any markup edit shifts. */
  function identifiable(el) {
    return !!(el && (el.id || classesOf(el).length));
  }
  function selectorFor(el) {
    if (el.id) return "#" + el.id;
    var cls = classesOf(el);
    if (cls.length) return el.tagName.toLowerCase() + "." + cls.slice(0, 2).join(".");
    return el.tagName.toLowerCase();
  }

  var RV_OWN = ".rv-root, .rv-fab, .rv-drawer, .rv-compose, .rv-capture";

  function captureAnchor(x, y) {
    /* If the point lands inside the simulator, anchor against the FRAME's document instead of
       the top one -- unscaling the coordinates first (see sim()). */
    var s = sim();
    var doc = document, inSim = false;
    if (s && x >= s.rect.left && x <= s.rect.right && y >= s.rect.top && y <= s.rect.bottom) {
      inSim = true;
      doc = s.doc;
      x = (x - s.rect.left) / s.scale;
      y = (y - s.rect.top) / s.scale;
    }

    /* Every element belonging to the review UI must be filtered out, and that
       explicitly includes the CAPTURE layer -- it is full-screen with
       pointer-events:auto, so it is always the topmost hit. Missing it made
       elementsFromPoint return the capture div, which then walked up to <body>
       and every anchor stored `sel: "body"` -- i.e. no anchoring at all, pins
       free to drift on any reflow. Caller also removes the layer first; this is
       the belt to that braces. (Nothing to filter inside the frame -- the review
       UI never runs in there.) */
    var stack = doc.elementsFromPoint(x, y).filter(function (n) {
      return !(n.closest && n.closest(RV_OWN));
    });
    var target = stack[0] || doc.body;
    /* Walk up until we hit something both big enough to be a meaningful anchor AND
       identifiable (id or class). Tiny inline spans and anonymous wrapper divs both
       get skipped -- the first would make fx/fy meaninglessly precise, the second
       would leave us with a bare-tag selector. */
    var hops = 0;
    while (target && target !== doc.body && hops < 6) {
      var r = target.getBoundingClientRect();
      if (r.width >= 24 && r.height >= 16 && identifiable(target)) break;
      target = target.parentElement; hops++;
    }
    if (!target || target === doc.documentElement) target = doc.body;

    var sel = selectorFor(target);
    var matches = [].slice.call(doc.querySelectorAll(sel));
    var box = target.getBoundingClientRect();
    var win = doc.defaultView || window;
    return {
      frame: inSim ? "sim" : "top",
      sel: sel,
      nth: Math.max(0, matches.indexOf(target)),
      fx: box.width ? (x - box.left) / box.width : 0.5,
      fy: box.height ? (y - box.top) / box.height : 0.5,
      // fallback, in document space, if the selector ever stops resolving
      dx: (win.scrollX + x) / Math.max(1, doc.documentElement.scrollWidth),
      dy: (win.scrollY + y) / Math.max(1, doc.documentElement.scrollHeight)
    };
  }

  function resolveAnchor(a) {
    if (!a) return null;

    if (a.frame === "sim") {
      var s = sim();
      if (!s) return null;                       // simulator closed -> nothing to point at
      var sel = s.doc.querySelectorAll(a.sel || "")[a.nth || 0];
      if (!sel) return null;
      var sr = sel.getBoundingClientRect();
      // frame-local -> top-window: apply the frame's scale, then its offset on the stage
      var px = (sr.left + sr.width * a.fx) * s.scale + s.rect.left;
      var py = (sr.top + sr.height * a.fy) * s.scale + s.rect.top;
      return {
        x: px, y: py, approx: false,
        // the frame clips its own content; a pin scrolled out of it must not float over the stage
        clipped: px < s.rect.left - 2 || px > s.rect.right + 2 ||
                 py < s.rect.top - 2 || py > s.rect.bottom + 2
      };
    }

    var el = document.querySelectorAll(a.sel || "")[a.nth || 0];
    if (el) {
      var r = el.getBoundingClientRect();
      if (r.width || r.height) {
        return { x: r.left + r.width * a.fx, y: r.top + r.height * a.fy, approx: false };
      }
    }
    return {
      x: a.dx * document.documentElement.scrollWidth - window.scrollX,
      y: a.dy * document.documentElement.scrollHeight - window.scrollY,
      approx: true
    };
  }

  /* ---- api ----------------------------------------------------------------- */
  function get() {
    return fetch(API, { cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* ---- rendering ----------------------------------------------------------- */
  /* AD 2026-07-30 -- the LIST shows everything, always.
     It used to be filtered the same way pins are (current frame + current view), so closing the
     simulator -- or just switching its size, which reloads the iframe and briefly makes sim()
     return null -- emptied the drawer and looked exactly like the comments had been lost. They
     never were; they were on disk the whole time. A feed that hides its own contents is worse
     than useless during a review.
     Pins stay contextual (see pinnable) because a pin placed on the 390px layout genuinely has
     nowhere to point when you are looking at the desktop one. */
  function pinnable(c) {
    var s = sim();
    return ((c.anchor && c.anchor.frame) || "top") === (s ? "sim" : "top") &&
           (c.view || "home") === currentView(s);
  }
  // Is this comment about something other than what we're currently looking at?
  function elsewhere(c) { return !pinnable(c); }

  function renderPins() {
    var keep = {};
    // Numbered by position in the FULL list, so a pin's number always matches its drawer row.
    comments.forEach(function (c, i) {
      if (!pinnable(c)) return;
      var pos = resolveAnchor(c.anchor);
      if (!pos) return;
      var pin = els.pins[c.id];
      if (!pin) {
        pin = document.createElement("button");
        pin.type = "button";
        pin.className = "rv-pin";
        pin.addEventListener("click", function (e) {
          e.stopPropagation();
          openDrawer();
          var row = els.list.querySelector('[data-id="' + c.id + '"]');
          if (row) row.scrollIntoView({ block: "center" });
        });
        els.root.appendChild(pin);
        els.pins[c.id] = pin;
      }
      pin.textContent = String(i + 1);
      pin.title = c.text;
      pin.classList.toggle("is-resolved", !!c.resolved);
      pin.classList.toggle("is-approx", !!pos.approx);
      // Only paint pins while the drawer is open, so normal design checks and
      // screenshots aren't littered with them. `clipped` pins have scrolled out of the
      // simulator's viewport -- they'd otherwise float over the stage chrome.
      pin.style.display = (els.drawer.classList.contains("is-open") && !pos.clipped)
        ? "grid" : "none";
      pin.style.left = pos.x + "px";
      pin.style.top = pos.y + "px";
      keep[c.id] = true;
    });
    Object.keys(els.pins).forEach(function (id) {
      if (!keep[id]) { els.pins[id].remove(); delete els.pins[id]; }
    });
  }

  function renderList() {
    var list = comments;            // everything, never filtered
    els.count.textContent = String(list.filter(function (c) { return !c.resolved; }).length);
    if (!list.length) {
      els.list.innerHTML = '<li class="rv-empty">No comments yet. ' +
        'Hit COMMENT, then tap the thing you want to talk about.</li>';
      return;
    }
    els.list.innerHTML = "";
    list.forEach(function (c, i) {
      var li = document.createElement("li");
      li.className = "rv-item" + (c.resolved ? " is-resolved" : "") +
        (elsewhere(c) ? " is-elsewhere" : "");
      li.setAttribute("data-id", c.id);
      var ctx = c.ctx || {};
      li.innerHTML =
        '<span class="rv-num">' + (i + 1) + "</span>" +
        '<span class="rv-text"></span>' +
        '<span class="rv-actions">' +
          '<button data-act="resolve" title="Resolve / unresolve">' + (c.resolved ? "↺" : "✓") + "</button>" +
          '<button data-act="delete" title="Delete">✕</button>' +
        "</span>";
      var t = li.querySelector(".rv-text");
      t.textContent = c.text;
      var meta = document.createElement("span");
      meta.className = "rv-meta";
      var where = (ctx.frame === "sim" || (c.anchor && c.anchor.frame === "sim"))
        ? "sim " + (ctx.vw || "?") + "px" : "desktop " + (ctx.vw || "?") + "px";
      // Says plainly why a row has no pin right now, instead of it just looking broken.
      meta.textContent = (c.author || "anon") + " · " + where + " · " + (ctx.theme || "?") +
        " · " + (c.created || "").replace("T", " ").replace("Z", "") +
        (elsewhere(c) ? "  ⟨not on this screen⟩" : "");
      t.appendChild(meta);

      li.addEventListener("click", function (e) {
        var act = e.target.getAttribute && e.target.getAttribute("data-act");
        if (act === "resolve") {
          e.stopPropagation();
          post(API + "/resolve", { id: c.id }).then(refresh);
          return;
        }
        if (act === "delete") {
          e.stopPropagation();
          post(API + "/delete", { id: c.id }).then(refresh);
          return;
        }
        goTo(c);
      });
      els.list.appendChild(li);
    });
  }

  function render() { renderList(); renderPins(); }

  /* ---- go to a comment ------------------------------------------------------
     AD 2026-07-30: clicking a comment belonging to another viewport used to do NOTHING -- it hit
     `if (isSim && !sim()) return`, so a mobile comment was unreachable from the desktop view. It
     now navigates there: switch the simulator to the size the comment was written at (or close it,
     for a desktop comment), switch All Work in/out if needed, then scroll to the element.

     The size is matched on width alone: the picker's widths are all unique (2560/1920/1728/1512/
     1536/1440/1366/1280/430/390/360), and older comments only recorded vw. Newer ones also store
     vh, used in preference when present. */
  function sizeButtonFor(c) {
    var ctx = c.ctx || {};
    var btns = [].slice.call(document.querySelectorAll("#size-options button"));
    if (ctx.vh) {
      var exact = btns.filter(function (b) {
        return +b.dataset.w === +ctx.vw && +b.dataset.h === +ctx.vh;
      })[0];
      if (exact) return exact;
    }
    return btns.filter(function (b) { return +b.dataset.w === +ctx.vw; })[0] || null;
  }

  // Resolves once the frame has re-loaded and its own site JS has built the page.
  function waitForSim(ms) {
    var deadline = Date.now() + (ms || 8000);
    return new Promise(function (done) {
      (function poll() {
        if (sim() || Date.now() > deadline) return done(sim());
        setTimeout(poll, 150);
      })();
    });
  }

  function goTo(c) {
    var wantSim = !!(c.anchor && c.anchor.frame === "sim");
    var ctx = c.ctx || {};
    var s = sim();

    // 1. get the right frame on screen
    if (wantSim) {
      var needSwitch = !s || (ctx.vw && s.win.innerWidth !== +ctx.vw);
      if (needSwitch) {
        var btn = sizeButtonFor(c);
        if (!btn) return;                       // no matching preset; nothing sensible to do
        var picker = document.getElementById("size-options");
        if (picker && !picker.classList.contains("open")) {
          document.getElementById("size-current").click();   // the handler only fires when open
        }
        btn.click();
        return waitForSim().then(function () { setTimeout(function () { land(c); }, 350); });
      }
    } else if (s) {
      var close = document.getElementById("sim-close");
      if (close) close.click();                 // a desktop comment: get the stage out of the way
      return setTimeout(function () { land(c); }, 350);
    }
    land(c);
  }

  // 2. correct view (All Work is an overlay, not a route), then 3. scroll to the element.
  function land(c) {
    var wantSim = !!(c.anchor && c.anchor.frame === "sim");
    var s = wantSim ? sim() : null;
    if (wantSim && !s) return;
    var win = s ? s.win : window;
    var doc = s ? s.doc : document;

    var wantWork = (c.view || "home") === "work";
    var isWork = false;
    try { isWork = !!(win.__WORKPAGE && win.__WORKPAGE.isOpen()); } catch (e) {}
    if (wantWork !== isWork && win.__WORKPAGE) {
      try { wantWork ? win.__WORKPAGE.open() : win.__WORKPAGE.close(); } catch (e) {}
      return setTimeout(function () { scrollToAnchor(c, doc); }, 2200);  // after the crossfade
    }
    scrollToAnchor(c, doc);
  }

  function scrollToAnchor(c, doc) {
    var el = c.anchor && doc.querySelectorAll(c.anchor.sel || "")[c.anchor.nth || 0];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      var pos = resolveAnchor(c.anchor);        // fall back to the document-fraction estimate
      if (pos && doc === document) {
        window.scrollTo({ top: window.scrollY + pos.y - window.innerHeight * 0.4, behavior: "smooth" });
      }
    }
    setTimeout(renderPins, 600);
    setTimeout(renderPins, 1400);
  }

  function refresh() {
    return get().then(function (data) {
      comments = Array.isArray(data) ? data : [];
      render();
    }).catch(function () { /* server down -- keep showing what we have */ });
  }

  /* Context is read from whichever document the comment is actually about. For a sim comment
     that means the SIMULATED width and the frame's own theme -- which is the useful number.
     Recording the desktop's 1896px against a comment about a 390px layout would be worse than
     recording nothing. */
  function ctxFor(anchor) {
    var isSim = anchor && anchor.frame === "sim";
    var s = isSim ? sim() : null;
    var doc = s ? s.doc : document;
    var win = s ? s.win : window;
    return {
      frame: isSim ? "sim" : "top",
      view: currentView(s),
      vw: win.innerWidth || 0,
      vh: win.innerHeight || 0,      // lets goTo() match a size preset exactly, not just by width
      theme: doc.body.classList.contains("dark") ? "dark" : "light"
    };
  }

  /* ---- compose ------------------------------------------------------------- */
  function openCompose(x, y, anchor) {
    pending = anchor;
    var w = Math.min(320, window.innerWidth * 0.88);
    els.compose.style.left = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8)) + "px";
    els.compose.style.top = Math.max(8, Math.min(y + 18, window.innerHeight - 190)) + "px";
    els.compose.classList.add("is-open");
    var c = ctxFor(anchor);
    els.ctx.textContent = c.view + " · " + c.vw + "px" +
      (c.frame === "sim" ? " (sim)" : "") + " · " + c.theme;
    els.textarea.value = "";
    els.textarea.focus();
  }
  function closeCompose() {
    els.compose.classList.remove("is-open");
    pending = null;
    setArmed(false);
  }
  function save() {
    var text = els.textarea.value.trim();
    if (!text) return closeCompose();
    var who = author();
    if (!who) return closeCompose();
    var c = ctxFor(pending);
    post(API, {
      author: who,
      text: text,
      view: c.view,
      anchor: pending,
      ctx: { vw: c.vw, vh: c.vh, theme: c.theme, frame: c.frame }
    }).then(function () {
      closeCompose();
      openDrawer();
      return refresh();
    });
  }

  /* ---- hide / show ---------------------------------------------------------
     AD 2026-07-30. `?review=0` already disabled the layer, but that needs a URL edit. This hides
     everything -- FAB, drawer, pins -- from inside the UI, and remembers it, so a clean screenshot
     is one click away. Press C to bring it back (the site binds no keys except Escape, and the
     handler ignores keystrokes aimed at a field so typing a comment is unaffected). */
  function hidden() { return localStorage.getItem("rv.hidden") === "1"; }

  function setHidden(on) {
    localStorage.setItem("rv.hidden", on ? "1" : "0");
    [els.root, els.fab, els.drawer, els.compose].forEach(function (n) {
      if (n) n.style.display = on ? "none" : "";
    });
    if (on) { setArmed(false); closeDrawer(); }
    else render();
  }

  /* ---- arming -------------------------------------------------------------- */
  function setArmed(on) {
    armed = !!on;
    els.fab.classList.toggle("is-armed", armed);
    els.fabLabel.textContent = armed ? "Tap a spot" : "Comment";
    if (armed) {
      if (!els.capture.parentNode) document.body.appendChild(els.capture);
    } else if (els.capture.parentNode) {
      els.capture.remove();
    }
  }

  function openDrawer() { els.drawer.classList.add("is-open"); renderPins(); }
  function closeDrawer() { els.drawer.classList.remove("is-open"); renderPins(); }

  /* ---- build --------------------------------------------------------------- */
  function build() {
    els.root = document.createElement("div");
    els.root.className = "rv-root";
    els.pins = {};

    els.fab = document.createElement("button");
    els.fab.type = "button";
    els.fab.className = "rv-fab";
    els.fab.innerHTML = '<span class="rv-count">0</span><span class="rv-fab-label">Comment</span>';
    els.count = els.fab.querySelector(".rv-count");
    els.fabLabel = els.fab.querySelector(".rv-fab-label");

    els.capture = document.createElement("div");
    els.capture.className = "rv-capture";

    els.drawer = document.createElement("aside");
    els.drawer.className = "rv-drawer";
    els.drawer.innerHTML =
      '<div class="rv-head"><strong>Review</strong>' +
      '<button data-act="add" title="New comment">+ Add</button>' +
      '<button data-act="hide" title="Hide the review layer (press C to bring it back)">Hide</button>' +
      '<button data-act="close" title="Close">✕</button></div>' +
      '<ul class="rv-list"></ul>';
    els.list = els.drawer.querySelector(".rv-list");

    els.compose = document.createElement("div");
    els.compose.className = "rv-compose";
    els.compose.innerHTML =
      '<textarea placeholder="What needs changing?"></textarea>' +
      '<div class="rv-ctx"></div>' +
      '<div class="rv-compose-row">' +
      '<button class="rv-save">Save</button><button class="rv-cancel">Cancel</button></div>';
    els.textarea = els.compose.querySelector("textarea");
    els.ctx = els.compose.querySelector(".rv-ctx");

    document.body.appendChild(els.root);
    document.body.appendChild(els.fab);
    document.body.appendChild(els.drawer);
    document.body.appendChild(els.compose);

    /* ---- wiring ---- */
    els.fab.addEventListener("click", function () {
      if (armed) return setArmed(false);
      if (!author()) return;
      // First press opens the feed; press again to start pinning.
      if (!els.drawer.classList.contains("is-open")) { openDrawer(); return; }
      setArmed(true);
    });

    els.capture.addEventListener("click", function (e) {
      var x = e.clientX, y = e.clientY;
      els.capture.remove();          // remove BEFORE anchoring, so elementsFromPoint sees the
                                     // page and not this layer (see captureAnchor)
      openCompose(x, y, captureAnchor(x, y));
    });

    els.drawer.addEventListener("click", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-act");
      if (act === "close") closeDrawer();
      if (act === "add") { if (author()) setArmed(true); }
      if (act === "hide") setHidden(true);
    });

    els.compose.querySelector(".rv-save").addEventListener("click", save);
    els.compose.querySelector(".rv-cancel").addEventListener("click", closeCompose);
    els.textarea.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
      if (e.key === "Escape") closeCompose();
    });

    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    var wp = document.getElementById("page-work");
    if (wp) wp.addEventListener("scroll", reposition, { passive: true });

    // Opening/closing All Work swaps which comments apply.
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;
      if (e.target.closest("#work-open, #work-close")) {
        setTimeout(render, 2200);   // after the crossfade settles
      }
      /* Choosing a size or closing the stage changes which comments are pinnable, and choosing a
         size RELOADS the iframe -- during which sim() is null. Re-render on a delay so pins come
         back by themselves instead of waiting up to POLL_MS. */
      if (e.target.closest("#size-options button, #sim-close")) {
        setTimeout(render, 400);
        setTimeout(render, 1800);
        setTimeout(render, 3500);
      }
    }, true);

    // Belt to that braces: the frame firing `load` is the authoritative "it's ready" signal.
    var simFrame = document.getElementById("sim-frame");
    if (simFrame) simFrame.addEventListener("load", function () { setTimeout(render, 300); });

    window.__REVIEW = { refresh: refresh, comments: function () { return comments; },
                        open: openDrawer, close: closeDrawer,
                        // exposed for QA: lets a test call the REAL anchoring code rather than
                        // a reimplementation of it, which is how a stale-cache false negative
                        // wasted a round earlier
                        anchorAt: captureAnchor };
  }

  function init() {
    build();
    // C toggles the whole layer. Ignored while typing so it cannot eat a comment keystroke.
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "c" || e.key === "C") setHidden(!hidden());
    });
    if (hidden()) setHidden(true);
    refresh();
    setInterval(refresh, POLL_MS);   // so the AD's comments appear on the other device
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
