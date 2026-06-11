/* ================================================================
   research.js  —  scroll-driven GIF animation engine
   Depends on: WINDOWS array defined in windows.js (loaded first)
   ================================================================ */

(function () {
'use strict';

// ── Config ────────────────────────────────────────────────────────
const GIF_SRC    = 'images/zoom_cosmo.gif';
const IMG_BASE   = 'images/';      // prepended to image src paths from windows.js
const WIN_WIDTH  = 324;            // base panel width in px (edit to resize all panels)
const N_FRAMES   = 445;

// GIF native dimensions
const GIF_W = 1280;
const GIF_H = 720;

// Physical scale keyframes read from the GIF's scale bar (in parsecs)
const SCALE_KF = [
  { f:   0, pc: 100000 },   // 100 kpc
  { f:  48, pc:   1000 },   // 1 kpc
  { f:  96, pc:    100 },   // 100 pc
  { f: 144, pc:      1 },   // 1 pc
  { f: 192, pc:   0.01 },   // 0.01 pc
];

// Scroll distance (in pixels) reserved for the slide-up transition
// before frame scrubbing begins. Set to window.innerHeight (1 viewport).
const SLIDE_DIST = () => window.innerHeight;

// On small screens the % positions from windows.js don't fit, so
// panels get pinned: even-index panels near the top of the viewport,
// odd-index panels near the bottom (concurrent panels never collide).
const MOBILE_Q = window.matchMedia('(max-width: 736px)');

// ── DOM refs ──────────────────────────────────────────────────────
const canvas     = document.getElementById('gif-canvas');
const ctx        = canvas.getContext('2d');
const overlay    = document.getElementById('loading-overlay');
const loBar      = document.getElementById('lo-bar');
const progFill   = document.getElementById('progress-fill');
const scrollInd  = document.getElementById('scroll-indicator');
const animSec    = document.getElementById('animation-section');
const stickyWrap = document.getElementById('sticky-wrap');

// ── State ─────────────────────────────────────────────────────────
let bitmaps    = [];   // ImageBitmap[] for each GIF frame (GPU-resident)
let loaded     = false;
let curFrame   = -1;
let lastFrame  = -1;
let winEls     = null; // cached .info-win NodeList

// ─────────────────────────────────────────────────────────────────
// BUILD WINDOW DOM FROM WINDOWS CONFIG
// ─────────────────────────────────────────────────────────────────

// Accepts any path the user writes in windows.js and resolves it to
// the correct URL from the Research page's root.
// Valid input formats (all produce the same result):
//   foo.png
//   images/foo.png
//   ./images/foo.png
function resolveImg (src) {
  if (!src) return '';
  const clean = src.replace(/^\.\//, '').replace(/^images\//, '');
  return IMG_BASE + clean;   // IMG_BASE = 'images/'
}

function buildWindows () {
  WINDOWS.forEach(cfg => {
    const el = document.createElement('div');
    el.className = 'info-win';

    el.dataset.frameIn   = cfg.frameIn;
    el.dataset.framePeak = cfg.framePeak;
    el.dataset.frameOut  = cfg.frameOut;
    el.dataset.posX      = cfg.posX;
    el.dataset.posY      = cfg.posY;
    el.dataset.from      = cfg.from || 'right';

    // Optional per-panel width override (falls back to CSS default)
    if (cfg.width) el.style.width = cfg.width + 'px';

    const imgSrc  = resolveImg(cfg.image.src);
    const imgHTML = imgSrc
      ? `<a class="win-img" href="${cfg.image.href}" target="_blank">
           <img src="${imgSrc}" alt="${cfg.image.alt}">
         </a>`
      : `<a class="win-img placeholder" href="${cfg.image.href}"
            target="_blank" data-label="[ placeholder image ]"></a>`;

    el.innerHTML = `
      <div class="win-top-row">
        <span class="win-anchor"></span>
        <span class="win-scale">${cfg.scale}</span>
      </div>
      <div class="win-title">${cfg.title}</div>
      ${imgHTML}
      <p class="win-body">${cfg.body}</p>
      <a class="win-link" href="${cfg.link.href}" target="_blank">${cfg.link.text}</a>
    `;

    stickyWrap.appendChild(el);
  });
}

// ─────────────────────────────────────────────────────────────────
// CANVAS SIZING  (matches viewport exactly; drawFrame handles cover)
// ─────────────────────────────────────────────────────────────────
function resizeCanvas () {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (loaded && curFrame >= 0) drawFrame(curFrame);
  // Panel clamping depends on viewport size — reposition on resize
  if (winEls && lastFrame >= 0) updateWindows(lastFrame);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─────────────────────────────────────────────────────────────────
// GIF LOADING  (omggif decodes frames; createImageBitmap → GPU)
// ─────────────────────────────────────────────────────────────────
function injectScript (src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function loadGif () {
  await injectScript('https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js');

  const response  = await fetch(GIF_SRC);
  const buffer    = await response.arrayBuffer();
  const reader    = new GifReader(new Uint8Array(buffer));
  const W         = reader.width;
  const H         = reader.height;
  const nFrames   = reader.numFrames();

  // Composite RGBA buffer — accumulates frames for disposal blending
  const composite = new Uint8ClampedArray(W * H * 4);
  let prevSave    = null;

  for (let i = 0; i < nFrames; i++) {
    const fi = reader.frameInfo(i);

    // Apply previous frame's disposal method before blitting this frame
    if (i > 0) {
      const pfi = reader.frameInfo(i - 1);
      if (pfi.disposal === 2) {
        // Clear previous frame's bounding box to transparent
        for (let row = pfi.y; row < pfi.y + pfi.height; row++) {
          composite.fill(0,
            (row * W + pfi.x) * 4,
            (row * W + pfi.x + pfi.width) * 4
          );
        }
      } else if (pfi.disposal === 3 && prevSave) {
        composite.set(prevSave);
      }
    }

    if (fi.disposal === 3) prevSave = composite.slice();

    reader.decodeAndBlitFrameRGBA(i, composite);

    const bitmap = await createImageBitmap(
      new ImageData(new Uint8ClampedArray(composite), W, H)
    );
    bitmaps.push(bitmap);

    loBar.style.width = ((i + 1) / nFrames * 100) + '%';

    // Yield to browser every 8 frames to keep UI responsive during load
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
  }

  loaded = true;
  overlay.classList.add('done');
  drawFrame(0);
  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────────────────────────
// RENDERING  (cover-crop: fills viewport, crops edges if needed)
// ─────────────────────────────────────────────────────────────────
function drawFrame (idx) {
  if (!bitmaps[idx]) return;
  const bm = bitmaps[idx];
  const cw = canvas.width,  ch = canvas.height;
  const bw = bm.width,      bh = bm.height;

  let sx, sy, sw, sh;
  if (cw / ch > bw / bh) {
    // Canvas wider than source → fit width, crop top/bottom
    sw = bw;  sh = bw * ch / cw;
    sx = 0;   sy = (bh - sh) / 2;
  } else {
    // Canvas taller than source → fit height, crop left/right
    sh = bh;  sw = bh * cw / ch;
    sy = 0;   sx = (bw - sw) / 2;
  }
  ctx.drawImage(bm, sx, sy, sw, sh, 0, 0, cw, ch);
}

// ─────────────────────────────────────────────────────────────────
// SCALE LABEL  (log-interpolated between keyframes)
// ─────────────────────────────────────────────────────────────────
function getScalePc (frame) {
  for (let i = 0; i < SCALE_KF.length - 1; i++) {
    const a = SCALE_KF[i], b = SCALE_KF[i + 1];
    if (frame <= b.f) {
      const t = (frame - a.f) / (b.f - a.f);
      return Math.pow(10,
        Math.log10(a.pc) + t * (Math.log10(b.pc) - Math.log10(a.pc))
      );
    }
  }
  return SCALE_KF[SCALE_KF.length - 1].pc;
}

function formatPc (pc) {
  if (pc >= 1000) return (pc / 1000).toFixed(pc >= 10000 ? 0 : 1) + ' kpc';
  if (pc >= 1)    return pc.toFixed(0) + ' pc';
  if (pc >= 0.1)  return pc.toFixed(2) + ' pc';
  return pc.toFixed(3) + ' pc';
}

// ─────────────────────────────────────────────────────────────────
// WINDOW ANIMATION  (frame-driven slide-in / fade-out)
// ─────────────────────────────────────────────────────────────────
const SLIDE_OFFSETS = {
  left:   [-50,  0],
  right:  [ 50,  0],
  top:    [  0, -40],
  bottom: [  0,  40],
};

const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn  = t => t * t * t;

function updateWindows (frame) {
  if (!winEls) winEls = Array.from(document.querySelectorAll('.info-win'));

  const mobile = MOBILE_Q.matches;

  winEls.forEach((win, idx) => {
    const fi   = +win.dataset.frameIn;
    const fp   = +win.dataset.framePeak;
    const fo   = +win.dataset.frameOut;
    const from = win.dataset.from || 'right';
    const [sdx, sdy] = SLIDE_OFFSETS[from] || SLIDE_OFFSETS.right;

    if (mobile) {
      // Pinned: centered horizontally, alternating top/bottom by index
      win.style.left = '50%';
      if (idx % 2 === 0) {
        win.style.top = '9%';  win.style.bottom = 'auto';
      } else {
        win.style.top = 'auto'; win.style.bottom = '3.5rem';
      }
    } else {
      // posX/posY are viewport percentages, clamped so the panel always
      // stays fully on screen at any window size
      const vw  = window.innerWidth;
      const vhPx = window.innerHeight;
      const pw  = win.offsetWidth  || WIN_WIDTH;
      const ph  = win.offsetHeight || 0;
      const pad = 12;
      let left = vw  * (+win.dataset.posX) / 100;
      let top  = vhPx * (+win.dataset.posY) / 100;
      left = Math.max(pad, Math.min(left, vw  - pw - pad));
      top  = Math.max(pad, Math.min(top,  vhPx - ph - pad));
      win.style.left   = left + 'px';
      win.style.top    = top + 'px';
      win.style.bottom = 'auto';
    }
    // Width comes from CSS (.info-win { width: ... }) — do not set inline.

    let opacity, tx, ty, scale;

    if (frame < fi || frame > fo) {
      // Off-screen / hidden
      opacity = 0;  tx = sdx;  ty = sdy;  scale = 0.88;
      win.classList.remove('visible');

    } else if (frame <= fp) {
      // Sliding in  (frameIn → framePeak)
      const e = easeOut((frame - fi) / Math.max(fp - fi, 1));
      opacity = e;  tx = sdx * (1 - e);  ty = sdy * (1 - e);  scale = 0.88 + 0.12 * e;
      win.classList.toggle('visible', e > 0.5);

    } else {
      // Fading out  (framePeak → frameOut)
      const e = easeIn((frame - fp) / Math.max(fo - fp, 1));
      opacity = 1 - e;  tx = sdx * e * 0.4;  ty = sdy * e * 0.4;  scale = 1 - 0.08 * e;
      win.classList.toggle('visible', opacity > 0.1);
    }

    const baseX = mobile ? `calc(-50% + ${tx}px)` : `${tx}px`;
    win.style.opacity   = opacity;
    win.style.transform = `translate(${baseX}, ${ty}px) scale(${scale})`;
  });
}

// Re-pin panels immediately when crossing the mobile breakpoint
// (updateWindows otherwise only runs when the frame changes).
MOBILE_Q.addEventListener('change', () => {
  if (lastFrame >= 0) updateWindows(lastFrame);
});

// ─────────────────────────────────────────────────────────────────
// SCROLL INDICATOR
// ─────────────────────────────────────────────────────────────────
function updateScrollIndicator () {
  const atBottom =
    window.scrollY + window.innerHeight >= document.body.scrollHeight - 30;
  scrollInd.classList.toggle('hidden', atBottom);
}

// ─────────────────────────────────────────────────────────────────
// MAIN RAF LOOP
// ─────────────────────────────────────────────────────────────────
function tick () {
  requestAnimationFrame(tick);
  updateScrollIndicator();

  const scrollY    = window.scrollY;
  const vh         = window.innerHeight;
  const animTop    = animSec.offsetTop;
  const animHeight = animSec.offsetHeight;
  const slideDist  = SLIDE_DIST();

  // ── Phase 1: slide-up transition ──────────────────────────────
  // Starts when the top of the animation section reaches the bottom of
  // the viewport (so the canvas never covers the intro content early,
  // regardless of how tall the intro is on a given window size) and
  // completes one viewport of scrolling later.
  // transP: 0 = canvas off-screen below, 1 = canvas fully covering viewport
  const slideStart = animTop - vh;
  const transP = Math.max(0, Math.min(1, (scrollY - slideStart) / slideDist));
  stickyWrap.style.transform  = `translateY(${(1 - transP) * 100}%)`;
  stickyWrap.style.visibility = transP === 0 ? 'hidden' : '';

  if (!loaded) return;

  // ── Phase 2: frame scrubbing ───────────────────────────────────
  // Begins once the slide-up completes.
  const scrubStart = animTop;
  const scrubEnd   = animTop + animHeight - vh;
  const scrubLen   = Math.max(1, scrubEnd - scrubStart);
  const frameP     = Math.min(1, Math.max(0, (scrollY - scrubStart) / scrubLen));
  const frame      = Math.min(N_FRAMES - 1, Math.floor(frameP * N_FRAMES));

  if (frame !== lastFrame) {
    lastFrame = frame;
    curFrame  = frame;
    drawFrame(frame);
    updateWindows(frame);
    progFill.style.height = (frameP * 100) + '%';
  }
}

// ─────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────
buildWindows();
updateScrollIndicator();
window.addEventListener('scroll', updateScrollIndicator, { passive: true });

loadGif().catch(err => {
  console.error('GIF load failed:', err);
  const lbl = document.querySelector('.lo-label');
  if (lbl) lbl.textContent = 'Could not load simulation.';
});

})();
