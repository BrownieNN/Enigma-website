# Enigma — Homepage

A static, framework-free homepage for Enigma (the "Enigma Aldo" design). Plain **HTML + CSS +
vanilla JS**, no build step. GSAP is bundled locally (`js/`) for the sidebar scrollspy and the
Approach-section letter "constellation".

---

## Running locally

The page **must be served over HTTP** (not opened as a `file://`) because the work-tile videos
stream via **HTTP Range** requests. Use any static server that supports Range:

```bash
npx serve .          # then open the printed http://localhost:xxxx URL
```

> ⚠️ Python's `python3 -m http.server` does **not** support Range — the videos won't play (the
> layout is otherwise fine). Netlify/Vercel/most CDNs support Range out of the box.

No install/build. Edit `index.html`, `styles.css`, and the files in `js/` directly.

---

## File structure

```
.
├── index.html        # the whole page + inline JS (single file)
├── styles.css        # all styling (desktop + a mobile @media block)
├── js/               # gsap.min.js, ScrollTrigger.min.js, ScrollToPlugin.min.js, constel-data.js
├── fonts/            # Enigma Large, ABC Gaisyr, ABC Favorit Mono (.otf)  ⚠️ see licence note
└── assets/aldo/      # all imagery + the work-tile videos
```

> ⚠️ **Font licensing:** the `fonts/` are commercial (custom Enigma + ABC Dinamo) and are
> downloadable from the served site. Confirm the agency's webfont licence covers public hosting
> before go-live.

---

## The 12-column grid & sidebar logic

This is the part most worth understanding before touching the layout.

### Layout shell

`.grid-wrap` is a **flex row** of two things:

```
┌────────────┬───────────────────────────────┐
│  .sidebar  │            .main              │
│ (FIXED px) │        (FLUID, flex:1)        │
└────────────┴───────────────────────────────┘
```

Everything uses **8px gaps / 8px outer margins** and **12–15px corner radii** — that's the design
system.

### The 12 columns (at the 1920 reference width)

The grid is **12 columns**. At the 1920px design width:

| region      | columns | width    |
| ----------- | ------- | -------- |
| **sidebar** | 3 of 12 | **470px** |
| **main**    | 9 of 12 | **1426px** |

(`8 + 470 + 8 + 1426 + 8 = 1920`.)

### ⚠️ The key mental model: the sidebar is FIXED, the main is FLUID

**The sidebar is a fixed-width card (470px) — it never grows or shrinks.** The main column is
fluid (`flex: 1`) and simply takes whatever space is left.

So when you narrow the browser, **the sidebar stays 470px and only the main column gets narrower.**

