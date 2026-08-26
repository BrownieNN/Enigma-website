/* ============================================================================================
   BIORESIN v2 — Capabilities section.

   WHY THIS IS A REWRITE AND NOT A TUNE.
   v1 raymarched an SDF and shaded it by hand. That approach caps out well below the reference:
   no hardware AA on the silhouette, a fake gradient "environment", Phong-ish specular, plain
   gamma, and refraction of a flat colour. The result reads like real-time graphics because it is
   doing everything the cheap way. Every one of those is fixed here by moving to real geometry:

     SDF metaballs      -> MarchingCubes, which builds an actual smooth isosurface mesh
     hand-written shader-> MeshPhysicalMaterial with TRANSMISSION, i.e. Three's production
                           physically-based glass/resin: real IOR, real per-channel volumetric
                           attenuation, clearcoat, roughness-aware refraction of the real scene
     fake env gradient  -> PMREM-prefiltered RoomEnvironment (image-based lighting)
     pow(1/2.2)         -> ACES filmic tone mapping + correct sRGB output
     aliased edges      -> MSAA (antialias:true) on real geometry
     procedural bubbles -> actual instanced sphere geometry suspended INSIDE the volume, so the
                           transmission pass refracts and attenuates them for free

   That last one is the important trick. Because the resin is a transmissive mesh, anything behind
   it — including geometry inside it — is captured in the transmission render target and shows
   through, bent by the IOR and tinted by attenuation over distance. The bubbles are therefore
   really being viewed through resin rather than composited to look like it, which is what makes
   them sit at believable depths.

   INTERACTION (the Codrops "interactive bubble metaballs" behaviour the AD asked for):
   three resin balls drift in the field. The cursor is itself a metaball. Bring the cursor near a
   ball and it is drawn in, necks, merges and is ABSORBED — the cursor mass grows and the headline
   builds. Absorb all three and "Central Intelligence" is fully formed. Balls respawn so the
   interaction is repeatable.
   ============================================================================================ */

import * as THREE from "three";
import { MarchingCubes } from "./vendor/MarchingCubes.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

/* ---------------------------------------------------------------------------------------------
   ART DIRECTION. Live via __RESIN.set({...}).
   --------------------------------------------------------------------------------------------- */
const CONFIG = {
  // ---- resin material -------------------------------------------------------------------
  resinColor:        0xdff2ff,  // surface tint
  attenuationColor:  0x2e9be0,  // the colour light becomes as it travels THROUGH the resin
  attenuationDist:   2.60,      // metres of resin to reach that colour. LOWER = deeper blue.
  roughness:         0.045,     // glossy, not mirror
  ior:               1.44,
  thickness:         0.45,      // volume depth fed to the transmission integrator
  clearcoat:         1.0,
  clearcoatRough:    0.03,
  envIntensity:      1.35,
  specularIntensity: 1.0,

  // ---- metaball field -------------------------------------------------------------------
  resolution:        72,        // MarchingCubes grid. 64 fast / 80 lush. Cost is ~res^3.
  isolation:         80,        // surface threshold (MarchingCubes' own default scale)
  cursorStrength:    0.62,      // cursor blob mass
  ballStrength:      0.42,      // each drifting ball
  subtract:          12,        // MarchingCubes falloff sharpness — lower = gooier necks

  // ---- interaction ----------------------------------------------------------------------
  absorbRadius:      0.30,      // distance at which a ball is swallowed
  attractRadius:     0.62,      // distance at which it starts being pulled in
  attractForce:      3.2,
  pointerEase:       0.16,
  respawnDelay:      2.2,       // seconds before an absorbed ball returns

  // ---- bubbles --------------------------------------------------------------------------
  bubbleCount:       420,
  bubbleMin:         0.006,
  bubbleMax:         0.030,
  bubbleColor:       0x0a3f86,
  bubbleDrift:       0.02,
  /* MUST STAY INSIDE THE ISOSURFACE. The cursor mass renders at a world radius of roughly 0.58 at
     the default strength; spreading bubbles wider than that leaves them hanging in open cream
     where they read as a particle system stuck on top — which is the single most obvious way to
     give the whole effect away. Kept comfortably inside so every bubble is seen THROUGH resin. */
  bubbleSpread:      0.44,

  // ---- staging --------------------------------------------------------------------------
  background:        0xf9f6e6,  // site cream. MUST match .al-resin-host in styles.css.
  typeInk:           0x05070c,
  exposure:          1.05
};

