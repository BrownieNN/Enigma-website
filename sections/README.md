# Enigma — CMS section blocks

Five sections lifted out of the grid-proof build (`index.html` + `styles.css`,
branch `enigma-buildout`) and split into the three fields the CMS exposes:
**HTML**, **CSS**, **JS**.

| # | Folder | Block | Library |
|---|---|---|---|
| 1 | `01-welcome/` | Welcome to the home of Unignorability® | — |
| 2 | `02-hello-typing/` | Hello (typewriter) | — |
| 3 | `03-unignorability/` | Unignorability® strings | GSAP |
| 4 | `04-central-intelligence/` | Central Intelligence | three.js |
| 5 | `05-lets-talk/` | Let's Talk! | — |

`preview.html` stacks all five in CMS load order. Serve the repo root and open
`/sections/preview.html` to check a change before pasting it in:

```
python3 -m http.server 8899      # from the grid-proof root
open http://localhost:8899/sections/preview.html
```

---

## Install order

1. **Once, site-wide** — paste `_global/global.css` into the site CSS field and
   `_global/global.js` into the site JS field. Everything else assumes these.
2. **Per block** — paste the three files from a section folder into that
   block's HTML / CSS / JS fields. Order between sections does not matter.

Sections 1, 2 and 5 have no library dependency. If you are not using 3 or 4,
`global.js` can be skipped entirely.

## Uploads

Asset paths are **root-relative**. Upload these to the site root, preserving
the folder names:

```
/fonts/    Enigma-EnigmaLargeRoman.otf, Enigma-EnigmaLargeItalic.otf,
           Enigma-EnigmaLargeExtended.otf, ABCGaisyr-Light.otf,
           ABCGaisyr-LightItalic.otf, ABCFavoritMono-Regular.otf
/assets/aldo/cursor.svg          typewriter caret (sections 2 and 5)
/assets/aldo/cursor-cream.svg    dark-mode caret (section 5)
/js/       gsap.min.js, ScrollTrigger.min.js  (section 3)
           three.min.js                        (section 4)
```

Nothing else is referenced. The video, photography and lockup assets belong to
the parts of those sections that were deliberately left out (see below).

---

## Sizing: the `--u` unit

Every panel height, padding and display size is written as
`calc(<figma px> * var(--u))`. `--u` is defined in `global.css` as
`0.070126cqw` — one Figma pixel when the block is **1426px** wide, which is the
width of the site's main column on the 1920 design canvas.

Each section root carries `container-type: inline-size`, so it measures
**itself**. Put a section in a wider block and the whole composition scales up
proportionally; put it in a narrower one and it scales down. Nothing breaks,
but it will not match the drawn size unless the block is 1426px.

To pin a section to exact Figma pixels regardless of block width:

```css
.en-section { --u: 1px; }
```

Each section CSS also carries the mobile (`< 480px`) and tablet
(`480–1023px`) container queries from the source sheet.

## Dark mode

Section 5 has a dark variant that keys off `body.dark` (black panel, cream
type, cream caret). It is carried over as-is — add or remove `dark` on the
`<body>` and it follows. The other four sections have no dark variant in the
source.

---

## What was deliberately left out

Per the brief, each folder holds **the hero visual only**. Not included:

- Section divider strips (`HELLO SECTION / 01`, `APPROACH SECTION / 02`, …)
- Section 2's video graphic panel and the "Our story" text component
- Section 3's "Our approach" / "Our practice" text components
- Section 5's three contact tiles (Simon / Dom / Kate)
- Section 4's gear-button art-direction panel (`js/droplets-panel.js`) — dev
  chrome, not product code. Runtime tuning is still on `window.__MOLTEN.set()`.

The section numerals (⓿❶, ⓿❻) sit *inside* their panels and are included.

## Changes made during extraction

Everything else is verbatim. The four deltas, each noted in the file header:

- **01** — the background-word pan ran on `gsap.ticker`; reproduced on
  `requestAnimationFrame` so the section needs no library. Identical motion.
- **02, 05** — the `#view-aldo` page-scope prefix dropped from the selectors.
- **03** — `js/constel-data.js` (the glyph vectors) inlined, so the section is
  one paste-able field.
- **04** — the bootstrap now waits for three.js instead of firing on
  `DOMContentLoaded`, so an async library load cannot race init.

## Live hooks

- `window.__ROPE` — section 3 physics (see the QA note in its JS)
- `window.__MOLTEN.set({ ... })` / `.state()` — section 4 shader
- `window.__LETS.retype()` — replay section 5's typing
