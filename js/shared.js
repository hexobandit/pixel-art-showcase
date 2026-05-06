// Shared helpers: iso projection, day/night palette, colour math.
// Exposed on window.PCity so the per-style files can reach it without ESM.
(function () {
  const PCity = {};

  // --- iso projection ---------------------------------------------------
  // iso(x, y) returns the screen-space top corner of tile (x, y).
  // Tile rhombus has corners at iso(x,y), iso(x+1,y), iso(x+1,y+1), iso(x,y+1).
  PCity.iso = function (x, y, tw, th) {
    return { x: (x - y) * tw * 0.5, y: (x + y) * th * 0.5 };
  };

  // Tile centroid (handy for placing things "on" a tile).
  PCity.isoCenter = function (x, y, tw, th) {
    return PCity.iso(x + 0.5, y + 0.5, tw, th);
  };

  // --- colour helpers ---------------------------------------------------
  PCity.rgb = function (r, g, b) {
    return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  };

  PCity.unpack = function (hex) {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
  };

  PCity.darken = function (hex, factor) {
    const [r, g, b] = PCity.unpack(hex);
    return PCity.rgb(
      Math.max(0, Math.round(r * factor)),
      Math.max(0, Math.round(g * factor)),
      Math.max(0, Math.round(b * factor))
    );
  };

  PCity.lighten = function (hex, factor) {
    const [r, g, b] = PCity.unpack(hex);
    return PCity.rgb(
      Math.min(255, Math.round(r + (255 - r) * factor)),
      Math.min(255, Math.round(g + (255 - g) * factor)),
      Math.min(255, Math.round(b + (255 - b) * factor))
    );
  };

  PCity.lerp = function (a, b, t) { return a + (b - a) * t; };

  PCity.lerpColor = function (hexA, hexB, t) {
    const [ar, ag, ab] = PCity.unpack(hexA);
    const [br, bg, bb] = PCity.unpack(hexB);
    return PCity.rgb(
      Math.round(PCity.lerp(ar, br, t)),
      Math.round(PCity.lerp(ag, bg, t)),
      Math.round(PCity.lerp(ab, bb, t))
    );
  };

  // --- day/night --------------------------------------------------------
  // timeOfDay: 0..1, where 0 = midnight, 0.5 = noon.
  // Returns ambient tint (multiplied over everything) as packed RGB.
  const ambientStops = [
    { t: 0.00, c: 0x2a345a }, // midnight cool blue
    { t: 0.18, c: 0x3a4070 }, // pre-dawn
    { t: 0.24, c: 0xb87a78 }, // dawn pink
    { t: 0.30, c: 0xffc488 }, // sunrise orange
    { t: 0.38, c: 0xfff0d8 }, // morning warm white
    { t: 0.50, c: 0xffffff }, // noon
    { t: 0.65, c: 0xfff0d8 }, // afternoon
    { t: 0.74, c: 0xffb070 }, // golden hour
    { t: 0.80, c: 0xe06a4c }, // sunset deep
    { t: 0.86, c: 0x6e4880 }, // dusk purple
    { t: 0.94, c: 0x36406b }, // late dusk
    { t: 1.00, c: 0x2a345a }
  ];

  PCity.ambientForTime = function (t) {
    t = ((t % 1) + 1) % 1;
    for (let i = 0; i < ambientStops.length - 1; i++) {
      const a = ambientStops[i], b = ambientStops[i + 1];
      if (t <= b.t) {
        const k = (t - a.t) / (b.t - a.t);
        return PCity.lerpColor(a.c, b.c, k);
      }
    }
    return ambientStops[ambientStops.length - 1].c;
  };

  // 0 at noon, 1 at midnight — for window glow strength.
  PCity.nightFactor = function (t) {
    return Math.max(0, (1 - Math.cos((t + 0.5) * Math.PI * 2)) * 0.5);
  };

  // 0 outside the dawn/dusk window, peaks at sunrise/sunset — used for sky gradient warmth.
  PCity.goldenFactor = function (t) {
    const peaks = [0.27, 0.78];
    let best = 0;
    for (const p of peaks) {
      const d = Math.abs(t - p);
      best = Math.max(best, Math.max(0, 1 - d / 0.08));
    }
    return best;
  };

  // --- pseudo-random ----------------------------------------------------
  PCity.mulberry32 = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // --- agent path follower ---------------------------------------------
  // Generic "walk a closed loop of waypoints" agent. Style files build the
  // sprite themselves and place it via the placer callback.
  PCity.PathAgent = class PathAgent {
    constructor(opts) {
      this.path = opts.path;
      this.idx = 0;
      this.x = this.path[0].x;
      this.y = this.path[0].y;
      this.speed = opts.speed || 1.5;
      this.facing = 0; // radians
      this.bobPhase = Math.random() * Math.PI * 2;
      this.bobAmp = opts.bobAmp || 0;
      this.idleUntil = 0;
      this.idleChance = opts.idleChance || 0;
    }
    update(dt, now) {
      if (this.idleUntil > now) {
        this.bobPhase += dt * 4;
        return;
      }
      const target = this.path[(this.idx + 1) % this.path.length];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.05) {
        this.idx = (this.idx + 1) % this.path.length;
        if (Math.random() < this.idleChance) {
          this.idleUntil = now + 1000 + Math.random() * 3000;
        }
        return;
      }
      this.facing = Math.atan2(dy, dx);
      const move = Math.min(this.speed * dt, d);
      this.x += dx / d * move;
      this.y += dy / d * move;
      this.bobPhase += dt * 8;
    }
  };

  window.PCity = PCity;
})();
