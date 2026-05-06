// app.js — bootstrap the live city.
(async function () {
  const { Application, Container, Graphics } = PIXI;
  const { ambientForTime, nightFactor } = PCity;
  const { City, RD } = PCity;
  const { TW, TH, PAL } = RD;

  const app = new Application();
  await app.init({
    background: 0x10162a,
    antialias: false,
    roundPixels: true,
    autoDensity: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    resizeTo: window,
  });
  document.getElementById('stage').appendChild(app.canvas);

  // Sky background — repainted per frame.
  const sky = new Graphics();
  app.stage.addChild(sky);

  // World container holds all iso content.
  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);

  const scene = { app, world, windowLights: [] };

  City.renderWorld(world, scene);

  // Ambient-darken overlay: a multiply-blend rect sized to the world bbox.
  // Sits ABOVE the regular content but BELOW window/lamp glow (their zIndex > 100000).
  // Result: at night the world dims while warm lights stay bright.
  const ambientOverlay = new Graphics();
  ambientOverlay.zIndex = 100000;
  ambientOverlay.blendMode = 'multiply';
  world.addChild(ambientOverlay);

  const footprintMask = City.computeFootprintMask();
  const walkable = City.buildWalkability(footprintMask);

  const worldData = {
    buildings: City.BUILDINGS,
    findPath: (s, g) => City.findPath(walkable, s, g),
  };

  const sim = new PCity.Sim(worldData, scene, world);
  sim.spawn();

  // ---------- camera ------------------------------------------------
  function bbox() {
    const minX = -City.MAP_H * TW / 2;
    const maxX =  City.MAP_W * TW / 2 + TW / 2;
    const minY = -90; // track + tallest building above ground
    const maxY = (City.MAP_W + City.MAP_H) * TH / 2 + TH;
    return { minX, maxX, minY, maxY };
  }
  function fit() {
    const b = bbox();
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const sx = app.screen.width / w;
    const sy = app.screen.height / h;
    const s = Math.min(sx, sy) * 0.96;
    world.scale.set(s);
    world.x = app.screen.width  / 2 - (b.minX + b.maxX) / 2 * s;
    world.y = app.screen.height / 2 - (b.minY + b.maxY) / 2 * s;
  }
  fit();
  window.addEventListener('resize', fit);

  // ---------- HUD ----------------------------------------------------
  const clockEl = document.getElementById('clock');
  const speedEls = document.querySelectorAll('[data-speed]');
  const baseSpeed = 24 / 480; // hours per real second; 1 day = 8 min
  let speedMul = 1;

  function updateClock(hour) {
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour - Math.floor(hour)) * 60);
    clockEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function setSpeed(mul) {
    speedMul = mul;
    sim.paused = mul === 0;
    sim.simSpeed = baseSpeed * (mul || 1);
    speedEls.forEach(el => el.classList.toggle('active', +el.dataset.speed === mul));
  }
  speedEls.forEach(el => el.addEventListener('click', () => setSpeed(+el.dataset.speed)));
  setSpeed(1);

  // ---------- ticker -------------------------------------------------
  let last = performance.now();
  app.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    sim.update(dt);

    const t = sim.simHour / 24;
    const ambient = ambientForTime(t);
    const b = bbox();
    ambientOverlay.clear();
    ambientOverlay.rect(b.minX - 50, b.minY - 50, b.maxX - b.minX + 100, b.maxY - b.minY + 100).fill(ambient);

    const nf = nightFactor(t);
    for (const w of scene.windowLights) w.alpha = nf;

    const { top, bot } = RD.skyForTime(t);
    RD.paintSky(sky, top, bot, app.screen.width, app.screen.height);

    updateClock(sim.simHour);
  });
})();
