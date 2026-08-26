# _global

Paste once, site-wide. Both sections' files assume this is loaded first.

- **global.css** — `@font-face` for the six Enigma faces, the colour and
  spacing tokens, the `--u` unit, and the handful of primitives more than one
  section uses (`.cap`, `.mono14`, `.num70`, `.reg`, `.en-section`).
- **global.js** — loads GSAP (section 3) and three.js (section 4), but only if
  the page actually contains a block that needs them, then fires
  `enigma:libs-ready`. Every section's JS waits on `window.enigmaReady()`, so
  load order between the global field and the block fields does not matter.

If you prefer plain `<script>` tags in the site template over the loader, add
them before any section JS and drop `global.js` — the `enigmaReady` shim in
each section falls through to running immediately when it is absent:

```html
<script src="/js/gsap.min.js"></script>
<script src="/js/ScrollTrigger.min.js"></script>
<script src="/js/three.min.js"></script>
```
