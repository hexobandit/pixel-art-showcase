// Tiny pixel-art engine. Plumbing only — no opinions on style or mechanics.
// Exposes window.Pixel = { PALETTE, createScene, rng, fillRect, pixel, clear, lerp, clamp }
(function () {
  'use strict';

  // Endesga 32 — https://lospec.com/palette-list/endesga-32
  const PALETTE = {
    blood:       '#be4a2f',
    rust:        '#d77643',
    sand:        '#ead4aa',
    skin:        '#e4a672',
    tan:         '#b86f50',
    brown:       '#733e39',
    dark_brown:  '#3e2731',
    blood_dark:  '#a22633',
    red:         '#e43b44',
    orange:      '#f77622',
    amber:       '#feae34',
    yellow:      '#fee761',
    light_green: '#63c74d',
    green:       '#3e8948',
    dark_green:  '#265c42',
    forest:      '#193c3e',
    navy:        '#124e89',
    blue:        '#0099db',
    cyan:        '#2ce8f5',
    white:       '#ffffff',
    light_gray:  '#c0cbdc',
    gray:        '#8b9bb4',
    blue_gray:   '#5a6988',
    dark_gray:   '#3a4466',
    very_dark:   '#262b44',
    black:       '#181425',
    hot_pink:    '#ff0044',
    purple:      '#68386c',
    mauve:       '#b55088',
    pink:        '#f6757a',
    peach:       '#e8b796',
    light_brown: '#c28569',
  };

  function createScene(opts) {
    opts = opts || {};
    const width = opts.width || 180;
    const height = opts.height || 320;
    const parent = opts.parent || document.body;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'manipulation';
    canvas.style.cursor = 'pointer';
    parent.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    function resize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(1, Math.min(vw / width, vh / height));
      canvas.style.width  = Math.floor(width  * scale) + 'px';
      canvas.style.height = Math.floor(height * scale) + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    const tapListeners = [];
    function virtualCoords(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) * width  / rect.width);
      const y = Math.floor((clientY - rect.top)  * height / rect.height);
      return { x, y };
    }
    function fireTap(clientX, clientY) {
      const p = virtualCoords(clientX, clientY);
      if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) return;
      tapListeners.forEach(fn => fn(p.x, p.y));
    }
    canvas.addEventListener('click', e => fireTap(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length) {
        e.preventDefault();
        fireTap(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    let running = false;
    let lastTime = 0;
    let updateFn = null;
    let drawFn = null;

    function frame(now) {
      if (!running) return;
      const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
      lastTime = now;
      if (updateFn) updateFn(dt);
      if (drawFn) drawFn(ctx);
      requestAnimationFrame(frame);
    }

    return {
      canvas, ctx, width, height,
      onTap(fn) { tapListeners.push(fn); },
      start(loop) {
        updateFn = loop && loop.update;
        drawFn   = loop && loop.draw;
        running = true;
        lastTime = 0;
        requestAnimationFrame(frame);
      },
      stop() { running = false; },
    };
  }

  // Mulberry32 — small seedable PRNG.
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fillRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  function pixel(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, 1, 1);
  }
  function clear(ctx, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // Lerp two hex colors. Returns "#rrggbb".
  function lerpColor(a, b, t) {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  window.Pixel = { PALETTE, createScene, rng, fillRect, pixel, clear, lerp, clamp, lerpColor };
})();