const BALLS = 3;

function init() {
  const host = document.querySelector(".al-resin-host");
  if (!host) return;
  const canvas = host.querySelector(".al-resin-canvas");
  if (!canvas) return;

  /* ---------- renderer: the settings that separate "render" from "real-time demo" ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // filmic highlight roll-off
  renderer.toneMappingExposure = CONFIG.exposure;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.background);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  /* ---------- image-based lighting ----------
     RoomEnvironment is a little box of emissive panels; PMREM prefilters it into a mip chain the
     material can sample per roughness level. This is what gives the surface something real to
     reflect — the single biggest jump over v1's hand-written gradient. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  /* A large soft key, so there is a broad softbox streak across the top of the resin the way the
     reference has. IBL alone is flattering but a bit even. */
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-2.4, 3.2, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdbeaff, 0.6);
  fill.position.set(3.0, -1.0, 1.6);
  scene.add(fill);

  /* ---------- the headline, behind the resin ----------
     A plane in the scene rather than a shader sample. Because the resin is transmissive, Three
     renders this into the transmission target and the material refracts it for us — physically,
     with roughness-aware blur, which is far better than the manual UV offset v1 used. */
  const typeCanvas = document.createElement("canvas");
  typeCanvas.width = 2048; typeCanvas.height = 512;
  const tctx = typeCanvas.getContext("2d");
  const typeTex = new THREE.CanvasTexture(typeCanvas);
  typeTex.colorSpace = THREE.SRGBColorSpace;
  typeTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  let revealed = 0;              // 0..1, driven by how many balls have been absorbed
  function drawType() {
    const W = typeCanvas.width, H = typeCanvas.height;
    tctx.clearRect(0, 0, W, H);
    tctx.fillStyle = "#" + new THREE.Color(CONFIG.background).getHexString();
    tctx.fillRect(0, 0, W, H);
    tctx.textAlign = "center";
    tctx.textBaseline = "middle";
    let size = 300;
    tctx.font = size + 'px "Enigma Large", serif';
    const text = host.getAttribute("data-text") || "Central Intelligence";
    const w = tctx.measureText(text).width;
    if (w > 0) { size = size * (W * 0.92) / w; tctx.font = size + 'px "Enigma Large", serif'; }
    /* The headline BUILDS as balls are absorbed — this is the "absorbed by the mouse to make up
       Central Intelligence" beat. It starts as a faint ghost and resolves to full ink. */
    const ink = new THREE.Color(CONFIG.typeInk);
    const bg = new THREE.Color(CONFIG.background);
    const mixed = bg.clone().lerp(ink, 0.10 + 0.90 * revealed);
    tctx.fillStyle = "#" + mixed.getHexString();
    tctx.fillText(text, W / 2, H / 2);
    typeTex.needsUpdate = true;
  }
  drawType();
  if (document.fonts?.load) {
    document.fonts.load('300px "Enigma Large"').then(drawType).catch(() => {});
    document.fonts.ready.then(drawType).catch(() => {});
  }

  const typePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: typeTex, toneMapped: false })
  );
  typePlane.position.z = -1.15;
  scene.add(typePlane);

  /* ---------- the resin ----------
     transmission:1 + thickness + attenuation is Three's volumetric glass path. attenuationColor
     and attenuationDistance ARE Beer-Lambert: light travelling further through the body loses
     more of everything that is not that colour, which is exactly the effect v1 hand-rolled —
     except here it is integrated with refraction, roughness and IBL instead of bolted on. */
  const resinMat = new THREE.MeshPhysicalMaterial({
    color: CONFIG.resinColor,
    metalness: 0.0,
    roughness: CONFIG.roughness,
    transmission: 1.0,
    thickness: CONFIG.thickness,
    attenuationColor: new THREE.Color(CONFIG.attenuationColor),
    attenuationDistance: CONFIG.attenuationDist,
    ior: CONFIG.ior,
    clearcoat: CONFIG.clearcoat,
    clearcoatRoughness: CONFIG.clearcoatRough,
    envMapIntensity: CONFIG.envIntensity,
    specularIntensity: CONFIG.specularIntensity,
    transparent: true
  });

  const blob = new MarchingCubes(CONFIG.resolution, resinMat, true, true, 90000);
  blob.isolation = CONFIG.isolation;
  blob.scale.set(2.6, 2.6, 2.6);
  scene.add(blob);

  /* ---------- bubbles ----------
     Real geometry inside the volume. They are picked up by the transmission render target, so the
     resin refracts and colour-attenuates them by depth automatically — near ones read crisp, far
     ones go soft and blue. Sizes are heavily weighted small (r^3) so there are many micro-bubbles
     and only a few large inclusions, matching the reference distribution. */
  const bubbleGeo = new THREE.SphereGeometry(1, 8, 6);
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: CONFIG.bubbleColor, roughness: 0.25, metalness: 0.0
  });
  const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, CONFIG.bubbleCount);
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(bubbles);

  const bubbleData = [];
  for (let i = 0; i < CONFIG.bubbleCount; i++) {
    // rejection-sample inside a unit sphere so they fill the volume, not a cube
    let v;
    do { v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1); }
    while (v.lengthSq() > 1);
    const t = Math.random();
    bubbleData.push({
      home: v.multiplyScalar(0.95),
      r: CONFIG.bubbleMin + (CONFIG.bubbleMax - CONFIG.bubbleMin) * t * t * t,
      phase: Math.random() * Math.PI * 2
    });
  }

  /* ---------- state ---------- */
  const pointer = { x: 0, y: 0, active: false };
  const cursor = { x: 0, y: 0, mass: 0 };
  const balls = [];
  function spawnBall(i) {
    const a = (i / BALLS) * Math.PI * 2 + Math.random() * 0.6;
    const rad = 0.55 + Math.random() * 0.18;
    return {
      x: Math.cos(a) * rad, y: Math.sin(a) * rad * 0.7,
      vx: 0, vy: 0,
      seed: Math.random() * 100,
      alive: true, respawn: 0, strength: CONFIG.ballStrength
    };
  }
  for (let i = 0; i < BALLS; i++) balls.push(spawnBall(i));
  let absorbed = 0;

  function toWorld(cx, cy) {
    const r = host.getBoundingClientRect();
    return { x: (cx - r.left - r.width * 0.5) / r.height * 2.0,
             y: -(cy - r.top - r.height * 0.5) / r.height * 2.0 };
  }
  host.addEventListener("pointermove", (e) => {
    const w = toWorld(e.clientX, e.clientY);
    pointer.x = w.x; pointer.y = w.y; pointer.active = true;
  }, { passive: true });
  host.addEventListener("pointerleave", () => { pointer.active = false; }, { passive: true });

  /* ---------- sizing ---------- */
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    /* Fit the headline plane to the camera frustum at its depth, so the type spans a consistent
       fraction of the section at any aspect and never stretches. */
    const dist = camera.position.z - typePlane.position.z;
    const vh = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
    const vw = vh * camera.aspect;
    const tw = vw * 0.86;
    typePlane.scale.set(tw, tw * (typeCanvas.height / typeCanvas.width), 1);
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  resize();

  /* STARTS TRUE. The observer only ever parks the loop once it has told us we are off screen --
     defaulting to false means the section renders nothing until a callback arrives, and that
     callback is itself delivered by the rendering pipeline, so a tab that has not painted yet
     never gets one. That deadlock is exactly what left this blank. */
  let inView = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver((e) => { inView = e[0].isIntersecting; }, { threshold: 0.01 }).observe(host);
  }

  /* ---------- loop ---------- */
  const dummy = new THREE.Object3D();
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) * 0.001, 0.05);
    last = now;
    if (!inView) return;
    const time = now * 0.001;

    // cursor target: the pointer, or a slow idle orbit so it is alive before interaction
    const tx = pointer.active ? pointer.x : Math.cos(time * 0.31) * 0.42;
    const ty = pointer.active ? pointer.y : Math.sin(time * 0.24) * 0.28;
    cursor.x += (tx - cursor.x) * CONFIG.pointerEase;
    cursor.y += (ty - cursor.y) * CONFIG.pointerEase;
    cursor.mass += ((CONFIG.cursorStrength + absorbed * 0.16) - cursor.mass) * 0.08;

    /* ---- ball behaviour: drift, attract, absorb ---- */
    for (let i = 0; i < BALLS; i++) {
      const b = balls[i];
      if (!b.alive) {
        b.respawn -= dt;
        if (b.respawn <= 0) { Object.assign(b, spawnBall(i)); }
        continue;
      }
      // idle drift
      b.vx += Math.cos(time * 0.4 + b.seed) * 0.05 * dt;
      b.vy += Math.sin(time * 0.33 + b.seed * 1.7) * 0.05 * dt;
      // gentle pull to home ring so they never wander off frame
      b.vx += (-b.x) * 0.25 * dt;
      b.vy += (-b.y) * 0.25 * dt;

      const dx = cursor.x - b.x, dy = cursor.y - b.y;
      const d = Math.hypot(dx, dy) || 1e-5;
      if (d < CONFIG.attractRadius) {
        // accelerating pull — the closer it gets the harder it is grabbed, so it snaps in
        const pull = CONFIG.attractForce * (1 - d / CONFIG.attractRadius) ** 2;
        b.vx += (dx / d) * pull * dt;
        b.vy += (dy / d) * pull * dt;
      }
      b.vx *= 0.94; b.vy *= 0.94;
      b.x += b.vx * dt * 60 * 0.016;
      b.y += b.vy * dt * 60 * 0.016;

      if (d < CONFIG.absorbRadius) {
        b.alive = false;
        b.respawn = CONFIG.respawnDelay;
        absorbed = Math.min(BALLS, absorbed + 1);
        revealed = absorbed / BALLS;
        drawType();
      }
    }

    /* ---- rebuild the isosurface ----
       MarchingCubes works in a 0..1 cube, so world -> field is *0.5+0.5 against the blob scale. */
    blob.reset();
    const S = 0.5 / 1.3;   // blob.scale is 2.6 => half-extent 1.3
    blob.addBall(0.5 + cursor.x * S, 0.5 + cursor.y * S, 0.5, cursor.mass, CONFIG.subtract);
    for (const b of balls) {
      if (!b.alive) continue;
      blob.addBall(0.5 + b.x * S, 0.5 + b.y * S, 0.5, b.strength, CONFIG.subtract);
    }
    blob.update();

    /* ---- bubbles follow the resin ----
       Anchored to the cursor mass so they read as trapped in the body rather than sitting in
       world space while the resin slides past them. */
    for (let i = 0; i < CONFIG.bubbleCount; i++) {
      const d0 = bubbleData[i];
      const drift = Math.sin(time * 0.25 + d0.phase) * CONFIG.bubbleDrift;
      const sp = CONFIG.bubbleSpread;
      dummy.position.set(
        cursor.x + d0.home.x * sp,
        cursor.y + d0.home.y * sp + drift,
        d0.home.z * sp
      );
      dummy.scale.setScalar(d0.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  /* ---------- live art direction ---------- */
  window.__RESIN = {
    cfg: CONFIG,
    set(o = {}) {
      Object.assign(CONFIG, o);
      if ("resinColor" in o) resinMat.color.set(CONFIG.resinColor);
      if ("attenuationColor" in o) resinMat.attenuationColor.set(CONFIG.attenuationColor);
      if ("attenuationDist" in o) resinMat.attenuationDistance = CONFIG.attenuationDist;
      if ("roughness" in o) resinMat.roughness = CONFIG.roughness;
      if ("ior" in o) resinMat.ior = CONFIG.ior;
      if ("thickness" in o) resinMat.thickness = CONFIG.thickness;
      if ("clearcoat" in o) resinMat.clearcoat = CONFIG.clearcoat;
      if ("clearcoatRough" in o) resinMat.clearcoatRoughness = CONFIG.clearcoatRough;
      if ("envIntensity" in o) resinMat.envMapIntensity = CONFIG.envIntensity;
      if ("isolation" in o) blob.isolation = CONFIG.isolation;
      if ("exposure" in o) renderer.toneMappingExposure = CONFIG.exposure;
      if ("bubbleColor" in o) bubbleMat.color.set(CONFIG.bubbleColor);
      if ("background" in o) { scene.background = new THREE.Color(CONFIG.background); drawType(); }
      if ("typeInk" in o) drawType();
      resinMat.needsUpdate = true;
      return CONFIG;
    },
    state: () => ({ inView, absorbed, revealed, dpr: renderer.getPixelRatio(),
                    tris: renderer.info.render.triangles, calls: renderer.info.render.calls }),
    absorbAll() { balls.forEach(b => { if (b.alive) { b.alive = false; b.respawn = CONFIG.respawnDelay; absorbed++; } });
                  absorbed = Math.min(BALLS, absorbed); revealed = absorbed / BALLS; drawType(); }
  };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
