// Style A — Chunky Cartoon Isometric
// Bold flat colours, simple silhouettes, cell-shaded sides.
(function () {
  const { iso, isoCenter, rgb, darken, lighten, lerpColor, ambientForTime, nightFactor, mulberry32, PathAgent } = PCity;
  const { Application, Container, Graphics } = PIXI;

  const TW = 24, TH = 12;          // tile width / height in pixels
  const STORY_H = 14;              // pixels per building story
  const GW = 10, GH = 10;          // grid size

  // Palette — saturated, friendly.
  const PAL = {
    skyDay:    0x9adcff,
    skyDusk:   0xffb070,
    skyNight:  0x18223f,
    grass:     0x6cc16a,
    grassDark: 0x4ea34d,
    sidewalk:  0xc4bea4,
    sidewalkE: 0xa9a386,
    road:      0x474750,
    roadLine:  0xf0d040,
    treeLeaf:  0x3da55a,
    treeLeafD: 0x2c7e44,
    treeTrunk: 0x6a4626,
    benchWood: 0x8a5a32,
  };

  const BUILDINGS = [
    // [tx, ty, w, h, stories, colour, windowColour]
    [1, 1, 2, 2, 5, 0xe87856, 0x90c8ff],   // top-left orange tower
    [4, 1, 2, 2, 4, 0xf0c84a, 0xa8e0ff],   // top-mid yellow
    [7, 1, 2, 2, 6, 0x4a92e0, 0xe0f0ff],   // top-right tall blue
    [1, 7, 2, 2, 3, 0xd64c5e, 0xfff0a0],   // bottom-left red shorter
    [7, 7, 2, 2, 4, 0x6a78c8, 0xfff0a0],   // bottom-right purple
  ];

  const TREES = [
    { tx: 5,   ty: 7   },
    { tx: 4.2, ty: 8.2 },
    { tx: 5.6, ty: 8.4 },
    { tx: 0.4, ty: 0.4 },
    { tx: 9.4, ty: 0.4 },
    { tx: 0.4, ty: 9.4 },
  ];

  const SIDEWALK_PATHS = [
    // Continuous sidewalk loop along both sides of the road.
    [
      { x: 0.5, y: 3.4 }, { x: 9.5, y: 3.4 }, { x: 9.5, y: 6.6 }, { x: 0.5, y: 6.6 }
    ],
  ];

  function tileType(x, y) {
    if (y === 4 || y === 5) return 'road';
    if (y === 3 || y === 6) return 'sidewalk';
    return 'grass';
  }

  function colourForTile(t) {
    if (t === 'road')     return PAL.road;
    if (t === 'sidewalk') return PAL.sidewalk;
    return PAL.grass;
  }

  // --- drawing helpers --------------------------------------------------
  function drawTile(g, tx, ty, fill, edge) {
    const p = iso(tx, ty, TW, TH);
    g.poly([
      p.x,        p.y,
      p.x + TW/2, p.y + TH/2,
      p.x,        p.y + TH,
      p.x - TW/2, p.y + TH/2
    ]).fill(fill);
    if (edge !== undefined) {
      g.poly([
        p.x,        p.y,
        p.x + TW/2, p.y + TH/2,
        p.x,        p.y + TH,
        p.x - TW/2, p.y + TH/2,
        p.x,        p.y
      ]).stroke({ color: edge, width: 1, alpha: 0.35 });
    }
  }

  function drawRoadMarkings(g) {
    // Dashed yellow line along the centre of the road (between rows 4 and 5).
    for (let tx = 0; tx < GW; tx += 1) {
      if (tx % 2 !== 0) continue;
      const a = iso(tx + 0.1, 5, TW, TH);
      const b = iso(tx + 0.9, 5, TW, TH);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.roadLine, width: 2, alpha: 0.9 });
    }
  }

  function drawBuilding(stage, def, scene) {
    const [tx, ty, w, h, stories, col, winCol] = def;
    const totalH = stories * STORY_H;

    const back  = iso(tx,     ty,     TW, TH);
    const right = iso(tx + w, ty,     TW, TH);
    const front = iso(tx + w, ty + h, TW, TH);
    const left  = iso(tx,     ty + h, TW, TH);

    const cTop   = lighten(col, 0.05);
    const cRight = darken(col, 0.78);
    const cLeft  = darken(col, 0.6);

    const day = new Graphics();
    // Right-facing wall
    day.poly([
      right.x, right.y,
      front.x, front.y,
      front.x, front.y - totalH,
      right.x, right.y - totalH
    ]).fill(cRight);
    // Left-facing wall
    day.poly([
      front.x, front.y,
      left.x,  left.y,
      left.x,  left.y - totalH,
      front.x, front.y - totalH
    ]).fill(cLeft);
    // Roof
    day.poly([
      back.x,  back.y - totalH,
      right.x, right.y - totalH,
      front.x, front.y - totalH,
      left.x,  left.y - totalH
    ]).fill(cTop);
    // Roof edge highlight
    day.poly([
      back.x,  back.y - totalH,
      right.x, right.y - totalH,
      front.x, front.y - totalH,
      left.x,  left.y - totalH,
      back.x,  back.y - totalH
    ]).stroke({ color: lighten(col, 0.2), width: 1, alpha: 0.7 });

    // Day-time windows: dark-ish slits.
    const winDay = darken(col, 0.45);
    drawWindowGrid(day, right, front, totalH, w * 2, winDay, false);
    drawWindowGrid(day, front, left,  totalH, h * 2, winDay, false);

    // Roof detail: an HVAC box on tall buildings.
    if (stories >= 4) {
      const rcx = (back.x + front.x) / 2;
      const rcy = (back.y + front.y) / 2 - totalH;
      day.rect(rcx - 5, rcy - 3, 10, 5).fill(darken(col, 0.55));
      day.rect(rcx - 4, rcy - 4, 3, 1).fill(darken(col, 0.4));
    }

    day.zIndex = (tx + ty) * 10 + 5;
    stage.addChild(day);

    // Night windows — a separate graphic, faded in by setTime.
    const night = new Graphics();
    drawWindowGrid(night, right, front, totalH, w * 2, winCol, true);
    drawWindowGrid(night, front, left,  totalH, h * 2, winCol, true);
    night.zIndex = (tx + ty) * 10 + 6;
    night.alpha = 0;
    stage.addChild(night);
    scene.windowLights.push(night);
  }

  function drawWindowGrid(g, base1, base2, totalH, cols, col, glow) {
    const stories = Math.floor(totalH / STORY_H);
    const winW = 3, winH = 5;
    for (let s = 0; s < stories; s++) {
      const yMid = -(s * STORY_H + STORY_H / 2 + 1);
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const wx = base1.x + u * (base2.x - base1.x) - winW / 2;
        const wy = base1.y + u * (base2.y - base1.y) + yMid - winH / 2;
        if (glow) {
          g.rect(wx - 1, wy - 1, winW + 2, winH + 2).fill({ color: col, alpha: 0.25 });
        }
        g.rect(wx, wy, winW, winH).fill(col);
      }
    }
  }

  function drawTree(stage, t) {
    const c = isoCenter(t.tx, t.ty, TW, TH);
    // Adjust because tx,ty here are not integers — use plain iso.
    const p = iso(t.tx, t.ty, TW, TH);
    const g = new Graphics();
    // trunk
    g.rect(p.x - 1.5, p.y - 4, 3, 8).fill(PAL.treeTrunk);
    // shadow on ground
    g.ellipse(p.x, p.y + 2, 7, 2.5).fill({ color: 0x000000, alpha: 0.18 });
    // leaves (cluster of 3 ellipses)
    g.ellipse(p.x - 3, p.y - 7, 6, 5).fill(PAL.treeLeafD);
    g.ellipse(p.x + 3, p.y - 8, 6, 5).fill(PAL.treeLeafD);
    g.ellipse(p.x,     p.y - 11, 7, 6).fill(PAL.treeLeaf);
    g.zIndex = (t.tx + t.ty) * 10 + 4;
    stage.addChild(g);
  }

  function drawBench(stage, tx, ty) {
    const p = iso(tx, ty, TW, TH);
    const g = new Graphics();
    g.rect(p.x - 7, p.y - 1, 14, 2).fill(PAL.benchWood);
    g.rect(p.x - 7, p.y - 4, 14, 2).fill(darken(PAL.benchWood, 0.7));
    g.rect(p.x - 6, p.y + 1, 1, 2).fill(darken(PAL.benchWood, 0.5));
    g.rect(p.x + 5, p.y + 1, 1, 2).fill(darken(PAL.benchWood, 0.5));
    g.zIndex = (tx + ty) * 10 + 3;
    stage.addChild(g);
  }

  function makePersonSprite(shirt, hair) {
    const g = new Graphics();
    // shadow
    g.ellipse(0, 1, 4, 1.5).fill({ color: 0x000000, alpha: 0.25 });
    // legs (two darker rects)
    g.rect(-2, -3, 1, 3).fill(0x2c2c38);
    g.rect( 1, -3, 1, 3).fill(0x2c2c38);
    // body
    g.rect(-2, -7, 4, 4).fill(shirt);
    // body shading on right side
    g.rect(1, -7, 1, 4).fill(darken(shirt, 0.75));
    // head
    g.rect(-2, -10, 4, 3).fill(0xf3c89a);
    g.rect( 1, -10, 1, 3).fill(darken(0xf3c89a, 0.85));
    // hair cap
    g.rect(-2, -10, 4, 1).fill(hair);
    return g;
  }

  function makeCarSprite(col) {
    const g = new Graphics();
    // shadow
    g.ellipse(0, 1, 14, 3).fill({ color: 0x000000, alpha: 0.25 });
    // body (iso-ish rectangle, drawn flat — chunky style is forgiving)
    g.rect(-12, -5, 24, 6).fill(col);
    g.rect(-12,  1, 24, 1).fill(darken(col, 0.65));
    // roof
    g.rect(-7, -9, 14, 4).fill(darken(col, 0.85));
    // windows
    g.rect(-6, -8, 5, 3).fill(0x9ad0ff);
    g.rect( 1, -8, 5, 3).fill(0x9ad0ff);
    // wheels
    g.rect(-10, 1, 4, 2).fill(0x1b1b22);
    g.rect( 6,  1, 4, 2).fill(0x1b1b22);
    // headlight dot
    g.rect(11, -3, 1, 2).fill(0xfff2a0);
    return g;
  }

  // --- public build -----------------------------------------------------
  PCity.buildChunky = async function (container) {
    const app = new Application();
    await app.init({
      width: 360,
      height: 480,
      backgroundAlpha: 0,
      antialias: false,
      roundPixels: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    container.appendChild(app.canvas);

    // Sky / backdrop — drawn behind world, retinted by setTime.
    const sky = new Graphics();
    app.stage.addChild(sky);
    function paintSky(top, bot) {
      sky.clear();
      // Pixi v8 doesn't have native gradients, so we fake it with horizontal bands.
      const bands = 24;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        const c = lerpColor(top, bot, t);
        sky.rect(0, (i / bands) * 480, 360, 480 / bands + 1).fill(c);
      }
    }

    const world = new Container();
    world.sortableChildren = true;
    // centre the iso scene
    const isoW = (GW + GH) * TW / 2;
    const isoH = (GW + GH) * TH / 2;
    world.x = 360 / 2;
    world.y = (480 - isoH) / 2 + 40;
    app.stage.addChild(world);

    const scene = {
      app,
      world,
      windowLights: [],
      paintSky,
      time: 0.5,
    };

    // Ground tiles (one merged graphic per row keeps things tidy).
    const ground = new Graphics();
    ground.zIndex = 0;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const t = tileType(x, y);
        let col = colourForTile(t);
        // tiny variation on grass
        if (t === 'grass' && ((x + y * 3) % 5 === 0)) col = PAL.grassDark;
        if (t === 'sidewalk' && ((x * 2 + y) % 4 === 0)) col = PAL.sidewalkE;
        const p = iso(x, y, TW, TH);
        ground.poly([
          p.x,        p.y,
          p.x + TW/2, p.y + TH/2,
          p.x,        p.y + TH,
          p.x - TW/2, p.y + TH/2
        ]).fill(col);
      }
    }
    drawRoadMarkings(ground);
    world.addChild(ground);

    // Buildings + their night-light overlays
    for (const b of BUILDINGS) drawBuilding(world, b, scene);

    // Trees & a couple of benches in the park area
    for (const t of TREES) drawTree(world, t);
    drawBench(world, 4.5, 7.5);
    drawBench(world, 5.5, 8.5);

    // --- agents -------------------------------------------------------
    const rng = mulberry32(7);
    const shirts = [0xe04848, 0x4892e0, 0xf0c844, 0x52c878, 0xc862c0, 0xeb7a3a];
    const hairs  = [0x3a2814, 0x6a4626, 0xd6a050, 0x222226];

    const sidewalkLoop = SIDEWALK_PATHS[0];
    const agents = [];
    for (let i = 0; i < 7; i++) {
      // offset each agent along the loop so they spread out
      const offset = i / 7;
      const startIdx = Math.floor(offset * sidewalkLoop.length);
      const a = new PathAgent({
        path: sidewalkLoop,
        speed: 0.7 + rng() * 0.5,
        idleChance: 0.15,
      });
      a.idx = startIdx;
      // jitter starting x/y a bit
      a.x = sidewalkLoop[startIdx].x + (rng() - 0.5) * 0.3;
      a.y = sidewalkLoop[startIdx].y + (rng() - 0.5) * 0.3;
      a.sprite = makePersonSprite(shirts[i % shirts.length], hairs[i % hairs.length]);
      a.sprite.zIndex = 100;
      world.addChild(a.sprite);
      agents.push(a);
    }

    // --- cars on the road --------------------------------------------
    const carColours = [0xd64545, 0x3d8be6, 0xefefef];
    const cars = [];
    for (let i = 0; i < 2; i++) {
      const goingRight = i % 2 === 0;
      const lane = goingRight ? 4.6 : 5.4;
      const path = goingRight
        ? [{ x: -1, y: lane }, { x: GW + 1, y: lane }]
        : [{ x: GW + 1, y: lane }, { x: -1, y: lane }];
      const c = {
        sprite: makeCarSprite(carColours[i % carColours.length]),
        x: goingRight ? -1 + i * 4 : GW + 1 - i * 4,
        y: lane,
        speed: 2.4 + rng() * 0.8,
        dir: goingRight ? 1 : -1,
        lane,
      };
      world.addChild(c.sprite);
      cars.push(c);
    }

    // --- ticker -------------------------------------------------------
    let last = performance.now();
    app.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const a of agents) {
        a.update(dt, now);
        const p = isoCenter(a.x, a.y, TW, TH);
        const bob = Math.sin(a.bobPhase) * 0.6;
        a.sprite.x = p.x;
        a.sprite.y = p.y + bob;
        a.sprite.zIndex = (a.x + a.y) * 10 + 50;
      }

      for (const c of cars) {
        c.x += c.dir * c.speed * dt;
        if (c.dir > 0 && c.x > GW + 1.5) c.x = -1.5;
        if (c.dir < 0 && c.x < -1.5)     c.x = GW + 1.5;
        const p = isoCenter(c.x, c.lane, TW, TH);
        c.sprite.x = p.x;
        c.sprite.y = p.y - 1;
        c.sprite.scale.x = c.dir > 0 ? 1 : -1;
        c.sprite.zIndex = (c.x + c.lane) * 10 + 40;
      }
    });

    // --- time control -------------------------------------------------
    scene.setTime = function (t) {
      scene.time = t;
      const ambient = ambientForTime(t);
      world.tint = ambient;

      // Sky: blend between night, day, and sunset based on time.
      const nf = nightFactor(t);
      // pick base sky depending on time band
      let top, bot;
      if (t < 0.22 || t > 0.86) {
        top = 0x0e1430; bot = 0x2a345a;
      } else if (t < 0.32) {
        // dawn
        top = lerpColor(0x2a345a, 0xff9a78, (t - 0.22) / 0.10);
        bot = lerpColor(0x6e4880, 0xffd0a8, (t - 0.22) / 0.10);
      } else if (t < 0.70) {
        top = PAL.skyDay; bot = lighten(PAL.skyDay, 0.4);
      } else if (t < 0.84) {
        top = lerpColor(PAL.skyDay, 0xff7a4c, (t - 0.70) / 0.14);
        bot = lerpColor(lighten(PAL.skyDay, 0.4), 0xffc080, (t - 0.70) / 0.14);
      } else {
        top = lerpColor(0xff7a4c, 0x0e1430, (t - 0.84) / 0.06);
        bot = lerpColor(0xffc080, 0x2a345a, (t - 0.84) / 0.06);
      }
      paintSky(top, bot);

      for (const w of scene.windowLights) {
        w.alpha = nf;
      }
    };
    scene.setTime(0.375);

    return scene;
  };

  // === CITY VARIANT ===================================================
  // Larger grid, mixed building types, elevated train, tram.

  const CITY_PAL = Object.assign({}, PAL, {
    trackBeam:   0x6b6f78,
    trackRail:   0xb8bcc4,
    trackSleep: 0x5a4030,
    trainBody:   0xc63838,
    trainRoof:   0x802424,
    trainAcc:    0xfff080,
    tramBody:    0xe8c440,
    tramRoof:    0xa8862c,
    tramTrim:    0x4a3a18,
    awning:      0xd64c5e,
    awningAlt:   0x4a92e0,
  });

  // Build defs reused: [tx, ty, w, h, stories, colour, windowColour]
  // Layout: 12 wide × 18 deep
  //   y=0..1  : grass under elevated track (track itself drawn separately)
  //   y=2..6  : top tower row (5 buildings, varying heights)
  //   y=7     : sidewalk
  //   y=8..9  : 2-tile road (with tram tracks)
  //   y=10    : sidewalk
  //   y=11..14: shops + townhouses
  //   y=15    : sidewalk
  //   y=16..17: small park / grass
  const CITY_W = 12, CITY_H = 18;
  const CITY_BUILDINGS = [
    // Top row — office/tower district
    [1,  2, 2, 3, 6, 0xe87856, 0x9ad0ff],
    [4,  2, 2, 3, 5, 0x4a92e0, 0xfff0a0],
    [7,  2, 2, 3, 7, 0x6a78c8, 0xa8e0ff],
    [9,  2, 2, 3, 4, 0xf0c84a, 0xb0e0ff],
    [1,  5, 2, 2, 3, 0x52b0a0, 0xfff0a0],
    [7,  5, 2, 2, 3, 0xd64c5e, 0xfff0a0],
    // Mid row — shops (2 stories)
    [1,  11, 2, 2, 2, 0xe89a4c, 0xfff0a0],
    [4,  11, 2, 2, 2, 0xc862c0, 0xfff0a0],
    [7,  11, 2, 2, 2, 0x4a92e0, 0xfff0a0],
    [9,  11, 2, 2, 2, 0xf0c84a, 0xfff0a0],
    // Bottom row — townhouses (3 stories)
    [1,  13, 2, 2, 3, 0xb86a3a, 0xfff0a0],
    [4,  13, 2, 2, 3, 0x6a8c4a, 0xfff0a0],
    [7,  13, 2, 2, 3, 0xc24838, 0xfff0a0],
    [9,  13, 2, 2, 3, 0xa06840, 0xfff0a0],
  ];

  const CITY_TREES = [
    { tx: 0.4, ty: 0.4 }, { tx: 11.4, ty: 0.4 },
    { tx: 3.5, ty: 0.5 }, { tx: 6.5,  ty: 1.5 },
    { tx: 9.5, ty: 0.5 },
    { tx: 0.4, ty: 16.4 }, { tx: 2.5, ty: 16.5 },
    { tx: 5.5, ty: 16.5 }, { tx: 8.5, ty: 16.4 },
    { tx: 11.4, ty: 16.4 },
    { tx: 3.5, ty: 17.5 }, { tx: 7.5, ty: 17.5 },
  ];

  const CITY_AWNINGS = [
    { tx: 1.0, ty: 13, w: 2, col: 0xd64c5e },
    { tx: 4.0, ty: 13, w: 2, col: 0x4a92e0 },
    { tx: 7.0, ty: 13, w: 2, col: 0xf0c84a },
    { tx: 9.0, ty: 13, w: 2, col: 0x52c878 },
  ];

  function cityTileType(x, y) {
    if (y === 8 || y === 9)        return 'road';
    if (y === 7 || y === 10 || y === 15) return 'sidewalk';
    return 'grass';
  }

  function drawElevatedTrack(stage, gridW, trackRow, ZH) {
    const g = new Graphics();
    // Pillars (back-most first via zIndex)
    for (let x = 0; x <= gridW; x += 2) {
      const p = iso(x, trackRow, TW, TH);
      g.rect(p.x - 2, p.y - ZH, 4, ZH).fill(CITY_PAL.trackBeam);
      g.rect(p.x - 1, p.y - ZH, 1, ZH).fill(darken(CITY_PAL.trackBeam, 0.7));
      g.rect(p.x - 4, p.y - 3,  8, 3).fill(darken(CITY_PAL.trackBeam, 0.6));
    }
    // Deck beam
    const a = iso(0,      trackRow, TW, TH);
    const b = iso(gridW,  trackRow, TW, TH);
    g.poly([
      a.x, a.y - ZH,
      b.x, b.y - ZH,
      b.x, b.y - ZH + 5,
      a.x, a.y - ZH + 5,
    ]).fill(CITY_PAL.trackBeam);
    g.poly([
      a.x, a.y - ZH + 4,
      b.x, b.y - ZH + 4,
      b.x, b.y - ZH + 5,
      a.x, a.y - ZH + 5,
    ]).fill(darken(CITY_PAL.trackBeam, 0.55));
    // Sleepers
    for (let x = 0; x < gridW; x += 0.5) {
      const p = iso(x, trackRow, TW, TH);
      g.rect(p.x - 4, p.y - ZH - 1, 8, 1).fill(CITY_PAL.trackSleep);
    }
    // Two rails
    g.moveTo(a.x, a.y - ZH - 3).lineTo(b.x, b.y - ZH - 3).stroke({ color: CITY_PAL.trackRail, width: 1 });
    g.moveTo(a.x, a.y - ZH - 1).lineTo(b.x, b.y - ZH - 1).stroke({ color: CITY_PAL.trackRail, width: 1 });
    g.zIndex = -10; // drawn behind world content (it's at the back row)
    stage.addChild(g);
  }

  function makeTrainEngine() {
    const g = new Graphics();
    g.ellipse(0, 8, 32, 3).fill({ color: 0x000000, alpha: 0.3 });
    // body
    g.rect(-30, -10, 56, 14).fill(CITY_PAL.trainBody);
    g.rect(-30, -10, 56, 1).fill(lighten(CITY_PAL.trainBody, 0.3));
    g.rect(-30,   3, 56, 1).fill(darken(CITY_PAL.trainBody, 0.5));
    // roof
    g.rect(-26, -16, 52, 6).fill(CITY_PAL.trainRoof);
    g.rect(-26, -16, 52, 1).fill(darken(CITY_PAL.trainRoof, 0.6));
    // window strip
    g.rect(-24, -8, 48, 5).fill(0xa8d0e8);
    for (let x = -22; x < 24; x += 8) {
      g.rect(x, -8, 1, 5).fill(CITY_PAL.trainRoof);
    }
    // streamlined nose
    g.poly([26, -10, 34, -3, 34, 3, 26, 4]).fill(darken(CITY_PAL.trainBody, 0.85));
    g.rect(31, -2, 3, 2).fill(CITY_PAL.trainAcc);
    // wheel bogies
    g.rect(-25, 4, 8, 4).fill(0x18181c);
    g.rect( -8, 4, 8, 4).fill(0x18181c);
    g.rect( 12, 4, 8, 4).fill(0x18181c);
    return g;
  }

  function makeTrainCar() {
    const g = new Graphics();
    g.ellipse(0, 8, 28, 3).fill({ color: 0x000000, alpha: 0.3 });
    g.rect(-26, -10, 52, 14).fill(CITY_PAL.trainBody);
    g.rect(-26, -10, 52, 1).fill(lighten(CITY_PAL.trainBody, 0.3));
    g.rect(-26,   3, 52, 1).fill(darken(CITY_PAL.trainBody, 0.5));
    g.rect(-22, -16, 44, 6).fill(CITY_PAL.trainRoof);
    g.rect(-22, -16, 44, 1).fill(darken(CITY_PAL.trainRoof, 0.6));
    g.rect(-20, -8, 40, 5).fill(0xa8d0e8);
    for (let x = -18; x < 20; x += 8) {
      g.rect(x, -8, 1, 5).fill(CITY_PAL.trainRoof);
    }
    // couplers (just dark bumps at each end)
    g.rect(-28, 0, 2, 2).fill(0x18181c);
    g.rect( 26, 0, 2, 2).fill(0x18181c);
    g.rect(-22, 4, 8, 4).fill(0x18181c);
    g.rect( 14, 4, 8, 4).fill(0x18181c);
    return g;
  }

  function makeTramSprite() {
    const g = new Graphics();
    g.ellipse(0, 1, 18, 3).fill({ color: 0x000000, alpha: 0.3 });
    g.rect(-16, -8, 32, 8).fill(CITY_PAL.tramBody);
    g.rect(-16, -8, 32, 1).fill(lighten(CITY_PAL.tramBody, 0.3));
    g.rect(-16,  0, 32, 1).fill(darken(CITY_PAL.tramBody, 0.55));
    g.rect(-12, -12, 24, 4).fill(CITY_PAL.tramRoof);
    g.rect(-14, -6, 28, 4).fill(0xa8d0e8);
    for (let x = -10; x < 12; x += 6) {
      g.rect(x, -6, 1, 4).fill(CITY_PAL.tramTrim);
    }
    // pantograph
    g.moveTo(0, -12).lineTo(-3, -16).stroke({ color: CITY_PAL.tramTrim, width: 1 });
    g.moveTo(0, -12).lineTo( 3, -16).stroke({ color: CITY_PAL.tramTrim, width: 1 });
    g.rect(-5, -16, 10, 1).fill(CITY_PAL.tramTrim);
    // wheels
    g.rect(-13, 0, 5, 2).fill(0x18181c);
    g.rect(  8, 0, 5, 2).fill(0x18181c);
    return g;
  }

  function drawAwning(stage, a) {
    const p = iso(a.tx, a.ty, TW, TH);
    const right = iso(a.tx + a.w, a.ty, TW, TH);
    const g = new Graphics();
    g.poly([
      p.x,     p.y - 5,
      right.x, right.y - 5,
      right.x, right.y - 1,
      p.x,     p.y - 1,
    ]).fill(a.col);
    g.poly([
      p.x,     p.y - 1,
      right.x, right.y - 1,
      right.x + 1, right.y,
      p.x + 1, p.y,
    ]).fill(darken(a.col, 0.6));
    // stripes
    for (let s = 0; s < a.w * 2; s++) {
      const u = (s + 0.5) / (a.w * 2);
      const x = p.x + u * (right.x - p.x);
      const y = p.y + u * (right.y - p.y);
      g.rect(x - 0.5, y - 4, 1, 3).fill(0xfff0e0);
    }
    g.zIndex = (a.tx + a.ty) * 10 + 2;
    stage.addChild(g);
  }

  PCity.buildChunkyCity = async function (container) {
    const W = 480, H = 720;
    const app = new Application();
    await app.init({
      width: W, height: H,
      backgroundAlpha: 0,
      antialias: false,
      roundPixels: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    container.appendChild(app.canvas);

    const sky = new Graphics();
    app.stage.addChild(sky);
    function paintSky(top, bot) {
      sky.clear();
      const bands = 30;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        sky.rect(0, (i / bands) * H, W, H / bands + 1).fill(lerpColor(top, bot, t));
      }
    }

    const world = new Container();
    world.sortableChildren = true;
    const isoH = (CITY_W + CITY_H) * TH / 2;
    world.x = W / 2;
    world.y = (H - isoH) / 2 + 40;
    app.stage.addChild(world);

    const scene = { app, world, windowLights: [], paintSky, time: 0.5 };

    // Ground
    const ground = new Graphics();
    ground.zIndex = 0;
    for (let y = 0; y < CITY_H; y++) {
      for (let x = 0; x < CITY_W; x++) {
        const t = cityTileType(x, y);
        let col;
        if (t === 'road') col = PAL.road;
        else if (t === 'sidewalk') col = ((x + y) % 4 === 0) ? PAL.sidewalkE : PAL.sidewalk;
        else col = ((x + y * 3) % 5 === 0) ? PAL.grassDark : PAL.grass;
        const p = iso(x, y, TW, TH);
        ground.poly([
          p.x, p.y, p.x + TW/2, p.y + TH/2, p.x, p.y + TH, p.x - TW/2, p.y + TH/2
        ]).fill(col);
      }
    }
    // Road dashed line
    for (let tx = 0; tx < CITY_W; tx += 2) {
      const a = iso(tx + 0.1, 9, TW, TH);
      const b = iso(tx + 0.9, 9, TW, TH);
      ground.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.roadLine, width: 2 });
    }
    // Tram rails along the road centre — silver lines along x at y=8.5 and 9.5
    for (const lane of [8.3, 9.7]) {
      const a = iso(0,       lane, TW, TH);
      const b = iso(CITY_W,  lane, TW, TH);
      ground.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xb0b4bc, width: 1, alpha: 0.8 });
    }
    world.addChild(ground);

    // Elevated track at row 0.5 (front of grass strip)
    drawElevatedTrack(world, CITY_W, 0.5, 36);

    // Buildings
    for (const b of CITY_BUILDINGS) drawBuilding(world, b, scene);

    // Awnings on shop row
    for (const a of CITY_AWNINGS) drawAwning(world, a);

    // Trees
    for (const t of CITY_TREES) drawTree(world, t);

    // Park benches
    drawBench(world, 4.5, 17);
    drawBench(world, 6.5, 17);

    // ---------- agents ------------------------------------------------
    const rng = mulberry32(91);
    const shirts = [0xe04848, 0x4892e0, 0xf0c844, 0x52c878, 0xc862c0, 0xeb7a3a, 0xa84cc8];
    const hairs  = [0x3a2814, 0x6a4626, 0xd6a050, 0x222226];

    // Two sidewalk loops: top (around upper sidewalk) and bottom (around lower sidewalk)
    const topLoop = [
      { x: 0.5, y: 7.4 }, { x: 11.5, y: 7.4 },
      { x: 11.5, y: 10.6 }, { x: 0.5, y: 10.6 },
    ];
    const bottomLoop = [
      { x: 0.5, y: 10.5 }, { x: 11.5, y: 10.5 },
      { x: 11.5, y: 15.4 }, { x: 0.5, y: 15.4 },
    ];

    const agents = [];
    for (let i = 0; i < 14; i++) {
      const path = i % 2 === 0 ? topLoop : bottomLoop;
      const a = new PathAgent({
        path,
        speed: 0.7 + rng() * 0.5,
        idleChance: 0.2,
      });
      a.idx = i % path.length;
      a.x = path[a.idx].x + (rng() - 0.5) * 0.3;
      a.y = path[a.idx].y + (rng() - 0.5) * 0.2;
      a.sprite = makePersonSprite(shirts[i % shirts.length], hairs[i % hairs.length]);
      world.addChild(a.sprite);
      agents.push(a);
    }

    // ---------- vehicles ---------------------------------------------
    const carColours = [0xd64545, 0x3d8be6, 0xefefef, 0x2a2a30];
    const cars = [];
    for (let i = 0; i < 3; i++) {
      const goingRight = i % 2 === 0;
      const lane = goingRight ? 8.45 : 9.55;
      const c = {
        sprite: makeCarSprite(carColours[i % carColours.length]),
        x: goingRight ? -2 + i * 4 : CITY_W + 2 - i * 4,
        y: lane,
        speed: 2.4 + rng() * 0.8,
        dir: goingRight ? 1 : -1,
        lane,
      };
      world.addChild(c.sprite);
      cars.push(c);
    }

    // Tram on the central track lane
    const tram = {
      sprite: makeTramSprite(),
      x: -3,
      lane: 9,
      speed: 2.0,
      dir: 1,
    };
    world.addChild(tram.sprite);

    // ---------- train on the elevated track --------------------------
    const trainContainer = new Container();
    const engine = makeTrainEngine();
    const car1 = makeTrainCar();
    const car2 = makeTrainCar();
    car1.x = -64; car2.x = -126;
    trainContainer.addChild(car2, car1, engine);
    trainContainer.zIndex = 10000; // always on top of everything
    world.addChild(trainContainer);
    const train = {
      container: trainContainer,
      x: -4,
      speed: 4.5,
      dir: 1,
      row: 0.5,
      ZH: 36,
    };

    // ---------- ticker -----------------------------------------------
    let last = performance.now();
    app.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const a of agents) {
        a.update(dt, now);
        const p = isoCenter(a.x, a.y, TW, TH);
        const bob = Math.sin(a.bobPhase) * 0.6;
        a.sprite.x = p.x;
        a.sprite.y = p.y + bob;
        a.sprite.zIndex = (a.x + a.y) * 10 + 50;
      }
      for (const c of cars) {
        c.x += c.dir * c.speed * dt;
        if (c.dir > 0 && c.x > CITY_W + 2) c.x = -2;
        if (c.dir < 0 && c.x < -2)         c.x = CITY_W + 2;
        const p = isoCenter(c.x, c.lane, TW, TH);
        c.sprite.x = p.x;
        c.sprite.y = p.y - 1;
        c.sprite.scale.x = c.dir > 0 ? 1 : -1;
        c.sprite.zIndex = (c.x + c.lane) * 10 + 40;
      }
      tram.x += tram.dir * tram.speed * dt;
      if (tram.x > CITY_W + 4) tram.x = -4;
      {
        const p = isoCenter(tram.x, tram.lane, TW, TH);
        tram.sprite.x = p.x;
        tram.sprite.y = p.y - 2;
        tram.sprite.zIndex = (tram.x + tram.lane) * 10 + 45;
      }

      train.x += train.dir * train.speed * dt;
      if (train.x > CITY_W + 6) train.x = -8;
      {
        const p = iso(train.x, train.row, TW, TH);
        trainContainer.x = p.x;
        trainContainer.y = p.y - train.ZH + 1;
      }
    });

    scene.setTime = function (t) {
      scene.time = t;
      world.tint = ambientForTime(t);
      const nf = nightFactor(t);
      let top, bot;
      if (t < 0.22 || t > 0.86) { top = 0x0e1430; bot = 0x2a345a; }
      else if (t < 0.32) {
        top = lerpColor(0x2a345a, 0xff9a78, (t - 0.22) / 0.10);
        bot = lerpColor(0x6e4880, 0xffd0a8, (t - 0.22) / 0.10);
      } else if (t < 0.70) {
        top = PAL.skyDay; bot = lighten(PAL.skyDay, 0.4);
      } else if (t < 0.84) {
        top = lerpColor(PAL.skyDay, 0xff7a4c, (t - 0.70) / 0.14);
        bot = lerpColor(lighten(PAL.skyDay, 0.4), 0xffc080, (t - 0.70) / 0.14);
      } else {
        top = lerpColor(0xff7a4c, 0x0e1430, (t - 0.84) / 0.06);
        bot = lerpColor(0xffc080, 0x2a345a, (t - 0.84) / 0.06);
      }
      paintSky(top, bot);
      for (const w of scene.windowLights) w.alpha = nf;
    };
    scene.setTime(0.42);

    return scene;
  };
})();
