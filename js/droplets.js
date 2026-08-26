/* ============================================================================================
   CENTRAL INTELLIGENCE — three parts, one organism.

   Reference: the AD's mockup (Main hero.png), screen recording (blobs.mov), and brik.space
   "Molten Golem Morph". Base maths: the Codrops droplet tutorial (Yuki Kojima, 2025-06-09) —
   orthographic ray setup, sphere SDF, exponential smooth-min, value noise, FD normals.

   ---------------------------------------------------------------------------------------------
   THE CONCEPT: three parts that become one organism / nucleus.
     Central Intelligence = WHITE   ·   Creative = PINK   ·   Media = GREEN
   They drift, are drawn toward a common centre, fuse into a single nucleus and breathe apart
   again. Continuous and ambient — there is nothing to collect and nothing that completes. An
   earlier version built a "absorb two and finish" mechanic; that game logic fought the feel and
   was removed on purpose. Don't put it back.

   TRANSPARENT BODIES OVER THE HEADLINE. The type is NOT drawn on top of the blobs and it is not
   a DOM layer — it lives in a texture the shader samples, so that:
     - where a ray misses, you see the headline plainly;
     - where a ray hits a body, the headline is sampled through a DISPLACED coordinate derived
       from the surface normal, which is what warps and smears the letterforms as a mass passes
       over them. That warp is the whole point of the bodies being transparent.

   RIM-LIT, NOT FILLED. Almost all the energy is a neon edge where the surface turns away from
   the viewer; the interior is nearly clear. Pixels that MISS still glow, using the closest the
   ray ever came to the field — a raymarcher already knows that, so the bleed is free.

   THE INFLATION TRAP, because it has bitten this file three times: exponential smooth-min makes
   a group of N spheres FATTER by log(N)/k. Effective radius ~= nominal + log(N_local)/k. Budget
   with the effective figure or everything merges into one screen-filling mass.

   Live: window.__MOLTEN.set({ rimStrength: 2.6, warp: 0.12, ... }) · .state()
   ============================================================================================ */
