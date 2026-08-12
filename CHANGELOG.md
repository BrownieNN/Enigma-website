# Changelog

Developer-facing record of what changed between releases. The previous release is the state at
commit `6990ea2` (*"Add SPACING.md"*, 2026-07-21) — from a developer's point of view the last
meaningful build commit is `f0dab1d`, *"Full Enigma Aldo homepage"*.

---

## [Unreleased] — Enigma buildout · 2026-08-12

Branch `enigma-buildout`. **Not deployed.** The live `enigma-website-prototype.netlify.app` still
serves the previous release; Netlify builds only `main`, and this branch is deliberately excluded
from it until the AD signs off on structure.

### TL;DR of the difference

The previous release was **one page**: the Enigma homepage, plus the grid-comparison views the
repo started life as. This release is **a three-page site with a shared transition system**:

| | Previous release | This release |
| --- | --- | --- |
| Pages | Homepage only | Homepage · All Work · Kennards Hire case study |
| Page transitions | None (no second page to go to) | Shared veil, six routes |
| JS modules | 8 | 25 |
| `index.html` | 67.5 KB | 268.0 KB |
| `styles.css` | 48.7 KB | 155.4 KB |
| Debug handles | none | 13 `window.__*` handles with `state()` / `tune()` |

Everything is still **static, no-build, no framework** — `index.html` + `styles.css` + `assets/`,
all JS inline at the foot of the document, GSAP + ScrollTrigger + Three.js vendored under `js/`.
There is no package.json and nothing to compile. Serve the folder.

---

### Added — pages

**All Work page** (`#page-work`, node 62:796)
A fixed overlay (`z-index: 400`) with its own scroll container, holding a 12-tile project grid.
Mounted alongside the homepage rather than replacing it, so returning is instant and keeps its
scroll position. Owned by `workPageNav()` / `window.__WORKPAGE`.

**Kennards Hire case study** (`#page-case`, nodes 2629:3523 / 2629:3984 / 2629:3004)
Three Figma frames, two desktop variants and one mobile, rendered as **one layout**. Unlike the
All Work page it renders **in flow**, as a sibling of `.main` inside the same `.grid-wrap` —
it is *not* an overlay. `body.case-open` swaps which of the two is displayed; `body.case-solo`
additionally drops the sidebar rail.

Rendering in flow is what buys natural document scroll (no body lock, no second scroll
container), a sticky sidebar that behaves exactly as it does on the homepage, and a mobile parade
header that scrolls away with the content.

> **The two desktop variants are one layout at two widths.** Both frames draw the same body
> column; the wide one is that design scaled up (926.5→1237, 802→1071, 925→1235 are all ×1.335 =
> 1904/1426). There is **one reference width, 1426**, and it is *not* renormalised per variant.
> Renormalising to 1904 cancels the scale-up and renders the solo variant a quarter too small.
> Text panel heights (513/613/965) are the exception and are **fixed px**, not `--u` — they are
> set by 14/24px body type, which doesn't scale.

**Access:** every work tile opens the study — 9 on the homepage grid, 12 on All Work. All point at
the same hard-coded Kennards study until there is real per-project data (see *Known limitations*).

---

### Changed — the sidebar is fluid, not stepped

AD 2026-08-12: the sidebar must **shrink with the screen** rather than snap between two sizes.

Previously it was `470px` above 1512 and hard-switched to `310px` at 1512 and below, with `--u`
re-based from 1426 to 1586 in that state. Crossing 1513 → 1512 the sidebar jumped 470 → 310 **and**
the h1 jumped 117px → 98px, because the width and the type scale changed in the same step.

Now:

```css
@media (min-width: 1280px) {
  #view-aldo .sidebar.w-470,
  #view-aldo .fg-side.w-470 { width: clamp(310px, calc(25% - 6px), 470px); }
}
```

**Where `25% - 6px` comes from.** The page is a 12-column grid, 8px gutters, 8px page padding, and
the sidebar is the first three columns:

```
column  = (CW - 11*8) / 12          CW = .grid-wrap content box = layout width - 16
sidebar = 3*column + 2*8  =  0.25*CW - 6
```

