# Spacing & padding — the rules

Every spacing value on this site follows a system. Learn these rules and the layout is predictable;
guess and the art director will (rightly) notice. Values below are the **Figma px at the 1920
reference width** — the design was authored at 1920.

---

## The golden rules (TL;DR)

1. **Structural spacing is an 8px grid.** Every gap between tiles, every outer margin, the
   sidebar↔main gap, gaps between sections and nav items = **8px** (`--gap`). Multiples of 8 only.
2. **Tile side-padding is always 32px** (left = right = 32). This never changes across the design
   tiles — only the top/bottom padding varies per tile.
3. **Two padding systems, and you must not mix them:**
   - **Design tiles** (the big coloured/content panels) scale their padding with the column:
     `padding: calc(<figma-px> * var(--u))`. → exact Figma px at 1920, proportional below.
   - **Chrome** (nav items, labels, CTAs, captions) uses **fixed px** (never `--u`). The common
     chrome unit is **16px**.
4. **Corner radius:** design tiles/panels = **15px** (`--radius`); pills = **100px**; dots/circles =
   **50%**. Nothing else.
5. **Mobile** drops the side padding **32 → 16px** and switches everything to **fixed px** (no `--u`).

> ⚠️ Why tiles scale but chrome doesn't: `.main` is a CSS container, so `--u` is a fraction of the
> **main column width**. Tile padding scales with the column so headline stacks stay identical at
> every width; body text, labels and CTAs stay a fixed, readable px. See the grid section in the
> main README.

---

## 1. The 8px structural grid

`:root { --gap: 8px; }` — used for **all** structural spacing:

| Where | Value |
| --- | --- |
| Page outer margin (`.grid-wrap` padding) | **8** |
| Sidebar ↔ main gap | **8** |
| Gap between stacked sections (`.main`, `.al-section`) | **8** |
| Sidebar parade internal gaps (`.al-parade`, `.al-nav`) | **8** |
| Work grid — gap between the 3 columns (`.al-workgrid`) | **8** |
| Grid legend / overlay | **8** |

**Deliberate exceptions to the 8px grid** (these are intentional — do not "correct" them):

| Where | Value | Why |
| --- | --- | --- |
| Work column inner gap (`.al-col.g12`) | **12** | Normalised so the bottom media aligns across columns (Figma had 16 on col 3 — a slip) |
| Work tile: image ↔ caption (`.al-tile`) | **24** | Design value |

---

## 2. Design-tile inner padding (scales via `--u`)

Format: **top / sides / bottom** — all `calc(<n> * var(--u))`, i.e. these px at 1920.
**Sides are 32 everywhere.** Only top/bottom change.

| Tile | Selector | top / **32** / bottom | Inner gap |
| --- | --- | --- | --- |
| Grey "Welcome" | `.al-welcome` | 64 / 32 / 32 | — |
| Section title (Approach/Work/Talent/Hello) | `.al-title` | 64 / 32 / 32 | — |
| Graphic (video/lockup) | `.al-graphic` | 64 / 32 / 32 | — |
| "Fearless Play" snippet | `.al-snippet` | 64 / 32 / **72** | — |
| Text component — **general** | `.al-textcomp .inner` | **160** / 32 / 32 | 96 |
| — "Born of…" (Hello) | `.al-tc-hello .inner` | 160 / 32 / 32 | ~125 |
| — Approach ¶1 | `.al-tc-appr1 .inner` | 160 / 32 / **96** | — |
| — Approach ¶2 | `.al-tc-appr2 .inner` | **64** / 32 / 32 | 128 |

Notes:
- The **160px top** on text components is the design's tag-headline breathing room — that's the
  intended big gap between the "TAG HEADLINE" label and the body copy.
- Text-component **row gap** (tag headline ↔ body, side-by-side on desktop) = **8px**.
- The per-component gap/bottom overrides on `.al-tc-hello / .al-tc-appr1 / .al-tc-appr2` are
  **alignment micro-adjustments** tuned so each section boundary lands on the Figma guide bars
  (verified to ≤0.8px). They carry code comments. **Don't round them to "tidy" numbers** — they're
  load-bearing for the overlay alignment.

---

## 3. Chrome padding (fixed px — never `--u`)

| Element | Selector | Padding |
| --- | --- | --- |
| Nav item / sidebar menu item | `.nav-item`, `.al-menu-item` | **16** (all sides) |
| Section divider label | `.al-divider` | **16** |
| "ALL WORK" CTA pill | `.al-cta` | 0 / **18** |
| Date / time row | `.al-date` | 0 / **16** |
| Logo block | `.al-logo` | **8** / 0 |
| Work-tile caption | `.al-tile .tcontent` | 0 / **0** / 16 — _no L/R padding (runs full tile width, per AD)_ |
| Work-tile caption line gap | `.al-tile .tcontent` | gap **14** |

---

## 4. Corner radius

| Element | Radius |
| --- | --- |
| All design tiles + panels (hero, welcome, title, graphic, cell, textcomp, snippet, menu items, work-tile media…) | **15px** (`--radius`) |
| Pills — CTA, toggle knob | **100px** |
| Dots, circled numerals, round icons | **50%** |

`--radius` was bumped **12 → 15** (AD: the Illustrator source reads smoother). Change it in one place
(`:root`). Squircle corners use `corner-shape: squircle` where supported.

---

## 5. Mobile (`@media max-width: 600px`)

Mobile uses **fixed px** (no `--u`) and **16px side padding** (down from 32). Top/bottom rhythm is
compressed.

| Tile | Padding (T / 16 / B) |
| --- | --- |
| Welcome, Graphic, Section title | 24 / 16 / 16 |
| "Fearless Play" snippet | 24 / 16 / 24 |
| Text component `.inner` | **80** / 16 / 24 — _consistent across ALL text components_ |

Other mobile spacing:

| Where | Value |
| --- | --- |
| Page padding (`.grid-wrap`) | 8 / 8 / **116** (bottom clears the fixed nav) |
| Text-component row gap (stacked) | **64** |
| Work grid gap (single column) | 8 |
| Bottom nav bar (`.m-nav`) | 16 / 0 (edge-to-edge) |
| Bottom-nav pills (`.m-pill`) | 16, with **8px** before the first & after the last pill |

> ⚠️ Mobile text-component padding was deliberately unified to **80 / 16 / 24** so every text block
> has identical spacing. An ID-scoped rule (`#view-aldo .al-textcomp .inner`) enforces this because
> the desktop overlay-alignment rules have higher specificity and would otherwise leak in. If you
> touch text-block spacing on mobile, keep it ID-scoped or it won't apply.

---

## Quick decision guide

- **Adding a gap between two blocks?** → 8px.
- **Padding inside a big design tile?** → `calc(64 * var(--u))` top, `calc(32 * var(--u))` sides,
  bottom per the table. (16px sides on mobile, fixed.)
- **Padding inside a label / button / caption?** → fixed 16px (or the table value).
- **A corner?** → 15px, unless it's a pill (100px) or a circle (50%).
- **A number that isn't a multiple of 8 and isn't in a table above?** → it's probably a tuned
  alignment micro-adjustment; check the code comment before changing it.