(function () {
  "use strict";

  var PARTS = 3;        // white / pink / green
  var LOBES = 3;        // sub-spheres each, so no part is ever a rigid sphere
  var LOBE_COUNT = PARTS * LOBES;

  var CONFIG = {
    // ---- the three parts (see .al-planet-key in styles.css) ----
    /* Enigma blue. Was a soft white, which is invisible on cream: the fill works by MULTIPLYING
       the background by the part colour, and cream x near-white is still cream, so that part had
       nothing to darken with and simply did not render. Blue multiplies to a rich blue and ties
       the section to the APPROACH tile in the rail. */
    ci:        [0.000, 0.161, 0.643],   // Central Intelligence — blue #0029a4
    creative:  [1.000, 0.620, 0.929],   // Creative — pink  #ff9eed
    media:     [0.000, 0.898, 0.573],   // Media — green #00e592

    // ---- look ----
    rimPower:    3.2,      // outline thinness. Higher = crisper line.
    /* Low on cream: this term is additive and clips the same way the inner glow did. It earns
       its keep only on a dark background — push it to 2.5+ if the background goes dark again. */
    rimStrength: 0.35,     // the hard neon edge. Values >1 clip to white, which is what gives
                           // the rim a white-hot core over a coloured falloff, as in the reference.
    /* OUTER GLOW OFF (AD). It is additive, so on cream it had no headroom and only produced a
       pale haze around the bodies. Set above 0 only if the background goes dark again. */
    glowStrength:0.02,      // neon bleed OUTSIDE the silhouette
    glowFalloff: 14.0,      // higher = tighter halo. Lower spreads the bloom further out.
    /* HOW MUCH COLOUR THE FILL CARRIES. This term MULTIPLIES the background by the part colour,
       which darkens and saturates on a light ground — so unlike the additive rim and glow, it is
       the one part of the model that actually works on cream. On a dark background keep it low
       (~0.2); on cream it has to do the heavy lifting, hence 0.85. */
    tint:        0.00,
    /* INNER GLOW — light bleeding inward from the rim into the body. This was at 0.10, i.e.
       effectively off, which is why the bodies read flat and unlit compared with the reference.
       It shares the rim's fresnel term but at a much lower power, so it spreads well inside the
       silhouette instead of hugging the edge. */
    interior:    2.00,      // edge shading strength (deepens the hue outward)
    coreGlow:    2.00,      // brightness of the crisp silhouette outline
    specStrength:0.40,      // the offset softbox highlight
    specPower:   8.5,       // its tightness. Higher = smaller, glossier. Lower = broad sheen.
    corePower:   6.0,      // how broadly the DEEP centre spreads. Lower = deeper, wider core.
    coreTint:    0.96,      // how far the core lifts toward white. 0 = pure hue, 1 = white.
    innerPower:  6.0,     // rim-glow width. LOWER = the glow floods further inward.
    /* HEADLINE DISPLACEMENT — the hero effect. This is in SCREEN uv, so it is a fraction of the
       whole section: 0.115 shifted the lookup 11% of the width and read as a hard doubled ghost
       of the type rather than a bend. Small values are the whole game here. */
    warp:        0.020,
    ior:         1.34,     // refraction index. Higher = more bending at the edges.
    warpNoise:   0.014,    // organic wobble in the see-through, so it is not optically perfect
    warpNoiseScale: 2.6,

    // ---- field ----
    smoothK:     3.9,      // blend reach ~1/k
    partRadius:  0.10,     // effective ~ nominal + log(N_local)/k
    lobeSpread:  0.17,
    lobeSpeed:   0.20,

    // ---- behaviour ----
    cohesion:    0.57,     // pull toward the shared nucleus — what makes them ONE organism
    breathe:     1.26,     // how far they drift back out again
    breatheRate: 0.085,
    wander:      0.30,

    /* GRAB, not attract. The nearest part inside pointerReach is CAPTURED and tracks the cursor
       directly; cohesion and wander are switched off for it while held. The previous version only
       added an attraction force on top of the cohesion spring, so the part was being pulled two
       ways at once and felt heavy and sticky — you were fighting the blob rather than moving it.
       Three lags used to compound here (cursor ease -> velocity/damping -> cohesion); now there
       is exactly one, grabEase, and it is the only thing to tune for feel. */
    pointerReach:1.10,     // how close the cursor must be to capture a part
    gyro:        true,     // tilt-to-steer on touch devices
    /* The prompt is permanent on iOS — motion access always needs a real tap — so it is worth
       treating as copy rather than as a technical notice. */
    tiltCta:     "TIP THE BALANCE",
    tiltRange:   26,       // degrees of tilt for full deflection. Lower = twitchier.
    pointerEase: 0.45,     // cursor tracking. High: the pointer itself should not feel laggy.
    grabEase:    0.58,     // how hard the held part chases the cursor. 1 = instant, 0.15 = heavy.

    /* Lobes trail their part instead of being pinned to it, so moving fast SMEARS the body out
       and it gathers back up when you stop — this is where the molten stretch comes from now
       that the part itself is directly controlled. First lobe is the head and barely lags. */
    lobeLag:     [0.55, 0.30, 0.20],

    // ---- headline ----
    headA:      "Central",
    headB:      "Intelligence",
    typeSize:   0.20,      // fraction of section height
    headAY:     0.22,      // baseline of "Central",      as a fraction of height
    headBY:     0.78,
    keyY:       0.955,     // baseline of the capability key
    typeFit:    0.90,      // max fraction of WIDTH the headline may occupy before it scales down
    stackAspect:1.15,      // below this w/h the layout stacks and centres (portrait / mobile)
    mobileScale:0.72,      // headline size multiplier once stacked
    mHeadAY:    0.42,      // stacked baselines, both centred
    mHeadBY:    0.56,      // baseline of "Intelligence",  as a fraction of height
    typeColor:  "#000000",
    /* THE BACKGROUND LIVES HERE, not just in CSS. The shader samples the type texture for every
       pixel it does not hit, so this canvas fill IS the section's background — and the neon is
       ADDITIVE over it. Keep .al-resin-host in styles.css matching this value; the CSS only shows
       before the first frame, but a mismatch flashes. */
    background: "#f9f6e6"
  };

  var VERT = [
    "attribute vec3 position;",
    "varying vec2 vTexCoord;",
    "void main() {",
    "    vTexCoord = position.xy * 0.5 + 0.5;",
    "    gl_Position = vec4(position, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "",
    "const float EPS = 1e-4;",
    "const int ITR = 48;",
    "const int LOBE_COUNT = " + LOBE_COUNT + ";",
    "",
    "uniform vec2 uResolution;",
    "uniform float uTime;",
    "uniform vec3 uLobe[LOBE_COUNT];",        // xy = position, z = radius
    "uniform vec3 uLobeColor[LOBE_COUNT];",
    "uniform sampler2D uType;",
    "uniform float uRimPower, uRimStrength, uGlowStrength, uGlowFalloff;",
    "uniform float uTint, uInterior, uInnerPower, uCoreGlow, uCorePower, uCoreTint;",
    "uniform float uSpecStrength, uSpecPower, uWarp, uIor, uWarpNoise, uWarpNoiseScale, uK;",
    "",
    "varying vec2 vTexCoord;",
    "",
    "// Camera Params — tutorial (orthographic)",
    "vec3 origin = vec3(0.0, 0.0, 1.0);",
    "vec3 lookAt = vec3(0.0, 0.0, 0.0);",
    "vec3 cDir = normalize(lookAt - origin);",
    "vec3 cUp = vec3(0.0, 1.0, 0.0);",
    "vec3 cSide = cross(cDir, cUp);",
    "",
    "float sdSphere(vec3 p, vec3 c, float s) { return length(p - c) - s; }",
    "",
    /* Accumulated exponential smooth-min: -log(sum exp(-k*d))/k. Identical to chaining the
       tutorial's pairwise smoothMin, at one log instead of N. */
    "float map(vec3 p) {",
    "    float sum = 0.0;",
    "    for (int b = 0; b < LOBE_COUNT; b++) {",
    "        if (uLobe[b].z > 0.0005)",
    "            sum += exp(-uK * sdSphere(p, vec3(uLobe[b].xy, 0.0), uLobe[b].z));",
    "    }",
    "    return -log(max(sum, 1e-20)) / uK;",
    "}",
    "",
    /* Which PART owns this point. Uses the smooth-min's own weights, so the colour gradient
       across a neck is the geometry's blend — the three parts bleed into each other exactly
       where they fuse, which is what makes them read as one organism rather than three objects. */
    "vec3 partColor(vec3 p) {",
    "    float sum = 1e-20;",
    "    vec3 acc = vec3(0.0);",
    "    for (int b = 0; b < LOBE_COUNT; b++) {",
    "        if (uLobe[b].z > 0.0005) {",
    "            float w = exp(-uK * sdSphere(p, vec3(uLobe[b].xy, 0.0), uLobe[b].z));",
    "            acc += uLobeColor[b] * w;",
    "            sum += w;",
    "        }",
    "    }",
    "    return acc / sum;",
    "}",
    "",
    "vec3 generateNormal(vec3 p) {",
    "    return normalize(vec3(",
    "            map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),",
    "            map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),",
    "            map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))",
    "        ));",
    "}",
    "",
    "void main() {",
    "    vec2 uv = gl_FragCoord.xy / uResolution;",   // screen space — matches the type canvas 1:1
    "    vec2 p = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);",
    "",
    "    vec3 ray = origin + cSide * p.x + cUp * p.y;",
    "    vec3 rayDirection = cDir;",
    "",
    "    float dist = 0.0;",
    "    float nearest = 1e5;",                       // drives the outer glow on a miss
    "",
    "    for (int i = 0; i < ITR; ++i) {",
    "        dist = map(ray);",
    "        nearest = min(nearest, dist);",
    "        ray += rayDirection * dist;",
    "        if (dist < EPS) break;",
    "        if (ray.z < -3.0) break;",
    "    }",
    "",
    "    vec3 color;",
    "",
    "    if (dist < EPS) {",
    "        vec3 n = generateNormal(ray);",
    "        float facing = abs(dot(n, -rayDirection));",
    "        float rim = pow(1.0 - facing, uRimPower);",
    "        vec3 part = partColor(ray);",
    "",
    /* THE WARP. Displace the lookup by the surface normal, so the headline bends hardest where
       the body curves most — at the edges — and passes almost straight through the flat middle.
       This is what makes the bodies read as transparent volumes sitting over the type rather
       than holes cut in it. */
    /* REFRACTED, not offset. `uv + n.xy * warp` displaces by a fixed rule everywhere, so the type
       reads as a shifted mirror copy of itself. refract() bends nothing when you look straight
       through the body and progressively harder toward grazing angles — which is what a lens
       actually does, and what stops the middle looking like a duplicate pasted over the original.
       The noise term adds organic imperfection so it reads as hand-poured resin rather than
       optically perfect glass. */
    "        vec3 rdir = refract(rayDirection, n, 1.0 / uIor);",
    "        if (dot(rdir, rdir) < 0.0001) rdir = reflect(rayDirection, n);",
    /* Trig ripple rather than value noise: noise3D was removed when the shader was rewritten for
       the three-part organism, and two crossed waves at different frequencies give a good enough
       irregular wobble here for a fraction of the cost. */
    "        float rip = sin(ray.x * uWarpNoiseScale * 3.1 + uTime * 0.45)",
    "                  * cos(ray.y * uWarpNoiseScale * 2.3 - uTime * 0.37);",
    "        vec2 wuv = uv + rdir.xy * uWarp * 7.0 + vec2(rip, rip * 0.7) * uWarpNoise;",
    "        vec3 behind = texture2D(uType, wuv).rgb;",
    "",
    /* The body barely darkens what is behind it — only a light tint of its own part colour, so
       the type stays readable through it. */
    "        vec3 body = behind * (1.0 - uTint) + behind * part * uTint;",
    /* INNER SHADING, not additive glow. Adding light clips: green (0, 0.898, 0.573) scaled up
       pins the green AND blue channels at 1.0 while red stays 0, which renders as cyan — that is
       where the "blue inner glow" on the green body came from. Multiplying instead deepens the
       body's own hue toward the edges, so green shades to a richer green and can never drift to
       another colour. It also works on cream, where additive light has no headroom. */
    /* INVERTED to match the BioResin reference the AD approved. That blob is DARK in the middle
       and BRIGHT at the edges — light wrapping the silhouette and glowing inward, with the deepest
       saturation where you look through the most material. Earlier passes had it the other way up
       (lit core, shaded rim), which is why raising the glow never produced the reference look: it
       was brightening the wrong region entirely.
       So: the CENTRE deepens... */
    "        float core = pow(facing, uCorePower);",
    "        body = mix(body, body * part * 1.6, clamp(core * uInterior, 0.0, 1.0));",
    /* INNER GLOW, restored — but as a MIX toward a lighter tint of the body's own hue, never as
       added light. Adding is what turned green into cyan; mixing cannot clip and cannot leave the
       hue, so the core can be made as luminous as you like and it stays green/pink/blue. Paired
       with the edge shading above, this is what gives the bodies volume instead of reading flat. */
    /* ...and the RIM glows. Still a mix toward a pale tint of the body's own hue, never additive,
       so it cannot clip or shift colour however strong it gets. */
    "        vec3 lit = mix(part, vec3(1.0), uCoreTint);",
    /* (1) OFFSET SPECULAR — the soft light blob sitting up and to one side in the reference.
       It comes from a light DIRECTION, not from `facing`: facing-based terms are symmetrical about
       the centre of a body and can only ever produce a centred glow, which is why none of the
       previous passes could make a highlight that sits off to one side like a real reflection. */
    "        vec3 L = normalize(vec3(-0.40, 0.60, 0.69));",
    "        float spec = pow(max(dot(n, L), 0.0), uSpecPower);",
    "        body = mix(body, lit, clamp(spec * uSpecStrength, 0.0, 1.0));",
    /* (2) CRISP OUTLINE — a hard bright line hugging the silhouette. High uRimPower keeps it thin;
       a low power smears it into the soft inward glow we had before, which reads as haze, not as
       the drawn edge in the reference. */
    "        float edge = pow(1.0 - facing, uRimPower);",
    "        body = mix(body, lit, clamp(edge * uCoreGlow, 0.0, 1.0));",
    "",
    "        color = body + part * rim * uRimStrength;",
    "    } else {",
    "        vec3 behind = texture2D(uType, uv).rgb;",
    "        float g = exp(-max(nearest, 0.0) * uGlowFalloff);",
    /* The halo is additive over the type, so the glow washes across the letters rather than
       masking them. */
    "        color = behind + partColor(ray) * g * uGlowStrength;",
    "    }",
    "",
    "    gl_FragColor = vec4(color, 1.0);",
    "}"
  ].join("\n");

  function init() {
    if (!window.THREE) return;
    var host = document.querySelector(".al-resin-host");
    if (!host) return;
    var canvas = host.querySelector(".al-resin-canvas");
    if (!canvas) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(new THREE.Color(CONFIG.background), 1);

    var scene = new THREE.Scene();
    var camera = new THREE.Camera();

    /* ---------- headline texture ----------
       Drawn to a canvas at the section's own aspect so the shader can sample it in plain screen
       space. It must be a texture, not a DOM heading: the shader has to displace the lookup to
       warp it. The real <h1> stays in the markup for assistive tech. */
    var tc = document.createElement("canvas");
    var tctx = tc.getContext("2d");
    var typeTex = new THREE.CanvasTexture(tc);
    typeTex.minFilter = THREE.LinearFilter;
    typeTex.magFilter = THREE.LinearFilter;
    typeTex.wrapS = typeTex.wrapT = THREE.ClampToEdgeWrapping;

    function drawType() {
      var W = tc.width, H = tc.height;
      if (!W || !H) return;
      tctx.clearRect(0, 0, W, H);
      tctx.fillStyle = CONFIG.background;
      tctx.fillRect(0, 0, W, H);
      /* ---- HEADLINE ----
         The desktop layout is the mockup's diagonal: "Central" upper-left, "Intelligence"
         lower-right. Below `stackAspect` the section is portrait and that diagonal cannot work —
         the words would run off both edges — so the two lines stack and centre instead.

         SIZE IS FITTED, NOT FIXED. `typeSize` is a fraction of HEIGHT, which is the right basis
         on a wide section but says nothing about whether the word fits across a narrow one.
         "Intelligence" is long, so on a phone a height-derived size overflows badly. Measuring the
         widest word and scaling down to `typeFit` of the width means the type always fits its
         space proportionally, at any viewport, without a separate mobile size to keep in sync. */
      var aspect = W / H;
      var mobile = aspect < CONFIG.stackAspect;

      var size = H * CONFIG.typeSize * (mobile ? CONFIG.mobileScale : 1);
      tctx.fillStyle = CONFIG.typeColor;
      tctx.textBaseline = "alphabetic";
      tctx.font = size + 'px "Enigma Large", serif';
      var widest = Math.max(tctx.measureText(CONFIG.headA).width,
                            tctx.measureText(CONFIG.headB).width);
      var maxW = W * CONFIG.typeFit;
      if (widest > maxW && widest > 0) {
        size = size * (maxW / widest);
        tctx.font = size + 'px "Enigma Large", serif';
      }

      if (mobile) {
        tctx.textAlign = "center";
        tctx.fillText(CONFIG.headA, W * 0.5, H * CONFIG.mHeadAY);
        tctx.fillText(CONFIG.headB, W * 0.5, H * CONFIG.mHeadBY);
      } else {
        tctx.textAlign = "left";
        tctx.fillText(CONFIG.headA, W * 0.04, H * CONFIG.headAY);
        tctx.textAlign = "right";
        tctx.fillText(CONFIG.headB, W * 0.97, H * CONFIG.headBY);
      }

      /* THE KEY IS DRAWN INTO THE TEXTURE TOO, not left as the DOM element it used to be. Only
         what lives in this canvas is sampled through the refracted lookup, so a DOM key would sit
         optically flat on top while the headline bent around it -- the one thing that gives the
         illusion away. Its DOM twin is kept for assistive tech and visually hidden. */
      var rgb = function (a) {
        return "rgb(" + Math.round(a[0] * 255) + "," + Math.round(a[1] * 255) + "," + Math.round(a[2] * 255) + ")";
      };
      var items = [["Central Intelligence", CONFIG.ci], ["Creative", CONFIG.creative], ["Media", CONFIG.media]];
      var fs = Math.max(11, Math.round(H * 0.019));
      tctx.font = fs + 'px "ABC Favorit Mono", monospace';
      tctx.textAlign = "left";
      var dotR = fs * 0.30, padDot = fs * 0.70, gap = fs * 1.5;
      var ws = items.map(function (it) { return tctx.measureText(it[0].toUpperCase()).width; });
      var total = gap * (items.length - 1);
      for (var q = 0; q < items.length; q++) total += ws[q] + dotR * 2 + padDot;
      /* The key overflows a phone at the desktop size, so shrink it to fit the same way the
         headline does before positioning. */
      if (total > W * 0.94 && total > 0) {
        fs = Math.max(8, fs * (W * 0.94) / total);
        tctx.font = fs + 'px "ABC Favorit Mono", monospace';
        dotR = fs * 0.30; padDot = fs * 0.70; gap = fs * 1.5;
        ws = items.map(function (it) { return tctx.measureText(it[0].toUpperCase()).width; });
        total = gap * (items.length - 1);
        for (var q2 = 0; q2 < items.length; q2++) total += ws[q2] + dotR * 2 + padDot;
      }
      var kx = (W - total) / 2, ky = H * CONFIG.keyY;
      for (var m = 0; m < items.length; m++) {
        tctx.beginPath();
        tctx.arc(kx + dotR, ky - fs * 0.32, dotR, 0, Math.PI * 2);
        tctx.fillStyle = rgb(items[m][1]);
        tctx.fill();
        kx += dotR * 2 + padDot;
        tctx.fillStyle = CONFIG.typeColor;
        tctx.fillText(items[m][0].toUpperCase(), kx, ky);
        kx += ws[m] + gap;
      }
      typeTex.needsUpdate = true;
    }
    /* The .otf loads asynchronously; without this the first paint is Times New Roman and nothing
       ever invalidates the texture afterwards. */
    if (document.fonts && document.fonts.load) {
      document.fonts.load('300px "Enigma Large"').then(drawType).catch(function () {});
      document.fonts.ready.then(drawType).catch(function () {});
    }

    var lobe = [], lobeColor = [];
    for (var l = 0; l < LOBE_COUNT; l++) { lobe.push(new THREE.Vector3()); lobeColor.push(new THREE.Vector3()); }

    var uniforms = {
      uTime:         { value: 0 },
      uResolution:   { value: new THREE.Vector2(1, 1) },
      uLobe:         { value: lobe },
      uLobeColor:    { value: lobeColor },
      uType:         { value: typeTex },
      uRimPower:     { value: CONFIG.rimPower },
      uRimStrength:  { value: CONFIG.rimStrength },
      uGlowStrength: { value: CONFIG.glowStrength },
      uGlowFalloff:  { value: CONFIG.glowFalloff },
      uTint:         { value: CONFIG.tint },
      uInterior:     { value: CONFIG.interior },
      uInnerPower:   { value: CONFIG.innerPower },
      uCoreGlow:     { value: CONFIG.coreGlow },
      uCorePower:    { value: CONFIG.corePower },
      uCoreTint:     { value: CONFIG.coreTint },
      uSpecStrength: { value: CONFIG.specStrength },
      uSpecPower:    { value: CONFIG.specPower },
      uIor:          { value: CONFIG.ior },
      uWarpNoise:    { value: CONFIG.warpNoise },
      uWarpNoiseScale:{ value: CONFIG.warpNoiseScale },
      uWarp:         { value: CONFIG.warp },
      uK:            { value: CONFIG.smoothK }
    };

    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 2.0),
      new THREE.RawShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms })
    );
    plane.frustumCulled = false;
    scene.add(plane);

    /* ---------- the three parts ---------- */
    var palette = [CONFIG.ci, CONFIG.creative, CONFIG.media];
    var parts = [];
    for (var i = 0; i < PARTS; i++) {
      var a = (i / PARTS) * Math.PI * 2 - 0.6;
      var px = Math.cos(a) * 0.9, py = Math.sin(a) * 0.7;
      // lobe positions are persistent so they can lag behind the part and smear it
      var lp = [];
      for (var q = 0; q < LOBES; q++) lp.push({ x: px, y: py });
      parts.push({ x: px, y: py, vx: 0, vy: 0, seed: i * 9.13, lobes: lp });
    }
    function paintColors() {
      for (var b = 0; b < PARTS; b++)
        for (var j = 0; j < LOBES; j++)
          lobeColor[b * LOBES + j].fromArray(palette[b]);
    }
    paintColors();

    /* ---------- pointer ---------- */
    var pointer = new THREE.Vector2(0, 0), pointerActive = false, cursor = { x: 0, y: 0 };
    var grabbed = -1;   // index of the part currently held by the cursor, or -1
    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      var ax = r.width / Math.min(r.width, r.height);
      pointer.set((((e.clientX - r.left) / r.width) * 2 - 1) * ax,
                  -(((e.clientY - r.top) / r.height) * 2 - 1));
      pointerActive = true;
    }, { passive: true });
    host.addEventListener("pointerleave", function () { pointerActive = false; }, { passive: true });

    /* ---------- GYROSCOPE (mobile) ----------
       Tilting the phone steers the organism instead of dragging it. Feeds the same `pointer`
       target the mouse writes to, so everything downstream — capture, drag easing, lobe smear —
       is untouched and the two inputs can never disagree.

       CALIBRATED ON FIRST READING, not to absolute zero. Nobody holds a phone flat; taking the
       first sample as neutral means whatever angle you are already holding it at becomes centre,
       and the tilt is measured relative to that. Without this the organism sits pinned in a
       corner until you lie the phone on a table.

       PERMISSION: iOS 13+ requires DeviceOrientationEvent.requestPermission() from inside a user
       gesture, so there is a tap prompt. It also requires a SECURE CONTEXT — over plain http the
       API is simply absent, which is why the prompt reports that rather than silently doing
       nothing. Android needs https too. */
    var gyro = { baseB: null, baseG: null, on: false };
    function onOrient(e) {
      if (e.beta === null && e.gamma === null) return;
      if (gyro.baseB === null) { gyro.baseB = e.beta || 0; gyro.baseG = e.gamma || 0; }
      var rw = uniforms.uResolution.value.x, rh = uniforms.uResolution.value.y;
      var ax = rw / Math.min(rw, rh);
      var dx = ((e.gamma || 0) - gyro.baseG) / CONFIG.tiltRange;
      var dy = -((e.beta || 0) - gyro.baseB) / CONFIG.tiltRange;
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      pointer.set(dx * ax, dy);
      pointerActive = true;
      gyro.on = true;
    }

    function enableGyro() {
      if (typeof DeviceOrientationEvent === "undefined") return Promise.resolve("unsupported");
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        return DeviceOrientationEvent.requestPermission().then(function (r) {
          if (r === "granted") { window.addEventListener("deviceorientation", onOrient); return "granted"; }
          return "denied";
        }).catch(function () { return "error"; });
      }
      window.addEventListener("deviceorientation", onOrient);
      return Promise.resolve("granted");
    }

    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse && CONFIG.gyro) {
      var tip = document.createElement("button");
      tip.type = "button";
      tip.textContent = CONFIG.tiltCta;
      tip.style.cssText =
        /* 18% up, not 16px: the key is drawn into the texture at keyY 0.955 and a bottom-anchored
           button sat straight on top of it. This lands in the gap between the stacked headline
           (lowest line ~0.56) and the key. */
        "position:absolute;left:50%;bottom:18%;transform:translateX(-50%);z-index:70;" +
        "padding:10px 16px;border-radius:999px;border:1px solid rgba(0,0,0,.25);" +
        "background:rgba(255,255,255,.9);color:#111;font:600 11px/1 ui-monospace,monospace;" +
        "letter-spacing:.08em;cursor:pointer;";
      host.appendChild(tip);
      tip.addEventListener("click", function (e) {
        e.stopPropagation();
        enableGyro().then(function (r) {
          if (r === "granted") { tip.remove(); }
          else if (r === "unsupported") { tip.textContent = "NEEDS A SECURE CONNECTION"; }
          else { tip.textContent = "MOTION ACCESS DENIED"; }
        });
      });
      window.__GYRO = { enable: enableGyro, state: function () { return gyro; } };
    }

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      var dpr = renderer.getPixelRatio();
      /* DEVICE pixels: gl_FragCoord is in device pixels and every shader coordinate derives from
         uResolution, so CSS pixels here shift the composition at any DPR above 1. */
      uniforms.uResolution.value.set(w * dpr, h * dpr);
      tc.width = Math.round(w * dpr); tc.height = Math.round(h * dpr);
      drawType();
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    resize();

    /* Starts true: the observer only parks the loop once it reports we are off screen. Defaulting
       to false deadlocks, because that callback is delivered by the rendering pipeline we would
       be refusing to run. */
    var inView = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; }, { threshold: 0.01 }).observe(host);
    }

    var t0 = performance.now(), last = t0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (!inView) { last = now; return; }
      var dt = Math.min((now - last) * 0.001, 0.05); last = now;
      var time = (now - t0) * 0.001;
      uniforms.uTime.value = time;

      var rw = uniforms.uResolution.value.x, rh = uniforms.uResolution.value.y;
      var ax = rw / Math.min(rw, rh);

      var tx = pointerActive ? pointer.x : Math.cos(time * 0.19) * ax * 0.45;
      var ty = pointerActive ? pointer.y : Math.sin(time * 0.15) * 0.45;
      cursor.x += (tx - cursor.x) * CONFIG.pointerEase;
      cursor.y += (ty - cursor.y) * CONFIG.pointerEase;

      /* ONE ORGANISM. Every part is pulled toward a shared nucleus, and the nucleus itself
         breathes — so they fuse, hold, and ease apart again without ever fully separating. That
         cycle is the concept: three things behaving as one body. */
      var breath = 1.0 + Math.sin(time * CONFIG.breatheRate * 6.28) * CONFIG.breathe;

      /* Decide what is held FIRST, so only one part is ever captured. Picking per-part inside the
         loop let several grab the cursor at once, which is another reason it felt like mud. */
      grabbed = -1;
      var best = CONFIG.pointerReach;
      for (var g = 0; g < PARTS; g++) {
        var gd = Math.hypot(cursor.x - parts[g].x, cursor.y - parts[g].y);
        if (gd < best) { best = gd; grabbed = g; }
      }

      for (var b = 0; b < PARTS; b++) {
        var o = parts[b];

        if (b === grabbed) {
          /* DIRECT. No spring, no damping, no cohesion — the part simply chases the cursor.
             This is the responsiveness the original concept had. */
          o.x += (cursor.x - o.x) * CONFIG.grabEase;
          o.y += (cursor.y - o.y) * CONFIG.grabEase;
          o.vx = 0; o.vy = 0;
        } else {
          var ringA = (b / PARTS) * Math.PI * 2 + time * 0.07;
          var homeX = Math.cos(ringA) * 0.55 * breath;
          var homeY = Math.sin(ringA) * 0.42 * breath;

          o.vx += (homeX - o.x) * CONFIG.cohesion * dt;
          o.vy += (homeY - o.y) * CONFIG.cohesion * dt;
          o.vx += Math.cos(time * 0.4 + o.seed) * CONFIG.wander * dt;
          o.vy += Math.sin(time * 0.33 + o.seed * 1.7) * CONFIG.wander * dt;

          o.vx *= 0.93; o.vy *= 0.93;
          o.x += o.vx * dt * 3.0; o.y += o.vy * dt * 3.0;
        }

        for (var j = 0; j < LOBES; j++) {
          var ph = o.seed + j * 2.399;
          // target: the part centre plus a slow orbit, so the body is never a rigid sphere
          var tlx = o.x + Math.cos(time * CONFIG.lobeSpeed + ph) * CONFIG.lobeSpread;
          var tly = o.y + Math.sin(time * CONFIG.lobeSpeed * 0.83 + ph * 1.7) * CONFIG.lobeSpread;
          // ...chased with per-lobe lag, which is what stretches the body when you move fast
          var lag = CONFIG.lobeLag[j] !== undefined ? CONFIG.lobeLag[j] : 0.25;
          var lb = o.lobes[j];
          lb.x += (tlx - lb.x) * lag;
          lb.y += (tly - lb.y) * lag;
          var lr = CONFIG.partRadius * (j === 0 ? 1.0 : 0.8) * (1 + 0.10 * Math.sin(time * 0.5 + ph));
          lobe[b * LOBES + j].set(lb.x, lb.y, lr);
        }
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    window.__MOLTEN = {
      cfg: CONFIG,
      uniforms: uniforms,
      redrawType: drawType,
      set: function (o) {
        Object.assign(CONFIG, o || {});
        var nums = { rimPower: "uRimPower", rimStrength: "uRimStrength", glowStrength: "uGlowStrength",
                     glowFalloff: "uGlowFalloff", tint: "uTint", interior: "uInterior",
                     innerPower: "uInnerPower", coreGlow: "uCoreGlow",
                     corePower: "uCorePower", coreTint: "uCoreTint",
                     specStrength: "uSpecStrength", specPower: "uSpecPower",
                     ior: "uIor", warpNoise: "uWarpNoise", warpNoiseScale: "uWarpNoiseScale",
                     warp: "uWarp", smoothK: "uK" };
        Object.keys(o || {}).forEach(function (key) {
          if (nums[key]) uniforms[nums[key]].value = CONFIG[key];
        });
        if ("ci" in o || "creative" in o || "media" in o) {
          palette = [CONFIG.ci, CONFIG.creative, CONFIG.media]; paintColors();
        }
        if ("background" in o) renderer.setClearColor(new THREE.Color(CONFIG.background), 1);
        if ("headA" in o || "headB" in o || "typeSize" in o || "typeColor" in o ||
            "background" in o || "headAY" in o || "headBY" in o || "keyY" in o || "typeFit" in o || "stackAspect" in o ||
            "mobileScale" in o || "mHeadAY" in o || "mHeadBY" in o ||
            "ci" in o || "creative" in o || "media" in o) drawType();
        return CONFIG;
      },
      state: function () {
        return { inView: inView, dpr: renderer.getPixelRatio(), grabbed: grabbed,
                 parts: parts.map(function (o) { return [+o.x.toFixed(2), +o.y.toFixed(2)]; }) };
      }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