A percentage on a flex item resolves against the flex container's content box, so `calc(25% - 6px)`
*is* that expression. **Per cent, not `vw`** — `100vw` includes the scrollbar and this page always
has one, so a vw version sits ~4px off the real grid and the sidebar edge stops landing on a grid
line, which is the one thing the grid overlay exists to prove.

**Both old endpoints survive**, so no other value needed retuning:

| Layout width | Sidebar | Note |
| --- | --- | --- |
| 1920 | 470.00 | unchanged |
| 1600 | 390.00 | was 470 (snapped) |
| 1513 | 368.25 | was 470 |
| 1512 | 368.00 | **was 310** — the old cliff |
| 1280 | 310.00 | the old 2-col width, now arrived at smoothly |

3 columns at 1280 measure the same as 2 columns at 1920 (1280/1920 = 2/3), so the fluid sidebar
passes through the AD's old small-screen number exactly at the bottom of the desktop range.

**`--u` is no longer re-based, and that is half the fix.** It is a `cqw` coefficient, so it already
tracks the main column continuously; the old 1586 re-basing is what made the type jump alongside
the width. Removing it makes the type scale smoothly (h1 164 → 129 → 109 across 1920 → 1513 → 1280).

**Side effect worth having:** sidebar columns and main columns are now *the same column* at every
width in the range (measured identical at 1600 and 1350) — a true uniform 12-column grid. Before,
they only agreed at exactly 1920.

Two things deliberately unchanged:

- **Capped at 470 above 1920**, so large screens are untouched and the "fixed sidebar, fluid main"
  construction the grid-overlay note describes still holds up there. Dropping the cap would extend
  the uniform grid above 1920 — an easy change, but not one the AD asked for.
- **The `min-width: 1280px` floor is load-bearing**, for the reason the rule it replaced already
  documented: it is specificity (1,2,0) and beats the stacked `#view-aldo .al-sidebar { width:100% }`
  (1,1,0) further down the sheet. Without the floor it pins the stacked full-width header back to a
  narrow column across the whole tablet and phone range.

### Added — page transition veil (`pageVeil()` / `window.__VEIL`)

The headline change for anyone working on navigation. **Every route between two pages now goes
through one shared veil**, and the pages themselves no longer fade at all.

```
veil closes  →  swap happens underneath, fully covered  →  veil opens
   0.42s            0.12s hold (+ hero wait, capped 2s)      0.5s
```

AD brief it implements, verbatim: *"when we go from homepage to all work there should be a mid
point of the animation timeline where we see complete cream or solid colour before the second half
of the animation begins… fade out > solid colour for split second > content fades in. The reason is
so we don't get a messy overlap of content between pages."*

**Covers all six routes:** home↔All Work, home↔case study, All Work↔case study.

Implementation notes a developer needs:

- `<div class="al-veil" id="page-veil">` is a **direct child of `<body>`**, and that placement is
  load-bearing. `.grid-wrap` carries `will-change: opacity` and is therefore a stacking context, so
  a veil placed inside it can never rise above the All Work overlay, which is a sibling of that
  wrapper. `#view-aldo` is a plain `display:block` section and creates no context.
- **`z-index: 600`**, picked after surveying every value in the stylesheet: dev FABs 210,
  `.al-cs-topbar` 205, `.sim-stage` 300, `.m-nav` 320, All Work 400.
- **`pointer-events: none` even while opaque.** Both nav modules serialise on their own `busy`
  flags, so the veil has no reason to swallow clicks — and if one ever wedged, the site stays
  usable underneath instead of dead. `__VEIL.clear()` is the console escape hatch.
- **Timings live in exactly one place.** `__VEIL.tune({ in, hold, out })` retunes every route live
  with no reload. `__WORKPAGE.tune()` and `__CASESTUDY.tune()` now forward to it.
- **The `prefers-reduced-motion` path still veils**, at zero duration. It is the thing that
  prevents content overlap, so it is not motion-gated — it just happens instantly.
