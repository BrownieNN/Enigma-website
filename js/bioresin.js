/* ============================================================================================
   BIORESIN — interactive translucent resin metaball for the Capabilities section.

   Motion/architecture reference: the Codrops "interactive droplets" metaball (SDF + smooth-min
   + elastic pointer trail). Material reference: the FCS BioResin frames — translucent blue
   volume, trapped air bubbles at many depths, glossy exterior, deep saturation where the resin
   is thick, near-transparent at the edges.

   HOW IT IS PUT TOGETHER, in one paragraph, because the rest of the file assumes it:
   a single fullscreen triangle-ish quad runs a RawShaderMaterial. The blob does not exist as
   geometry — it is a signed distance field evaluated in the fragment shader. We sphere-trace to
   the surface, shade it, then REFRACT AND KEEP MARCHING THROUGH THE INTERIOR. That second march
   is the important one: its path length drives Beer-Lambert absorption (which is what makes thin
   edges pale and thick centres deep blue), and the same loop samples the bubble field, so bubble
   depth cues fall out of the ray rather than being faked. On exit we sample the headline texture
   with the refracted direction, so the type behind the resin is genuinely lensed and tinted.

   COORDINATE SPACES (get these wrong and everything looks pasted on):
     - `p` in the march is WORLD space, aspect-corrected off resolution.y so the blob never
       stretches with the viewport.
     - the bubble field is evaluated in RESIN space (see resinSpace()), a frame that follows the
       blob's mass. Evaluated in world space the bubbles would sit still while the resin slid
       through them; evaluated in screen space they would swim with the camera. Neither reads as
       "trapped inside the material".

   Everything art-directable is in CONFIG at the top. window.__RESIN.set({...}) retunes live.
   ============================================================================================ */
