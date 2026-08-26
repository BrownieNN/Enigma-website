/* ============================================================================
   CAPABILITIES TWIST  --  js/caps-twist.js
   ============================================================================
   Hovering a "live" capability row runs a two-beat move:

     1  the row's top and bottom rules pull out from the text column to the
        tile's edges, and
     2  the whole block -- now a solid band bounded by those two rules -- turns
        over and twists, landing on a sliver of the project it points at.

   Clicking it opens that case study through the veil. Live rows are marked in
   the markup with `data-case="<key>"` and resolved against CASES below; nothing
   here knows about row indices, so adding the second and third studies is a
   content change, not a code change.

   ---------------------------------------------------------------------------
   WHY THIS IS REAL 3D AND NOT A 2D PROJECTION

   Three builds got here the cheap way and all three fell short in the same
   place. DOM strips (~28 per row, each flipped with a phase offset) gave a
   staircase silhouette where a twisted bar has a smooth curve. Replacing that
   with a per-column 2D warp fixed the silhouette and, once the cross-section was
   given real depth, produced correct geometry -- the maths in it was right, and
   it still did not read as an object.

   It could not, and the reason is structural rather than a matter of tuning.
   A per-column 2D warp is ORTHOGRAPHIC: every column is drawn at the same scale,
   so the far end of a turning bar never recedes. It has no END CAPS, because a
   column can only hold the two planes that face the viewer. And it shades per
   column from one angle rather than from a surface normal, so its lighting is
   flat across the width of every plane. Perspective, caps and normal-based
   shading are exactly the cues that say "solid", and none of them is reachable
   from that model.

   So the block is now actual geometry: a subdivided box, twisted per vertex
   about its long axis, rendered by three.js (r160, already vendored on this page
   for the droplets) through a perspective camera with a real depth buffer.
   Caps, occlusion and foreshortening come free because they are real.

   ONE renderer is shared by every row. Only one row can be hovered at a time, so
   the single WebGL canvas is simply re-parented into whichever row is running --
   one extra context on the page, not five.

   The camera is DEAD-ON and the world unit is one device pixel, which is what
   lets the block land flush. At distance `chpx / (2·tan(fov/2))` from the front
   face, that face projects exactly 1:1, so at p=0 the rendered block is
   pixel-identical to the row it replaced and at p=1 it is pixel-identical to the
   flat image band. Tilting the camera to look down on the block the way the
   reference does would break both of those and is not worth it -- the twist
   supplies the perspective on its own, because the ends genuinely rotate away.

   ============================================================================ */