- Driven by `setTimeout`, **not `transitionend`**, with an idempotent net on every stage and the
  resting state asserted in `finish()` rather than trusted. `transitionend` never arrives in a
  backgrounded tab, which is precisely the case the net exists for.

#### Removed by the veil

It replaced more code than it added. All of the following are **gone**, and re-introducing any of
them means the veil has been misunderstood:

| Removed | What it was for |
| --- | --- |
| Crossfade overlap in `workPageNav` (`out`/`in`/`overlap` + 2-tween timeline) | Managing the stretch where both pages were visible |
| Both stalled-ticker safety nets in `workPageNav` | Rescuing a fade that rAF never drove |
| `body.case-leaving` + `#view-aldo > .grid-wrap { z-index: 500 }` | Lifting the study over All Work so its fade was visible |
| Reveal-vs-replay branch in `caseStudyNav.close()` | Two different exits for two destinations |
| Homepage-flash ordering guard | Stopping `.main` re-displaying mid-transition |
| `caseStudyNav`'s `fade()` helper and `CFG {out, in, outWork}` | Three per-route durations |

`whenHeroReady` now runs **inside** the covered moment, passed to the veil as `wait`. A cold hero
extends the beat of solid colour rather than exposing a gap. The old "never put a wait between two
fades" trap is now structurally unrepresentable rather than merely avoided.

---

### Added — JS modules

17 new modules. All are IIFEs inside the single inline `<script>`, each exposing a `window.__*`
handle with `state()` / `tune()` for live console tuning.

| Module | Handle | Does |
| --- | --- | --- |
| `pageVeil` | `__VEIL` | Every page transition (above) |
| `workPageNav` | `__WORKPAGE` | All Work open/close, plus `adopt()` / `release()` |
| `caseStudyNav` | `__CASESTUDY` | Case study open/close, all six routes |
| `caseStudyGoo` | `__CASEGOO` | Rail pill → close button metaball merge |
| `caseStudyStats` | `__CASESTATS` | Percentage boxes grow while numbers tick |
| `caseBackContrast` | `__CASEBACK` | Keeps the solo back button legible over changing media |
| `planetCapabilities` | `__PLANET` | Capabilities constellation (Three.js) |
| `careersReveal` | `__CAREERS` | Careers slat reveal |
| `careersAccordion` | — | Careers list expand/collapse |
| `fearlessPlay` | `__FP` | Fearless section playback |
| `typeLetsTalk` | `__LETS` | "Let's talk" type animation |
| `heroGallery` | — | Homepage hero image rotation |
| `ctaInvertHover` | — | Pill invert on hover/focus, with `ctareset` event |
| `sidebarClock` | — | Live Sydney-time rail clock |
| `bustCss` | `__BUSTCSS` | Cache-busts `styles.css` on load |
| `kineticLetters` | `__ROPE` | (extended) rope physics letters |
| `sidebarNav` | `__SIDEBARNAV` | (extended) `resume(forceIdx)` + `case-open` guards |

**`ctareset` is a custom event, not a class.** Any pill that can be hidden or replaced while
hovered must be sent `el.dispatchEvent(new Event("ctareset"))`, because no `pointerleave` will
ever arrive to undo the invert. Dispatch it on the **click**, not inside the handler it triggers —
handlers bail early on `busy` guards and skip the reset.

---

### Added — assets

~90 MB across `assets/`, all newly tracked:

| Path | Contents |
| --- | --- |
| `assets/aldo/` | Homepage media — hero stills, parade lockups, 5 mp4 background videos (largest 12 MB) |
| `assets/case-study/` | 7 files, 3.3 MB. Figma hero exports + AD-supplied Ken Oath lockups |
| `assets/Gallery/` | Work-tile thumbnails (`.avif`) |
| `assets/fearless/`, `assets/talent/`, `assets/work/`, `assets/footer/` | Section media |
| `js/three.min.js` | Vendored for the Capabilities constellation |