(function () {
  "use strict";

  var TRAIL = 15;          // pointer chain length (brief §12)
  var TYPE_FIT = 0.62;     // fraction of the section width the headline spans

  /* ------------------------------------------------------------------------------------------
     ART DIRECTION. These are the knobs — every one is live via __RESIN.set({ key: value }).
     ------------------------------------------------------------------------------------------ */
  var CONFIG = {
    // ---- metaball -------------------------------------------------------------------------
    smoothness:     0.62,   // smooth-min blend radius. Higher = gooier necks, softer merges.
    mainRadius:     0.78,   // the anchor/hero mass. ~55% of section height — the reference gives
                            // the object room rather than letting it fill the frame.
    trailRadius:    0.30,   // radius of the newest trail sphere
    trailFalloff:   0.62,   // how fast older trail spheres shrink (0..1, lower = shrink faster)
    pointerEase:    0.16,   // how hard point 0 chases the pointer
    chainEase:      0.30,   // how hard each point chases the one before it
    deform:         0.055,  // low-frequency wobble so it is a blob, not a maths ball
    breathe:        0.028,  // idle swell

    // ---- resin ----------------------------------------------------------------------------
    resinColor:     [0.32, 0.78, 1.00],  // the light that SURVIVES thin resin — icy cyan
    resinDeep:      [0.02, 0.20, 0.62],  // colour accumulated through thick resin — saturated blue
    /* Tuned on screen against the reference frames, not guessed. 0.80 is the value where the
       headline still reads through the body while the thick middle goes properly deep — push it
       past ~1.5 and the resin turns opaque, drop it under ~0.5 and it reads as clear glass. */
    absorption:     0.80,   // Beer-Lambert strength. Higher = deeper blue, less see-through.
    cloudiness:     0.12,   // slight milkiness so it reads resin, not crystal glass
    ior:            1.42,   // refraction index at the surface
    refraction:     0.30,   // how hard the background type is lensed
    fresnel:        0.85,
    gloss:          0.90,   // specular tightness
    specular:       1.15,   // softbox highlight strength

    // ---- bubbles --------------------------------------------------------------------------
    /* Three layers, coarse -> fine. Density is the fraction of cells that actually contain a
       bubble, which is what buys clusters and negative space instead of polka dots. */
    /* SIZES ARE IN CELL FRACTIONS, so the world size of a bubble is (size / scale). The blob is
       ~1.56 units across, and the reference bubbles run roughly 1-3% of the body with a few rare
       inclusions at ~7%. That works out at radii of ~0.005 (micro) to ~0.10 (large) — the first
       pass had the large layer at 0.27, i.e. a quarter of the whole blob, which is why it looked
       like a moon rather than resin. */
    bubbleScale:    15.0,   // cells per world unit for the MEDIUM layer -> cell 0.067
    bubbleDensity:  0.20,
    bubbleSizeMin:  0.12,   // as a fraction of a cell
    bubbleSizeMax:  0.26,
    microScale:     32.0,   // micro layer -> cell 0.031, radii ~0.002-0.004
    microDensity:   0.38,
    largeScale:     6.5,    // rare inclusions -> cell 0.154
    largeDensity:   0.06,   // deliberately sparse: "very few larger inclusions"
    /* Contrast/rim are large numbers because they scale an integral: the loop accumulates
       coverage x step-length, so a single small bubble contributes only a few hundredths. */
    bubbleContrast: 8.0,    // how dark bubble centres go
    bubbleRim:      3.2,    // bright refractive edge on each bubble (higher reads as halos)
    bubbleDepthFade:0.85,   // how fast deep bubbles lose contrast and go blue
    bubbleDrift:    0.035,  // very slow buoyancy. Keep tiny — this is set resin, not a snow globe.

    // ---- interior -------------------------------------------------------------------------
    noiseScale:     2.3,
    noiseStrength:  0.30,   // cloudy density variation
    noiseSpeed:     0.06,

    // ---- staging --------------------------------------------------------------------------
    background:     [0.976, 0.965, 0.902],  // site cream #f9f6e6
    typeInk:        [0.02, 0.03, 0.05],     // headline black
    typeTint:       0.55,   // how much the resin tints the type showing through it
    exposure:       1.0
  };

  /* ============================================================================================
     SHADERS
     ============================================================================================ */

  var VERT = [
    "precision highp float;",
    "attribute vec3 position;",
    /* No projection/model matrices on purpose: RawShaderMaterial injects nothing, and a
       fullscreen quad does not need them. position is already in clip space. */
    "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision highp float;",

    "uniform vec2  uRes;",
    "uniform float uTime;",
    "uniform vec4  uTrail[" + TRAIL + "];",   // xyz = centre, w = radius
    "uniform vec3  uAnchor;",
    "uniform sampler2D uType;",               // the headline, pre-rendered to a texture
    "uniform vec2  uTypeScale;",              // aspect fit for that texture

    "uniform float uSmooth, uMainRadius, uDeform, uBreathe;",
    "uniform vec3  uResin, uResinDeep, uBg, uInk;",
    "uniform float uAbsorb, uCloud, uIor, uRefract, uFresnel, uGloss, uSpec;",
    "uniform float uBScale, uBDensity, uBMin, uBMax;",
    "uniform float uMicroScale, uMicroDensity, uLargeScale, uLargeDensity;",
    "uniform float uBContrast, uBRim, uBDepthFade, uBDrift;",
    "uniform float uNScale, uNStrength, uNSpeed, uTypeTint, uExposure;",

    /* ---------- hashing. Cheap, deterministic, no texture lookups. ---------- */
    "float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }",
    "vec3 hash33(vec3 p){",
    "  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));",
    "  return fract(sin(p)*43758.5453123);",
    "}",
    "float hash13(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123); }",

    /* ---------- value noise + fbm, for interior cloudiness and the blob's low-freq wobble ---------- */
    "float vnoise(vec3 p){",
    "  vec3 i = floor(p), f = fract(p);",
    "  f = f*f*(3.0-2.0*f);",
    "  float n = mix(mix(mix(hash13(i+vec3(0,0,0)), hash13(i+vec3(1,0,0)), f.x),",
    "                    mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),",
    "                mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x),",
    "                    mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z);",
    "  return n;",
    "}",
    "float fbm(vec3 p){ return 0.5*vnoise(p) + 0.25*vnoise(p*2.03) + 0.125*vnoise(p*4.01); }",

    /* ---------- SDF ---------- */
    /* Polynomial smooth-min (iq). Hard min() would give creases where spheres meet; this is what
       produces necks, bridges and the viscous separation the brief asks for. */
    "float smin(float a, float b, float k){",
    "  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);",
    "  return mix(b, a, h) - k*h*(1.0-h);",
    "}",

    "float map(vec3 p){",
    /* Anchor mass. The low-frequency deform keeps it an organic blob rather than a perfect ball,
       and the breathe term keeps it alive while the pointer is still (brief §23). */
    "  float breathe = 1.0 + uBreathe*sin(uTime*0.55) + uBreathe*0.6*sin(uTime*0.31 + 1.7);",
    "  float d = length(p - uAnchor) - uMainRadius*breathe;",
    "  d += uDeform * (fbm(p*0.9 + vec3(0.0, uTime*0.05, 0.0)) - 0.5) * 2.0;",
    "  for(int i=0;i<" + TRAIL + ";i++){",
    "    float ds = length(p - uTrail[i].xyz) - uTrail[i].w;",
    "    d = smin(d, ds, uSmooth);",
    "  }",
    "  return d;",
    "}",

    /* Tetrahedron normal — 4 taps instead of 6. Normal quality matters a lot here because the
       glossy exterior is most of the read (brief §22). */
    "vec3 calcNormal(vec3 p){",
    "  vec2 e = vec2(1.0,-1.0)*0.0015;",
    "  return normalize( e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx) );",
    "}",

    /* ---------- RESIN SPACE ----------
       The frame the bubbles live in. It follows the blob's mass so the field feels welded to the
       material: as the anchor drifts and breathes, the bubbles go with it. The gentle swirl means
       stretching the blob shears the field slightly, which is what sells "trapped in a moving
       viscous body" without advecting anything properly (brief §15 explicitly allows the
       approximation). Drift is deliberately tiny — set resin, not a lava lamp. */
    "vec3 resinSpace(vec3 p){",
    "  vec3 q = p - uAnchor;",
    "  float a = 0.10*sin(uTime*0.05) + 0.06*fbm(q*0.35 + uTime*0.02);",
    "  float c = cos(a), s = sin(a);",
    "  q.xz = mat2(c,-s,s,c) * q.xz;",
    "  q.y -= uTime * uBDrift;",
    "  return q;",
    "}",

    /* ---------- BUBBLE FIELD ----------
       One spatial-hash cell lookup per layer. NOT a per-bubble SDF march (brief §25): we hash the
       cell to a jittered centre and a per-cell radius, and only cells whose hash falls under
       `density` contain a bubble at all — that is what produces clusters and negative space
       instead of a uniform lattice. Radius stays under half a cell and the jitter is clamped, so
       a bubble never crosses a cell boundary and a single lookup is enough.

       Returns: x = opacity/darkness at this point, y = rim brightness. */
    "vec2 bubbleLayer(vec3 q, float scale, float density, float rmin, float rmax, float seed){",
    "  vec3 g = q*scale;",
    "  vec3 cell = floor(g);",
    "  vec3 f = g - cell;",
    "  vec3 h = hash33(cell + seed);",
    "  if(h.x > density) return vec2(0.0);",           // empty cell — most of the volume
    "  float r = mix(rmin, rmax, h.y*h.y);",           // squared => many small, few large
    /* THE JITTER MUST KEEP THE WHOLE BUBBLE INSIDE ITS OWN CELL. With one cell lookup, anything
       crossing a boundary gets sliced off flat on that side -- which rendered as rounded SQUARES,
       not spheres, and was the most obviously wrong thing on screen. Constraining the centre to
       [r, 1-r] costs nothing and guarantees a whole sphere every time. Neighbour lookups would
       also fix it, at 8x the hashing. */
    "  float pad = clamp(r*1.15, 0.0, 0.45);",
    "  vec3 jitter = pad + (1.0 - 2.0*pad) * hash33(cell*1.7 + seed + 5.2);",
    "  float d = length(f - jitter);",
    "  float core = 1.0 - smoothstep(r*0.35, r, d);",  // dark centre
    "  float rim  = smoothstep(r*0.72, r*0.96, d) * (1.0 - smoothstep(r*0.96, r*1.15, d));",
    "  return vec2(core, rim);",
    "}",

    /* ---------- ENVIRONMENT ----------
       A procedural studio rather than an HDR: there is no asset pipeline in this project, and a
       big soft overhead source is all the reference actually shows. One broad softbox up and to
       the left, a dimmer fill from the right, over a cool vertical gradient. */
    "vec3 envColor(vec3 d){",
    "  float up = d.y*0.5 + 0.5;",
    "  vec3 sky = mix(vec3(0.86,0.90,0.96), vec3(1.0,1.0,1.0), up);",
    "  vec3 L1 = normalize(vec3(-0.45, 0.85, 0.35));",
    "  float box = pow(max(dot(d,L1),0.0), 8.0);",
    "  vec3 L2 = normalize(vec3(0.7, 0.25, 0.5));",
    "  float fill = pow(max(dot(d,L2),0.0), 4.0)*0.25;",
    "  return sky + vec3(1.0)*box*1.6 + vec3(0.85,0.92,1.0)*fill;",
    "}",

    /* The headline behind the resin. Sampled in the same aspect-corrected space the ray uses, so
       refracting the ray genuinely displaces the type. */
    "vec3 sampleType(vec2 uv){",
    "  vec2 t = uv*uTypeScale + 0.5;",
    "  float a = texture2D(uType, t).a;",
    "  if(t.x<0.0||t.x>1.0||t.y<0.0||t.y>1.0) a = 0.0;",
    "  return mix(uBg, uInk, a);",
    "}",

    "void main(){",
    /* Aspect-correct off .y so the blob is round at every viewport shape (brief §26). */
    "  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;",

    "  vec3 ro = vec3(0.0, 0.0, 4.2);",
    "  vec3 rd = normalize(vec3(uv, -1.6));",

    "  vec3 bg = sampleType(uv);",
    "  vec3 col = bg;",

    /* ---- 1. sphere-trace to the surface ---- */
    "  float t = 0.0; float hit = 0.0;",
    "  for(int i=0;i<90;i++){",
    "    vec3 p = ro + rd*t;",
    "    float d = map(p);",
    "    if(d < 0.0012){ hit = 1.0; break; }",
    "    t += d*0.92;",
    "    if(t > 9.0) break;",
    "  }",

    "  if(hit > 0.5){",
    "    vec3 p = ro + rd*t;",
    "    vec3 n = calcNormal(p);",
    "    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);",
    "    fres = mix(0.04, 1.0, fres) * uFresnel;",

    /* ---- 2. march the interior along the refracted ray ----
       This single loop produces thickness (=> absorption), the bubbles, and their depth cues. */
    "    vec3 rdi = refract(rd, n, 1.0/uIor);",
    "    if(length(rdi) < 0.001) rdi = reflect(rd, n);",
    "    vec3 ip = p + rdi*0.02;",

    /* ADAPTIVE interior stepping. A fixed step is what broke the first pass: 26 x 0.055 caps the
       traversal at 1.43 units on a ~2-unit body, so the ray never reached the far side, thickness
       never accumulated, and every bubble sample landed in a shell just under the surface -- which
       is exactly why they read as craters rather than inclusions. Inside the field -d is the
       distance to the nearest surface, so it is a safe and much larger step, and the volume gets
       crossed in a handful of iterations instead of stalling near the entry point. */
    "    float thickness = 0.0;",
    "    float bubbleDark = 0.0;",
    "    float bubbleLight = 0.0;",
    "    float cloud = 0.0;",
    "    const int STEPS = 34;",
    "    for(int i=0;i<STEPS;i++){",
    "      float d = map(ip);",
    "      if(d > 0.0) break;",                        // left the resin
    "      float step = clamp(-d*0.85, 0.02, 0.16);",
    "      thickness += step;",
    "      vec3 q = resinSpace(ip);",

    /* Depth attenuation: the further this sample is from the entry surface, the softer and
       lower-contrast its bubbles read, and the more the resin has already tinted them. This is
       what creates the front-to-back layering in the reference (brief §4). */
    /* Depth is measured in DISTANCE TRAVELLED, not iteration count -- with adaptive steps the two
       are no longer proportional, and iteration count would fade bubbles by how fast the ray
       happened to move rather than by how much resin is in front of them. */
    "      float depth = clamp(thickness/1.6, 0.0, 1.0);",
    "      float depthFade = mix(1.0, 1.0 - uBDepthFade, depth);",

    "      vec2 b1 = bubbleLayer(q, uLargeScale,  uLargeDensity, uBMin*1.6, uBMax*1.9, 11.0);",
    "      vec2 b2 = bubbleLayer(q, uBScale,      uBDensity,     uBMin,     uBMax,     37.0);",
    "      vec2 b3 = bubbleLayer(q, uMicroScale,  uMicroDensity, uBMin*0.5, uBMax*0.5, 71.0);",

    "      float core = (b1.x*1.15 + b2.x + b3.x*0.65) * depthFade;",
    "      float rim  = (b1.y*1.10 + b2.y + b3.y*0.55) * depthFade;",
    "      bubbleDark  += core*step;",
    "      bubbleLight += rim*step;",

    "      cloud += (fbm(q*uNScale + vec3(0.0, uTime*uNSpeed, 0.0)) - 0.5)*step;",
    "      ip += rdi*step;",
    "    }",

    /* ---- 3. absorption: Beer-Lambert, PER CHANNEL ----
       The single most important block in the file. Extinction is deliberately steep in red and
       shallow in blue, so as path length grows the cream background loses red first, then green,
       and ends up saturated blue. That one fact produces the whole hero look: nearly transparent
       at the silhouette where thickness -> 0, icy cyan through the thin shoulders, deep blue in
       the thick middle. It is not a gradient painted on -- it falls out of the geometry. */
    "    float th = thickness * (1.0 + cloud*uNStrength);",
    "    vec3 extinction = vec3(2.30, 0.92, 0.34) * uAbsorb;",
    "    vec3 trans = exp(-extinction * th);",

    /* ---- 4. the lensed headline behind the resin ----
       Displacement scales with thickness, so the type bends hardest where the resin is deepest and
       passes almost straight through at the thin edges. */
    "    vec2 ruv = uv + rdi.xy * uRefract * (0.15 + th*0.55);",
    "    vec3 behind = sampleType(ruv);",

    /* Transmitted light, then the resin's own in-scattered colour filling in what was absorbed.
       NOTE: `behind` is multiplied by transmittance and NOT separately tinted. The first pass
       tinted it by uResin as well, which multiplied warm cream by cyan and turned the headline
       olive -- the type must be coloured by absorption alone. */
    /* IN-SCATTERING IS DELIBERATELY WEAK. The first pass gave this term full weight, so as
       thickness grew it added a bright cyan that washed the whole body to a flat pale blue --
       the resin was effectively glowing. Real resin does not add light, it removes it, so the
       thick middle has to end up DARKER than the thin edges. The transmitted background now
       dominates and this is only a faint cloudy pickup. */
    "    vec3 inscatter = mix(uResin, uResinDeep, clamp(th*0.55, 0.0, 1.0));",
    "    vec3 body = behind*trans + inscatter*(1.0 - trans)*0.14;",
    /* Slight milkiness so it reads thick resin rather than clear glass -- restrained, and it
       grows with thickness so the edges stay crisp. */
    "    body = mix(body, mix(body, uResin*1.05, 0.5), clamp(uCloud*th*0.7, 0.0, 0.55));",

    /* ---- 5. bubbles composited into the volume ----
       Air pockets, so they are DARKER than the resin around them (we lose the transmitted
       background through them) with a bright refractive rim, which is what the reference frames
       actually show. The dark colour is the local deep tone rather than black, so bubbles sit
       inside the material's palette instead of punching holes in it. */
    "    float bd = clamp(bubbleDark*uBContrast, 0.0, 1.0);",
    "    float bl = clamp(bubbleLight*uBRim, 0.0, 1.0);",
    "    vec3 bubbleInk = mix(uResinDeep*0.55, uResinDeep, clamp(th*0.4,0.0,1.0));",
    "    body = mix(body, bubbleInk, bd);",
    "    body += vec3(0.80,0.92,1.0) * bl * 0.40 * (1.0 - bd);",

    /* ---- 6. surface ---- */
    "    vec3 refl = reflect(rd, n);",
    "    vec3 env = envColor(refl);",
    "    vec3 L = normalize(vec3(-0.45, 0.85, 0.35));",
    "    vec3 hv = normalize(L - rd);",
    "    float spec = pow(max(dot(n,hv),0.0), mix(24.0, 320.0, uGloss)) * uSpec;",

    /* Fresnel mixes reflection in at grazing angles only. Kept modest: too much and the thing
       turns into a chrome ball, which is the failure mode the brief calls out first. */
    "    col = mix(body, env, clamp(fres,0.0,1.0)*0.42);",
    "    col += vec3(1.0)*spec;",
    /* Broad soft sheen across the upper surface: a big softbox, not a point. */
    "    col += vec3(0.90,0.95,1.0) * pow(max(n.y*0.6 + 0.4, 0.0), 4.0) * 0.16;",

    /* THE EDGE. Where the ray only clipped the blob, thickness is tiny, so almost all of the
       cream background survives -- this is what stops the silhouette reading as a hard-edged
       sticker and is a big part of why the reference looks like a physical object sitting in a
       room rather than a circle drawn on a page. */
    "    float edge = smoothstep(0.0, 0.16, th);",
    "    col = mix(bg, col, edge);",
    "  }",

    "  col *= uExposure;",
    "  col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));",   // linear -> sRGB
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  /* ============================================================================================
     HEADLINE TEXTURE
     The type has to be a texture, not a DOM element behind a transparent canvas, because the
     shader refracts it. Drawn white-on-transparent and used via its alpha, so the ink colour
     stays a uniform and the AD can change it without redrawing.
     ============================================================================================ */
  function buildTypeTexture(THREE, text, host) {
    var cv = document.createElement("canvas");
    var W = 2048, H = 512;
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Fit the string to the canvas width, then let the shader scale it into the section.
      var size = 300;
      ctx.font = size + 'px "Enigma Large", serif';
      var w = ctx.measureText(text).width;
      if (w > 0) { size = size * (W * 0.94) / w; ctx.font = size + 'px "Enigma Large", serif'; }
      ctx.fillText(text, W / 2, H / 2);
      tex.needsUpdate = true;
    }

    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.NoColorSpace;

    draw();
    /* The .otf loads asynchronously; without this the first paint is Times New Roman and the
       texture never updates because nothing else invalidates it. */
    if (document.fonts && document.fonts.load) {
      document.fonts.load('300px "Enigma Large"').then(draw).catch(function () {});
      document.fonts.ready.then(draw).catch(function () {});
    }
    return { texture: tex, redraw: draw, aspect: W / H };
  }

  /* ============================================================================================
     MODULE
     ============================================================================================ */
  function init() {
    if (!window.THREE) return;
    var host = document.querySelector(".al-resin-host");
    if (!host) return;
    var canvas = host.querySelector(".al-resin-canvas");
    if (!canvas) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    /* DPR capped per brief §25. This is a raymarcher with an interior loop — it is fill-rate
       bound, so pixel count is the single biggest cost lever available. */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    var scene = new THREE.Scene();
    var camera = new THREE.Camera();          // unused by the shader; clip-space quad
    var typeTex = buildTypeTexture(THREE, host.getAttribute("data-text") || "Central Intelligence", host);

    var trail = [];
    for (var i = 0; i < TRAIL; i++) trail.push(new THREE.Vector4(0, 0, 0, 0));

    var U = {
      uRes:        { value: new THREE.Vector2(1, 1) },
      uTime:       { value: 0 },
      uTrail:      { value: trail },
      uAnchor:     { value: new THREE.Vector3(0, 0, 0) },
      uType:       { value: typeTex.texture },
      uTypeScale:  { value: new THREE.Vector2(1, 1) },

      uSmooth:     { value: CONFIG.smoothness },
      uMainRadius: { value: CONFIG.mainRadius },
      uDeform:     { value: CONFIG.deform },
      uBreathe:    { value: CONFIG.breathe },

      uResin:      { value: new THREE.Vector3().fromArray(CONFIG.resinColor) },
      uResinDeep:  { value: new THREE.Vector3().fromArray(CONFIG.resinDeep) },
      uBg:         { value: new THREE.Vector3().fromArray(CONFIG.background) },
      uInk:        { value: new THREE.Vector3().fromArray(CONFIG.typeInk) },

      uAbsorb:     { value: CONFIG.absorption },
      uCloud:      { value: CONFIG.cloudiness },
      uIor:        { value: CONFIG.ior },
      uRefract:    { value: CONFIG.refraction },
      uFresnel:    { value: CONFIG.fresnel },
      uGloss:      { value: CONFIG.gloss },
      uSpec:       { value: CONFIG.specular },

      uBScale:       { value: CONFIG.bubbleScale },
      uBDensity:     { value: CONFIG.bubbleDensity },
      uBMin:         { value: CONFIG.bubbleSizeMin },
      uBMax:         { value: CONFIG.bubbleSizeMax },
      uMicroScale:   { value: CONFIG.microScale },
      uMicroDensity: { value: CONFIG.microDensity },
      uLargeScale:   { value: CONFIG.largeScale },
      uLargeDensity: { value: CONFIG.largeDensity },
      uBContrast:    { value: CONFIG.bubbleContrast },
      uBRim:         { value: CONFIG.bubbleRim },
      uBDepthFade:   { value: CONFIG.bubbleDepthFade },
      uBDrift:       { value: CONFIG.bubbleDrift },

      uNScale:     { value: CONFIG.noiseScale },
      uNStrength:  { value: CONFIG.noiseStrength },
      uNSpeed:     { value: CONFIG.noiseSpeed },
      uTypeTint:   { value: CONFIG.typeTint },
      uExposure:   { value: CONFIG.exposure }
    };

    var mat = new THREE.RawShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: U, depthTest: false, depthWrite: false
    });
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    /* ---- pointer, in the shader's aspect-corrected world space ---- */
    var pointer = { x: 0.0, y: 0.0, has: false };
    var pts = [];
    /* INITIAL STATE (brief §27): seed the chain along a gentle arc off the anchor rather than at
       the origin. Spawning everything at (0,0) makes the first frames a visible convergence. */
    for (var j = 0; j < TRAIL; j++) {
      var a = -0.5 + j * 0.06;
      pts.push({ x: Math.cos(a) * (0.25 + j * 0.035), y: Math.sin(a) * (0.18 + j * 0.02) });
    }

    function toWorld(clientX, clientY) {
      var r = host.getBoundingClientRect();
      // Same mapping as the shader's uv: origin centred, normalised by height.
      return { x: (clientX - r.left - r.width * 0.5) / r.height,
               y: -(clientY - r.top - r.height * 0.5) / r.height };
    }

    host.addEventListener("pointermove", function (e) {
      var w = toWorld(e.clientX, e.clientY);
      pointer.x = w.x; pointer.y = w.y; pointer.has = true;
    }, { passive: true });

    host.addEventListener("pointerleave", function () { pointer.has = false; }, { passive: true });

    /* ---- resize. Aspect comes from the HOST, never the window (brief §26). ---- */
    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      U.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      /* Fit the headline across the section without distorting it. The shader works in units of
         viewport-HEIGHT, so the visible world width is the aspect ratio; the type spans `fit` of
         it and its height follows from the texture's own aspect. */
      var aspect = w / h;
      var typeW = TYPE_FIT * aspect;
      var typeH = typeW / typeTex.aspect;
      U.uTypeScale.value.set(1.0 / typeW, 1.0 / typeH);
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    resize();

    /* ---- only run while on screen. The homepage is long and already carries a lot. ---- */
    var inView = false;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; }, { threshold: 0.01 }).observe(host);
    } else { inView = true; }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var t0 = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);
      if (!inView) return;

      var time = (now - t0) * 0.001;
      U.uTime.value = time;

      /* IDLE: with no pointer the target orbits slowly, so the resin keeps working before anyone
         touches it. With a pointer it chases that instead. */
      var tx, ty;
      if (pointer.has && !reduce) { tx = pointer.x; ty = pointer.y; }
      else {
        tx = Math.cos(time * 0.32) * 0.42 + Math.cos(time * 0.11) * 0.10;
        ty = Math.sin(time * 0.27) * 0.26 + Math.sin(time * 0.13) * 0.08;
      }

      /* ELASTIC CHAIN (brief §12): point 0 eases to the pointer, each later point eases to the
         one before it. Progressively more lag = the stretch, and the recovery when you stop. */
      pts[0].x += (tx - pts[0].x) * CONFIG.pointerEase;
      pts[0].y += (ty - pts[0].y) * CONFIG.pointerEase;
      for (var i = 1; i < TRAIL; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * CONFIG.chainEase;
        pts[i].y += (pts[i - 1].y - pts[i].y) * CONFIG.chainEase;
      }
      for (var k = 0; k < TRAIL; k++) {
        var fall = Math.pow(CONFIG.trailFalloff, k * 0.55);
        trail[k].set(pts[k].x, pts[k].y, 0.0, CONFIG.trailRadius * fall);
      }

      /* The anchor drifts a little so the composition never sits perfectly still. */
      U.uAnchor.value.set(Math.cos(time * 0.13) * 0.06, Math.sin(time * 0.17) * 0.05 - 0.02, 0.0);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    /* ---- live art direction ---- */
    window.__RESIN = {
      cfg: CONFIG,
      uniforms: U,
      redrawType: typeTex.redraw,
      set: function (o) {
        Object.keys(o || {}).forEach(function (key) {
          CONFIG[key] = o[key];
          var map = {
            smoothness: "uSmooth", mainRadius: "uMainRadius", deform: "uDeform", breathe: "uBreathe",
            absorption: "uAbsorb", cloudiness: "uCloud", ior: "uIor", refraction: "uRefract",
            fresnel: "uFresnel", gloss: "uGloss", specular: "uSpec",
            bubbleScale: "uBScale", bubbleDensity: "uBDensity", bubbleSizeMin: "uBMin",
            bubbleSizeMax: "uBMax", microScale: "uMicroScale", microDensity: "uMicroDensity",
            largeScale: "uLargeScale", largeDensity: "uLargeDensity", bubbleContrast: "uBContrast",
            bubbleRim: "uBRim", bubbleDepthFade: "uBDepthFade", bubbleDrift: "uBDrift",
            noiseScale: "uNScale", noiseStrength: "uNStrength", noiseSpeed: "uNSpeed",
            typeTint: "uTypeTint", exposure: "uExposure"
          };
          var vecs = { resinColor: "uResin", resinDeep: "uResinDeep", background: "uBg", typeInk: "uInk" };
          if (map[key] && U[map[key]]) U[map[key]].value = o[key];
          if (vecs[key] && U[vecs[key]]) U[vecs[key]].value.fromArray(o[key]);
        });
        return CONFIG;
      },
      state: function () {
        return { inView: inView, dpr: renderer.getPixelRatio(),
                 size: [host.clientWidth, host.clientHeight] };
      }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