(function capsTwist() {
  "use strict";

  /* ---- Content -----------------------------------------------------------
     `pos` is the crop's centre, as object-position would express it. The band
     is roughly 4.3:1, so it is doing real work: 24% down hero-2 puts the sliver
     across the three faces rather than through the middle of their chests. */
  var CASES = {
    "ken-oath": {
      label: "Ken Oath",
      img: "assets/case-study/hero-2.jpg",
      pos: [0.5, 0.24]
    }
  };

  /* ---- Tuning ------------------------------------------------------------
     Live-editable via window.__CAPTWIST.set({...}) -- same convention as
     __VEIL.tune and __MOLTEN.set. */
  var cfg = {
    rule: 0.26,       // beat 1: rules pull out to the tile edges
    turn: 0.72,       // beat 2: the block turns over
    hold: 0.04,       // pause between the two, so they read as consecutive

    /* Twist ACROSS the band, in turns, at the midpoint of the gesture. Measured
       off the reference: its height profile undulates about one and a half
       times along the bar, i.e. the two ends differ by well under a turn. It is
       a travelling wave down a beam, not a barber's pole -- at 1 the bar wraps a
       full revolution end to end and stops reading as one rigid object. */
    arc: 0.35,

    /* Extrusion depth, AS A FRACTION OF THE ROW'S HEIGHT. This is the single
       number that decides whether it reads as a block or as card stock, and the
       reference is emphatic about it.

       Its bar sits at 169px at rest and peaks at 220px mid-move, never once
       dropping below its resting height. A slab projects to
       H*|cos| + D*|sin|, peaking at sqrt(H^2 + D^2) -- so sqrt(169^2 + D^2) =
       220 gives D = 141, a depth-to-height ratio of 0.83. Nearly square in
       cross-section. Earlier builds ran this at 0.24 and no amount of lighting
       was going to make that read as anything but a thick sheet.

       A ratio rather than px because the row height moves with --u, and the
       proportion is the thing being art-directed. */
    depthRatio: 0.8,

    seg: 200,         // lengthwise subdivisions; the twist is only as smooth as this
    fov: 30,          // camera field of view in degrees -- how much the ends recede

    /* Lighting, done as vertex colours on unlit materials rather than with
       three's lights. Two reasons. It is exact: `ambient + view` is pinned to 1
       so a face pointing straight at the camera renders at precisely its base
       colour, which is what makes p=0 and p=1 land pixel-identical to the DOM
       row and to the flat image. And `top` keys off the normal's y, which is
       exactly zero for a forward-facing normal, so it separates the solid's
       other planes without ever touching either end state. */
    ambient: 0.58,
    view: 0.42,       // ambient + view must total 1
    top: 0.34,        // how far upward-facing planes DARKEN; see render()
    ease: "power2.inOut"
  };

  /* Desktop and tablet-landscape only. Below 1024 the tiles become a horizontal
     snap-scroller (one tile at a time) so an edge-to-edge block has nothing to
     sit in, and it is a touch context with no hover anyway. */
  var MQ = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rows = [];
  var mounted = false;
  var raf = 0;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ======================================================================
     MOUNT
     ====================================================================== */

  function mount() {
    if (mounted) return;
    var caps = document.querySelector("#view-aldo .al-caps");
    if (!caps || !window.gsap) return;

    caps.querySelectorAll("li[data-case]").forEach(function (li) {
      var conf = CASES[li.getAttribute("data-case")];
      var tile = li.closest(".al-caps-tile");
      if (!conf || !tile) return;

      var hit = document.createElement("div");
      hit.className = "al-cap-flip";
      hit.setAttribute("role", "link");
      hit.setAttribute("tabindex", "0");
      hit.setAttribute("aria-label", "View case study: " + conf.label);

      /* The two rules of beat 1. They are drawn here rather than borrowed from
         the list because they have to reach PAST the text column to the tile's
         edges, and a border on the <li> can only ever be as wide as the <li>. */
      var top = document.createElement("div");
      top.className = "al-cap-rule al-cap-rule-t";
      var bot = document.createElement("div");
      bot.className = "al-cap-rule al-cap-rule-b";

      /* A host, not the drawing surface. The WebGL canvas is shared by every
         row and gets re-parented into whichever one is running, so what lives
         here permanently is an empty box that owns the geometry and the
         opacity. */
      var cv = document.createElement("div");
      cv.className = "al-cap-stage";

      hit.appendChild(top);
      hit.appendChild(bot);
      hit.appendChild(cv);
      tile.appendChild(hit);

      rows.push({
        li: li, prev: li.previousElementSibling, tile: tile, conf: conf,
        // topEl, not top -- `top` is the row's measured y offset within the tile
        hit: hit, topEl: top, bot: bot, cv: cv,
        front: null, back: null, img: null, tl: null, on: false, stale: false
      });
      warm(tile);
    });

    if (!rows.length) return;
    mounted = true;

    rows.forEach(function (rec) {
      var im = new Image();
      im.src = rec.conf.img;
      rec.img = im;
    });

    measureAll();

    /* Geometry is in px, so anything that changes the tile's box invalidates the
       bitmaps. See measureAll() for why this fires far more often than it looks
       like it should. */
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(caps);
    else window.addEventListener("resize", schedule);

    /* The tiles are drawn with webfonts, and the front bitmap is TYPE. Painting
       it before the face lands bakes the fallback into the picture, where a DOM
       row would simply re-flow when the swap happened. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(repaint);

    /* Dark mode is a runtime toggle and both bitmaps have the theme baked into
       them -- tile fill, type colour, rule colour. Nothing else in this file
       would ever notice the class change. */
    new MutationObserver(repaint).observe(document.body, {
      attributes: true, attributeFilter: ["class"]
    });
  }

  /* TWO KINDS OF INVALIDATION, and they must not be collapsed into one.

     schedule()  the box MIGHT have moved. Cheap, fires constantly -- the sidebar
                 expands and collapses its menu items as you scroll, which
                 re-widths the main column, and --u is container-relative so
                 every row height follows. measureAll compares before repainting,
                 so the common case costs a few rect reads and nothing else.
     repaint()   the box has NOT moved but the bitmaps are wrong anyway: the
                 theme was toggled, or the webfont finally landed. No geometry
                 test can see either, so this one forces.

     Routing the observer through the forcing path (which an earlier revision
     did) repaints every row's bitmaps on every scroll-driven reflow. */
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; measureAll(false); });
  }

  function repaint() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    rows.forEach(function (rec) {
      if (rec.on || (rec.tl && rec.tl.isActive())) rec.stale = true;
      else discard(rec);
    });
    measureAll(true);
  }

  /* Building a row's bitmaps costs a few ms. Doing it inside enter() spends it
     on the exact frame the gesture starts on, which is the one frame that must
     not drop. Crossing the tile to reach a row buys tens of milliseconds, and
     only the (at most three) rows in the tile the reader is actually in are
     ever painted. */
  function warm(tile) {
    if (tile.__capWarm) return;
    tile.__capWarm = true;
    tile.addEventListener("pointerenter", function () {
      var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1); };
      rows.forEach(function (rec) {
        if (rec.tile !== tile || rec.front || rec.hit.hidden) return;
        idle(function () { if (!rec.front && !rec.hit.hidden) paint(rec); }, { timeout: 120 });
      });
    });
  }

  /* ======================================================================
     MEASURE
     ====================================================================== */

  /* The block spans the tile EDGE TO EDGE, not the inset text column, so the
     band is as long as the tile allows and the tile's own squircle does the
     clipping. Vertically it is exactly the row.

     THIS RUNS FAR MORE OFTEN THAN IT LOOKS. The sidebar expands and collapses
     its menu items as you scroll, which re-widths the main column; --u is
     container-relative, so every row height moves with it and the observer
     fires. An earlier build repainted unconditionally here, which meant
     scrolling with a row hovered threw the bitmaps away mid-gesture and left
     the row blank. So nothing is repainted unless the geometry actually moved,
     and a row mid-gesture is never touched -- it is marked stale and repainted
     once it has settled (see rest()). */
  function measureAll(force) {
    var live = window.matchMedia(MQ).matches;
    rows.forEach(function (rec) {
      rec.hit.hidden = !live;
      if (!live) { discard(rec); return; }

      var t = rec.tile.getBoundingClientRect();
      var l = rec.li.getBoundingClientRect();
      var band = t.width, top = l.top - t.top, h = l.height;

      if (!force && band === rec.band && h === rec.h && top === rec.top) return;

      rec.band = band;
      rec.top = top;
      rec.h = h;
      rec.textLeft = l.left - t.left;   // where the real row's box starts
      rec.textW = l.width;

      rec.hit.style.top = top + "px";
      rec.hit.style.height = h + "px";

      /* Beat 1 starts life exactly on the list's own rule -- same width, same
         place -- so the pull-out begins from what the reader is already looking
         at rather than from a line that appears out of nowhere. */
      [rec.topEl, rec.bot].forEach(function (el) {
        el.style.left = rec.textLeft + "px";
        el.style.width = rec.textW + "px";
      });
      rec.spread = rec.band / rec.textW;   // scaleX that reaches the tile edges

      if (rec.on || (rec.tl && rec.tl.isActive())) rec.stale = true;
      else discard(rec);
    });
  }

  /* ======================================================================
     BITMAPS
     ====================================================================== */

  function css(el) { return window.getComputedStyle(el); }

  /* The row's text, as lines. <br> is a real line break in this markup and the
     row is centred on both, so it cannot be treated as one string. */
  function lines(li) {
    var tmp = document.createElement("div");
    return li.innerHTML.split(/<br\s*\/?>/i).map(function (part) {
      tmp.innerHTML = part;
      return (tmp.textContent || "").trim();
    }).filter(Boolean);
  }

  function surface(w, h, dpr) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    var x = c.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);   // author in CSS px, store in device px
    return { cv: c, ctx: x };
  }

  function paint(rec) {
    if (!rec.band || !rec.h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    rec.dpr = dpr;
    rec.wpx = Math.round(rec.band * dpr);
    rec.hpx = Math.round(rec.h * dpr);          // the FACE artwork, one row tall

    /* The canvas is taller than the row. A bar of cross-section H by D reaches
       sqrt(H^2 + D^2) when it turns through 45deg -- taller than the row it
       started in -- so a canvas sized to the row would guillotine the block at
       exactly the angles where it is most obviously an object. The overflow
       lands on the neighbouring rows, which is correct: it is standing proud of
       them. The tile's overflow:hidden still keeps it inside the card. */
    rec.pad = Math.ceil(rec.h * cfg.depthRatio * dpr);
    rec.chpx = rec.hpx + rec.pad * 2;
    rec.cv.style.top = (-rec.pad / dpr) + "px";
    rec.cv.style.height = (rec.chpx / dpr) + "px";

    var ls = css(rec.li);
    var ts = css(rec.tile);
    rec.fill = ts.backgroundColor;      // the block's material -- the four solid planes take it

    /* ---- Front: the row as it already looks, plus its two rules ---------- */
    var f = surface(rec.band, rec.h, dpr);
    f.ctx.fillStyle = ts.backgroundColor;
    f.ctx.fillRect(0, 0, rec.band, rec.h);

    f.ctx.fillStyle = ls.color;
    f.ctx.textAlign = "center";
    f.ctx.textBaseline = "middle";
    f.ctx.font = ls.fontStyle + " " + ls.fontWeight + " " + ls.fontSize + "/" +
                 ls.lineHeight + " " + ls.fontFamily;

    var text = lines(rec.li);
    var lh = parseFloat(ls.lineHeight) || parseFloat(ls.fontSize) * 1.2;
    var cx = rec.textLeft + rec.textW / 2;
    var y0 = rec.h / 2 - (text.length - 1) * lh / 2;
    text.forEach(function (line, i) { f.ctx.fillText(line, cx, y0 + i * lh); });

    /* Baked in rather than left to the DOM: from beat 2 on, the rules are the
       block's own top and bottom edges and have to turn with it. */
    f.ctx.fillStyle = ls.borderBottomColor;
    f.ctx.fillRect(0, 0, rec.band, 1);
    f.ctx.fillRect(0, rec.h - 1, rec.band, 1);
    rec.front = f.cv;

    /* ---- Back: the project ---------------------------------------------- */
    var b = surface(rec.band, rec.h, dpr);
    b.ctx.fillStyle = ts.backgroundColor;
    b.ctx.fillRect(0, 0, rec.band, rec.h);

    var im = rec.img;
    if (im && im.complete && im.naturalWidth) {
      // cover, cropped about conf.pos
      var s = Math.max(rec.band / im.naturalWidth, rec.h / im.naturalHeight);
      var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      b.ctx.drawImage(im, (rec.band - dw) * rec.conf.pos[0], (rec.h - dh) * rec.conf.pos[1], dw, dh);
    }

    // Scrim -- enough to keep the label legible over an arbitrary crop of an
    // arbitrary photograph, without flattening it into a grey plate.
    var g = b.ctx.createLinearGradient(0, 0, rec.band, 0);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.45, "rgba(0,0,0,0.15)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    b.ctx.fillStyle = g;
    b.ctx.fillRect(0, 0, rec.band, rec.h);

    b.ctx.fillStyle = "#f9f6e6";
    b.ctx.textAlign = "center";
    b.ctx.textBaseline = "middle";
    b.ctx.font = '400 14px "ABC Favorit Mono", monospace';
    b.ctx.fillText(rec.conf.label.toUpperCase() + "  →", cx, rec.h / 2);
    rec.back = b.cv;
  }

  /* The four solid planes are the SAME MATERIAL as the front, and the lighting
     in render() is what separates them. Earlier builds painted a flat "edge"
     colour instead, which reads as a keyline drawn round a flat shape rather
     than as the sides of a solid. */
  function inks(rec) {
    var dark = document.body.classList.contains("dark");
    var m = /(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(rec.fill || "");

    /* Light mode: the solid planes are literally the tile's own fill, and the
       shading in render() is what turns them into visible surfaces.

       Dark mode cannot work that way, and not for want of tuning. The tile is
       black, the lighting is a vertex colour, and a vertex colour MULTIPLIES --
       nothing multiplied by black is anything but black, so the four planes
       would have no silhouette at all against the tile behind them. They take a
       lifted tone there instead: still plainly the same material as the face,
       but with somewhere to be shaded down from. The two textured faces are
       untouched by this and keep landing pixel-exact at either end. */
    rec.fillHex = dark
      ? (cfg.darkSolid || 0x3a3a36)
      : (m ? ((+m[1] << 16) | (+m[2] << 8) | +m[3]) : 0xf9f6e6);
  }

  function discard(rec) {
    kill(rec);
    rec.front = null;
    rec.back = null;
    /* Textures are per row and live on the GPU, so they are freed here rather
       than left for GC. The renderer, scene and geometry are shared and stay. */
    if (rec.texF) { rec.texF.dispose(); rec.texF = null; }
    if (rec.texB) { rec.texB.dispose(); rec.texB = null; }
    if (GL && GL.renderer.domElement.parentNode === rec.cv) {
      rec.cv.removeChild(GL.renderer.domElement);
    }
    rest(rec);
  }

  /* ======================================================================
     THE TWIST
     ====================================================================== */

  /* Angle of the band at column u (0..1) for gesture progress p.

       base   p * PI          the whole block turning over, 0 -> 180
       twist  arc * bump(u)   superimposed, and ZERO AT BOTH ENDS of the gesture

     The bump is what makes this land. Without it the twist would still be in
     the band at p=0 and p=1, so the row would neither start nor finish flat --
     it would snap into place at both ends. sin(PI*p) peaks at the midpoint,
     exactly where the reference has its two crossovers, and vanishes at rest. */
  function angle(p, u) {
    return Math.PI * p + cfg.arc * 2 * Math.PI * Math.sin(Math.PI * p) * (u - 0.5);
  }

  /* ======================================================================
     THE BLOCK  --  one shared three.js stage, re-parented per row
     ====================================================================== */

  var GL = null;

  function stage() {
    if (GL || !window.THREE) return GL;
    var T = THREE;

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(1);            // world unit == device pixel; see header
    renderer.setClearAlpha(0);
    renderer.domElement.className = "al-cap-gl";

    GL = {
      T: T,
      renderer: renderer,
      scene: new T.Scene(),
      camera: new T.PerspectiveCamera(cfg.fov, 1, 1, 100000),
      mesh: null,
      base: null,        // untwisted vertex positions
      key: ""            // geometry identity, so it is only rebuilt when it must be
    };
    return GL;
  }

  /* BoxGeometry's six material groups are ordered +X, -X, +Y, -Y, +Z, -Z: the
     two end caps, top, bottom, then the front and back faces. That ordering is
     the whole reason a box is the right primitive here -- the row's type goes on
     +Z, the project on -Z, and the four remaining planes are the solid the
     first three builds were only ever implying. */
  function geometry(rec) {
    var g = stage(); if (!g) return null;
    var T = g.T;
    var L = rec.wpx, H = rec.hpx, D = H * cfg.depthRatio;
    var key = L + "x" + H + "x" + Math.round(D) + "s" + cfg.seg;
    if (g.mesh && g.key === key) return g;

    if (g.mesh) {
      g.mesh.geometry.dispose();
      g.scene.remove(g.mesh);
    }

    var geo = new T.BoxGeometry(L, H, D, Math.max(8, cfg.seg), 1, 1);
    geo.setAttribute("color", new T.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));

    var mats = [
      new T.MeshBasicMaterial({ vertexColors: true }),   // +X cap
      new T.MeshBasicMaterial({ vertexColors: true }),   // -X cap
      new T.MeshBasicMaterial({ vertexColors: true }),   // +Y top
      new T.MeshBasicMaterial({ vertexColors: true }),   // -Y bottom
      new T.MeshBasicMaterial({ vertexColors: true }),   // +Z front  (the row)
      new T.MeshBasicMaterial({ vertexColors: true })    // -Z back   (the project)
    ];

    g.mesh = new T.Mesh(geo, mats);
    g.scene.add(g.mesh);
    g.base = new Float32Array(geo.attributes.position.array);   // pristine box
    g.key = key;
    g.D = D;
    return g;
  }

  function texture(canvas, turn) {
    var T = stage().T;
    var t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;      // match the CSS the bitmaps were authored against
    t.minFilter = T.LinearFilter;
    t.magFilter = T.LinearFilter;
    t.generateMipmaps = false;
    /* The back face needs its texture turned half a revolution. BoxGeometry lays
       out the -Z face to be read from behind the box; the block arrives there by
       rotating 180deg about its long axis, which flips the face vertically on
       top of that. Both together are a half turn, and without undoing it the
       photograph and the label land upside down AND mirrored at the one moment
       the reader is actually reading them. Corrected on the texture rather than
       by pre-rotating the bitmap so the same artwork still serves the 2D paths. */
    if (turn) {
      t.center.set(0.5, 0.5);
      t.rotation = Math.PI;
    }
    return t;
  }

  /* Hand the shared stage over to this row: its size, its two textures, its
     material tones, and its camera distance. */
  function adopt(rec) {
    var g = geometry(rec); if (!g) return null;
    var T = g.T;

    g.renderer.setSize(rec.wpx, rec.chpx, false);
    g.renderer.domElement.style.width = (rec.wpx / rec.dpr) + "px";
    g.renderer.domElement.style.height = (rec.chpx / rec.dpr) + "px";

    /* Dead-on, one world unit per device pixel. Distance is measured to the
       FRONT FACE, not to the box's centre, so it is that plane which lands 1:1
       -- half a depth nearer and the row would render a touch oversized at rest,
       which is exactly the frame the reader is comparing against the real one. */
    g.camera.fov = cfg.fov;
    g.camera.aspect = rec.wpx / rec.chpx;
    g.camera.position.set(0, 0, g.D / 2 + rec.chpx / (2 * Math.tan(cfg.fov * Math.PI / 360)));
    g.camera.lookAt(0, 0, 0);
    g.camera.updateProjectionMatrix();

    if (rec.texF) rec.texF.dispose();
    if (rec.texB) rec.texB.dispose();
    rec.texF = texture(rec.front, false);
    rec.texB = texture(rec.back, true);

    var m = g.mesh.material;
    m[4].map = rec.texF;  m[4].color.set(0xffffff);  m[4].needsUpdate = true;
    m[5].map = rec.texB;  m[5].color.set(0xffffff);  m[5].needsUpdate = true;
    /* The four solid planes are the tile's own fill -- the same material as the
       face, lit differently. A contrasting trim reads as a keyline drawn round a
       flat shape rather than as the sides of a solid. */
    for (var i = 0; i < 4; i++) { m[i].map = null; m[i].color.set(rec.fillHex); m[i].needsUpdate = true; }

    rec.cv.appendChild(g.renderer.domElement);
    return g;
  }

  /* Twist the pristine box about its long axis, relight it from the resulting
     normals, and draw. Everything is rebuilt from `base` each frame rather than
     accumulated, so seeking (and reversing) is exact and cannot drift. */
  function render(rec, p) {
    var g = GL;
    if (!g || !g.mesh || !rec.front) return;

    var geo = g.mesh.geometry;
    var pos = geo.attributes.position.array;
    var base = g.base;
    var L = rec.wpx, n = pos.length;

    for (var i = 0; i < n; i += 3) {
      var x = base[i], y = base[i + 1], z = base[i + 2];
      /* Sign matters and is easy to get backwards. Positive tips the front face
         DOWN, which is what swings the TOP plane into view -- the reference's
         read. Negating it tips the face up and exposes the underside instead,
         which is the same geometry showing you its dullest plane. */
      var th = angle(p, x / L + 0.5);
      var c = Math.cos(th), s = Math.sin(th);
      pos[i] = x;
      pos[i + 1] = y * c - z * s;
      pos[i + 2] = y * s + z * c;
    }
    geo.attributes.position.needsUpdate = true;

    /* Normals must be recomputed, not rotated: the twist is a different rotation
       at every x, so the surface genuinely bends along its length and the shading
       has to follow. BoxGeometry keeps its six faces on separate vertices, so
       this stays hard-edged at the corners and smooth along the twist. */
    geo.computeVertexNormals();

    var nor = geo.attributes.normal.array;
    var col = geo.attributes.color.array;
    var A = cfg.ambient, V = cfg.view, TOP = cfg.top;
    for (var j = 0; j < n; j += 3) {
      var ny = nor[j + 1], nz = nor[j + 2];
      /* Upward-facing planes DARKEN, they do not brighten. That looks backwards
         written down, and it is the difference between the block reading and
         not: this object is cream on a cream tile, so a top plane lit up towards
         white is indistinguishable from the background it sits on and the solid
         loses its silhouette entirely. The reference does the same thing --
         its top plane is a deeper red than its face, not a lighter one.

         The term keys off ny, which is exactly zero for a forward-facing normal,
         so it cannot disturb the one thing that has to stay exact: front-on
         renders at A + V = 1, its base colour, pixel-identical to the row. */
      var v = A + V * Math.max(0, nz) - TOP * Math.max(0, ny);
      col[j] = col[j + 1] = col[j + 2] = v < 0.1 ? 0.1 : (v > 1 ? 1 : v);
    }
    geo.attributes.color.needsUpdate = true;

    g.renderer.render(g.scene, g.camera);
  }
  /* ======================================================================
     STATE
     ====================================================================== */

  function build(rec) {
    if (rec.tl) return;
    if (!rec.front) paint(rec);
    if (!rec.front) return;

    inks(rec);
    if (!adopt(rec)) return;      // no WebGL -- the row stays a plain link

    var st = { p: 0 };
    var tl = gsap.timeline({
      paused: true,
      onReverseComplete: function () { rest(rec); },
      /* The row's ink is transparent for the whole gesture, so the ONLY thing
         between a reader and an empty row is this timeline reaching an end.
         onReverseComplete is not that guarantee -- a kill or an overwrite ends
         it without ever firing. Same hazard caseStudyNav() documents at length
         after a stalled ticker left the Work tile blank; the answer there and
         here is that no resting state may depend on a tween completing. */
      onInterrupt: function () { rest(rec); }
    });

    if (reduce) {
      // No twist. The block is already turned; it simply arrives.
      render(rec, 1);
      tl.to([rec.topEl, rec.bot], { scaleX: rec.spread, duration: 0.2, ease: "none" }, 0)
        .to(rec.cv, { opacity: 1, duration: 0.25, ease: "none" }, 0.1);
    } else {
      // Beat 1 -- the rules pull out from the text column to the tile's edges.
      tl.to([rec.topEl, rec.bot], {
        scaleX: rec.spread, duration: cfg.rule, ease: "power2.out"
      }, 0);

      /* Beat 2 -- the block turns. Everything hands over on this one frame: the
         rules go (they are painted INTO the block from here, as its own edges,
         so they turn with it instead of sitting flat on top), the canvas comes
         up, and only NOW does the real row's ink go transparent.

         That last one is the whole reason this is a `set` here and not part of
         enter(). Blanking the row at enter() left it empty for the length of
         beat 1 -- rules pulling out around nothing, the text gone before
         anything had replaced it. Through beat 1 the row is still just a row. */
      tl.set([rec.topEl, rec.bot], { opacity: 0 }, cfg.rule + cfg.hold)
        .set(rec.cv, { opacity: 1 }, cfg.rule + cfg.hold)
        .set(rec.li, { color: "transparent" }, cfg.rule + cfg.hold)
        .to(st, {
          p: 1,
          duration: cfg.turn,
          ease: cfg.ease,
          onUpdate: function () { render(rec, st.p); }
        }, cfg.rule + cfg.hold);
    }

    rec.tl = tl;
    rec.st = st;
  }

  function enter(rec) {
    if (rec.on || rec.hit.hidden) return;
    rec.on = true;
    build(rec);
    if (!rec.tl) return;

    /* All of this in one synchronous block, before the timeline advances a
       frame. The canvas starts hidden and the rules start exactly on top of the
       list's own, so the only visible change on this frame is the list's rules
       going transparent underneath ones drawn in the same place -- the row still
       reads normally. The ink is left alone until beat 2 takes over. */
    rec.hit.classList.add("is-live");
    gsap.set([rec.topEl, rec.bot], { opacity: 1 });
    rec.li.style.borderBottomColor = "transparent";
    if (rec.prev) rec.prev.style.borderBottomColor = "transparent";
    rec.tl.play();
  }

  function leave(rec) {
    if (!rec.on) return;
    rec.on = false;
    if (!rec.tl) { rest(rec); return; }
    // Reversing rather than replaying unwinds the twist and then walks the rules
    // back in, so the exit mirrors the entrance instead of merely undoing it.
    rec.tl.reverse();
  }

  function rest(rec) {
    rec.hit.classList.remove("is-live");
    rec.li.style.color = "";
    rec.li.style.borderBottomColor = "";
    if (rec.prev) rec.prev.style.borderBottomColor = "";
    // opacity 0, not 1: at rest the list draws its own rules and these must not double them.
    if (rec.topEl) gsap.set([rec.topEl, rec.bot], { scaleX: 1, opacity: 0 });
    gsap.set(rec.cv, { opacity: 0 });
    if (rec.stale) { rec.stale = false; discard(rec); }
  }

  function kill(rec) {
    /* Cleared BEFORE killing: kill() fires onInterrupt, which routes back
       through rest() and can come straight back in here. With the handle
       already gone that second pass finds nothing to do and stops. */
    var tl = rec.tl;
    rec.tl = null;
    rec.on = false;
    if (tl) tl.kill();
  }

  function wire(rec) {
    rec.hit.addEventListener("pointerenter", function () { enter(rec); });
    rec.hit.addEventListener("pointerleave", function () { leave(rec); });
    // Keyboard gets the same reveal, so this is not a mouse-only affordance.
    rec.hit.addEventListener("focus", function () { enter(rec); });
    rec.hit.addEventListener("blur", function () { leave(rec); });
    rec.hit.addEventListener("click", function () {
      if (window.__CASESTUDY) window.__CASESTUDY.open("home");
    });
    rec.hit.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (window.__CASESTUDY) window.__CASESTUDY.open("home");
      }
    });
  }

  /* rAF is suspended in a background tab, so a row hovered as the reader tabs
     away would sit mid-gesture with its ink transparent until they came back --
     and if the pointer has left in the meantime, no event ever arrives to undo
     it. Snap anything in flight straight back rather than leaving it parked. */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) return;
    rows.forEach(function (rec) {
      if (rec.on || (rec.tl && rec.tl.isActive())) discard(rec);
    });
  });

  ready(function () {
    mount();
    rows.forEach(wire);
  });

  window.__CAPTWIST = {
    cfg: cfg,
    /* Always repaints. cfg changes are invisible to measureAll's "did the box
       move" test -- the geometry is identical, the arc or the step is not -- so
       leaving it to that path would silently no-op and look broken. */
    set: function (o) {
      Object.assign(cfg, o || {});
      rows.forEach(discard);
      measureAll(true);
      return cfg;
    },
    cases: CASES,
    // The shared three.js stage: renderer, scene, camera, mesh. For tuning.
    gl: function () { return GL; },
    remeasure: repaint,
    /* Park a row at a fixed progress to art-direct a single frame of the turn.
       Marks the row busy and drops any queued invalidation, or a pending
       observer callback lands a frame later and wipes what you asked to see.
       Clear it with a pointerleave on the row, or __CAPTWIST.set({}). */
    peek: function (i, p) {
      var rec = rows[i];
      if (!rec) return;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      rec.on = true;
      if (!rec.front) paint(rec);
      inks(rec);
      if (!adopt(rec)) return;
      rec.hit.classList.add("is-live");
      rec.li.style.color = "transparent";
      rec.li.style.borderBottomColor = "transparent";
      if (rec.prev) rec.prev.style.borderBottomColor = "transparent";
      gsap.set([rec.topEl, rec.bot], { opacity: 0 });
      gsap.set(rec.cv, { opacity: 1 });
      render(rec, p);
    }
  };
})();