> **Format choices are deliberate.** `ken-oath-sticker/paper/phone` are **PNG on purpose** — they
> are hard-edged type lockups and JPEG rings on them. They are exported at exactly the container
> inner sizes (1248×725, 530×725) so `object-fit: contain` is 1:1 with no crop. `ken-oath-book` is
> the one photograph, so it is JPEG and uses `cover`. `hero-2.jpg` is reused for hero 3 — they are
> byte-identical in the design.

---

### Changed — CSS architecture

- **`--u` is the unit system.** Every measurement that should scale with the column is
  `calc(N * var(--u))`, where `--u` is one Figma px expressed in container units
  (`#view-aldo .main { --u: 0.070126cqw }` = 100/1426). 33 container-query units in the sheet.
  A raw px value on anything that should scale is a bug.
- **New component CSS goes above the banner**, not at the end of the file. `styles.css` carries a
  literal `## NEW COMPONENT CSS GOES ABOVE THIS LINE ##` marker; everything below it is responsive
  overrides running to EOF. Equal-specificity CSS is won by whatever comes last, so a desktop rule
  appended after those blocks silently beats the override meant to reshape it — invisible at
  desktop, which is where it gets written. **Obey the banner.**
- **Breakpoints:** 599 / 1023 / 1279 / 1512 px, plus a 1280–1512 band. The sidebar rail is hidden
  below 1280 and absent entirely in the case study's solo variant.

### Changed — misc

- `.gitignore` now also excludes `review-comments.json` (review-layer local store) and
  `SAVE_STATE_CASESTUDY.md` (internal working notes, same policy as `SAVE_STATE.md` — these would
  otherwise be reachable at `/SAVE_STATE.md` on the deployed site and contain candid commentary).

---

### Behaviour worth not breaking

Regression-test these after any change to navigation, the rail, or transitions.

- **There is exactly ONE menu on the site.** A case study does not get a copy — it changes the
  rail's state: the red Work item swaps its label for the project details and expands. An earlier
  build duplicated the whole `<aside>` and it drifted immediately (32px items instead of 41.8,
  overflowing rail). **The rail is the source of truth. Do not re-introduce a second one.**
- **The word "WORK" is one element across both rail states.** The pill reads "WORK / KENNARDS
  HIRE", so the word is on screen before the study opens; opening only appends the suffix and draws
  the pill around it. It is excluded from every fade target — only its pill arrives. Verify it sits
  pinned at `x = 24` through the entire scroll range.
- **The rail must be pixel-identical open vs closed:** parade 375, nav top 391, nav height 517,
  items `[41.8 ×5 + one expanded]`, no sidebar overflow. Only *which* tile is expanded differs.
- **Never let one rail item's growth be paid for by the others.** `.al-menu-item` has
  `flex-shrink: 0`; only the expanded tile flexes. A `min-height` on the open tile once pushed the
  nav 83px past the sidebar and *shrank* the other five from 41.8 to 32px.
- **Closing to the homepage leaves the Work tile expanded** — content drains, tile holds its
  height. `resume(2)` pins it so the scroll-spy doesn't collapse it a frame later.
- **The × must be visible and clickable at every scroll position and every animation state.**
- **Resting state must be the finished state.** Every reveal is built so that if the animation
  never runs, the content is simply already there. Avoid `gsap.fromTo(..., autoAlpha)` for content:
  it writes `visibility: hidden` up front and needs the tween to undo it — with the ticker stalled
  the red tile rendered as an empty rectangle with no close button, i.e. no way out of the page.
  Reveals are CSS transitions where an `.is-arming` class is the only thing that hides, added and
  removed in one synchronous block.

---

### Known limitations

1. **All work tiles open the same case study.** Hard-coded Kennards; needs per-project data.
2. **Duplicate panel label.** The Figma labels two different panels "THE CHALLEMGE" (sic). The typo
   is fixed; the duplicate is left as drawn. The second sits above copy about making "Ken" ownable
   and probably wants to be "THE IDEA" — unresolved, AD's call.
3. **Credits links are `href="#"`.**
4. **The veil has not been reviewed by the AD.** Built and measured to the brief, but 0.42 / 0.12 /
   0.5 is a judgement call and is the likely subject of the next round.