This is why the "12 columns" line up perfectly **only at 1920**. Below that, the main's 9 columns
squeeze closer together while the sidebar's 3 columns *can't move* (they're pinned in pixels). The
sidebar edge and the main's column lines stop matching. **This is intentional** — see `--u` below;
pinning the sidebar keeps text wrapping in the main column stable across widths.

> Think of it as a **printed card** (the sidebar — fixed size) next to **water filling the rest of
> the glass** (the main — takes what's left). Shrinking the window shrinks the water area only.

You can see this live: the **grid-overlay toggle** (bottom-left floating button, grid icon) draws
the numbered columns over the layout so you can watch the sidebar edge land on a column line.

### `--u` — the scale unit that makes display type zoom with the column

`.main` is a CSS container (`container-type: inline-size`), so **`cqw` = 1% of the MAIN column
width** (not the viewport). `--u` is defined as *one Figma px expressed in `cqw`, normalised to the
main's reference width (1426)*:

```css
#view-aldo .main { --u: 0.070126cqw; }   /* = 100 / 1426 */
```

Any measurement that should **zoom with the column** is written `calc(<figma-px> * var(--u))` — it
resolves to the exact Figma px at 1920 and scales proportionally below. Headline stacks stay
identical at every width; only display-type sizes scale, while body/labels/CTAs stay fixed px.

Because `cqw` is relative to the **main** column (not `vw`), the sidebar being a fixed width doesn't
drift the type or break wrapping. That is the whole reason the sidebar is fixed.

> ⚠️ Gotcha: `container-type` and the `--u` value live in **two separate CSS rules**. If you add a
> view, set both or `cqw` falls back to the viewport and the H1s render wrong.

### Responsive: sidebar 3 col → 2 col at ≤ 1512px

At **≤ 1512px** the sidebar drops from **3 columns (470px)** to **2 columns (310px)**, and the main
widens (new reference 1586, so `--u` renormalises):

```css
@media (min-width: 601px) and (max-width: 1512px) {
  #view-aldo .sidebar.w-470 { width: 310px; }
  #view-aldo .main          { --u: 0.063052cqw; }   /* = 100 / 1586 */
  #view-aldo .fg-side.w-470 { width: 310px; grid-template-columns: repeat(2, 1fr); }
}
```

It's a **hard switch** at the breakpoint (not a smooth shrink). The `min-width: 601px` floor keeps
this rule off mobile, which has its own layout.

### Mobile (≤ 600px)

Single column: the sidebar becomes a full-width "parade" (logo / CTA / date) at the **top**, the
desktop nav is hidden, and a **fixed bottom-nav minimap** appears. Several sections are set to a
**3:4 aspect ratio** (hero, grey welcome, video graphic, Unignorability cell, Fearless-Play).

### 📏 Spacing & padding rules → see [`SPACING.md`](SPACING.md)

Every gap, inner padding and corner radius on the site follows a system (8px structural grid; 32px
tile side-padding that scales via `--u`; fixed-px chrome; 15px radii). **[`SPACING.md`](SPACING.md)**
is the authoritative per-component reference — read it before adjusting any spacing.

---

## Which sections are CMS-insertable HTML snippets

The page is one hand-authored HTML file. The blocks below are **simple, self-contained HTML (text +
images) with no bespoke JS** — safe to make CMS-editable or inject as snippets. The others are
custom-coded feature components — leave them hardcoded.

### ✅ CMS-friendly — plain content blocks

| Section | Selector | What it is |
| --- | --- | --- |
| Section labels | `.al-divider` | The little "HELLO SECTION / 01" tags |
| Section titles | `.al-title` (Approach / Work / Talent) | A single display word each |
| Text components | `.al-textcomp` (`.al-tc-hello`, `.al-tc-appr1`, `.al-tc-appr2`, `.al-tc-talent`) | Tag headline + body copy + number badge — pure editable copy |
| Work cards | `.al-tile` inside `.al-workgrid` | 9 project cards (image + title + caption). A **repeatable collection** — the best CMS candidate |
| "Fearless Play" snippet | `.al-snippet` | Headline + body + background image |
| Hero / final image | `.al-hero`, `.al-large` | Single image swaps |
| **Sidebar content** | `.al-logo`, `.al-cta`, `.al-nav` `.al-menu-item`s | Logo image, the "ALL WORK" CTA label, and the **nav items** (labels + colours). See the ⚠️ wiring note below |

### 🔒 Behaviours that are code, not content (keep hardcoded)

These are **interactions**, not blocks to swap. Their *content* may be CMS-driven (above), but the JS
that animates them stays.

| Behaviour | Selector | What it does |
| --- | --- | --- |
| Sidebar scrollspy + scroll | `sidebarNav()` on `.al-nav` | Expands the current nav item, smooth-scrolls to its section |
| Hello greeting | `.al-hello-title` | Typewriter that cycles greetings with a blinking cursor |
| Grey "Welcome" | `.al-welcome` | Giant background word with a slow horizontal marquee pan |
| Unignorability cell | `.al-cell` | Kinetic letter "constellation" — custom physics (GSAP) |
| Chrome | dark-mode toggle, live date/time, divider hairline SVGs | Small hardcoded UI |

> ⚠️ **Making the sidebar nav fully CMS-driven — read this.** The nav *items* are editable content
> (labels, colours via the `c-pink`/`c-blue`/… classes), so a CMS can drive them. **But** `sidebarNav()`
> currently maps each item to its section **by position** (a hardcoded index array
> `map = [Hello, Approach, Work, Talent, null /*Careers*/, Contact→final image]`), not by an `href` or
> `data-target`. So: **editing labels/colours is safe as-is**; **adding / removing / reordering items
> will break the scroll wiring** unless you first refactor that mapping to read a per-item anchor
> (e.g. give each `.al-menu-item` a `data-target="#section-id"` and have `sidebarNav()` use it). That
> refactor is small and is the recommended step before wiring the nav to a CMS.

> ⚠️ In the "Born of…" text component, four accent words (`.rc-word`) recolour on click via JS. The
> **words are editable copy**, but that click-to-recolour interaction is code — keep the class.

---

## Notes for the dev team

- **Single view.** The markup has one `#view-aldo` section. (Historically there were comparison
  views — Porto Rocha / Proposed / 14-col — they've been stripped.)
- **Grid overlay + screen-size simulator** are dev tools (floating buttons). Harmless to keep or
  strip; not part of the shipped design.
- **Videos** in `assets/aldo/videos/` are autoplayed muted/looping and kicked by JS on load/tab
  change (browsers won't autoplay a video born in a hidden element).
- This repo is **not wired to any deploy** — deploy it however suits (any static host).