5. **No per-project routing/URLs.** Tiles are `role="link"` `<div>`s with key handling, not anchors,
   because there is no per-project URL yet.
6. **Rail: the first tile can keep the free space while a case study is open.** If a study is opened
   while the scroll-spy's active section is HELLO (the *first* rail item), that tile keeps `.is-open`
   and absorbs the sidebar's spare vertical height instead of the red Work tile — measured 98px at a
   470 sidebar, 199px at 310, growing as the sidebar narrows and the parade lockup frees up height.
   `pinWorkItem()` writes inline `flex-grow: 0` on it and the inline value is ignored: the element
   carries a `CSSTransition` on `flex-grow` stuck at `currentTime: 0`, so computed style stays at the
   `1` from the `.al-nav > .al-menu-item:first-child { flex-grow: 1 }` no-JS fallback. Even
   `setProperty('flex-grow','0','important')` inline does not win.
   **Pre-existing — verified against the previous release, which shows the identical 74.5px tile and
   the same inline-0/computed-1 split.** Low real-world reach: the homepage work tiles sit inside the
   Work section, so a reader who clicks one has already scrolled there and the spy has Work active
   (which is the correct tile). It reproduces reliably via `__CASESTUDY.open('home')` from the top of
   the page. Not fixed here because it is unrelated to the sidebar work and changes rail choreography
   the AD reviews visually.

---

### Verifying a change

```bash
python3 -m http.server 8899
# http://localhost:8899/index.html?review=0
```

`?review=0` disables the AD review layer — without it you get comment pins that look like bugs.
The review layer is not product code: delete the two tagged lines in `index.html` plus
`review.js` / `review.css` to strip it entirely.

```js
// rail identical open vs closed
[...document.querySelectorAll('#view-aldo > .grid-wrap .al-nav .al-menu-item')]
  .map(k => +k.getBoundingClientRect().height.toFixed(1))   // [41.8 ×5 + one expanded]

// the veil is back at rest — run after EVERY route; a veil left on is a full-screen block
__VEIL.state()          // { busy:false, on:false, opacity:"0", visibility:"hidden" }

// what is actually PAINTED (not merely what opacity claims)
document.elementFromPoint(innerWidth/2, innerHeight/2).closest('#page-work') ? 'ALLWORK' : 'CASE'

// no leaked ScrollTriggers after closing a study
ScrollTrigger.getAll().filter(t => (t.vars && t.vars.scrub === 0.55) ||
  (t.trigger && t.trigger.classList && t.trigger.classList.contains('al-cs-results'))).length  // 0
```

Walk all six routes: home→case→home · home→case→All Work · All Work→case→All Work ·
All Work→case→home · rail-item jump out of a study · Escape. Then 1920 / 1568 / tablet / mobile.

**Three measurement traps, each of which has cost real time:**

- **A backgrounded tab makes every measurement lie.** rAF is suspended (ScrollTrigger never fires,
  GSAP's ticker stalls), CSS transitions pause, and `setTimeout` is clamped to ~1s so a 0.55s fade
  cannot be sampled at all. Foreground the tab before trusting any timing reading.
- **`elementFromPoint` cannot see the veil.** It hit-tests, and the veil is `pointer-events: none`,
  so a fully covered viewport still reports the page *underneath* — which looks exactly like the
  veil failing to cover. To test the veil's own stacking, set `pointerEvents = 'auto'` on it for
  the duration of the measurement and restore it after.
- **Wait ≥2.4s after firing a transition before asserting rail geometry.** The veil costs ~1.04s
  before `pinWorkItem`'s 0.72s rail collapse even begins; sampling earlier catches the rail
  mid-animation and reports items at ~48px, which reads exactly like a layout bug that isn't there.

---

## [6990ea2] — 2026-07-21

Previous release. Single-page Enigma homepage (responsive 12-col build, dark mode, constellation),
plus the original Porto Rocha 14-col vs Enigma grid-comparison views the repo started as, and the
`README.md` / `SPACING.md` dev handover docs.
