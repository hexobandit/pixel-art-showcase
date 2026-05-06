// Style C — Top-Down Chibi
// Flat top-down, big-headed characters, sandy paths, cottages.
(function () {
  const { rgb, darken, lighten, lerpColor, ambientForTime, nightFactor, mulberry32, PathAgent } = PCity;
  const { Application, Container, Graphics } = PIXI;

  const TS = 18; // tile size (square)
  const GW = 16, GH = 22;

  const PAL = {
    grassA:    0x6cb150,
    grassB:    0x5c9c44,
    grassC:    0x80c060,
    pathA:     0xe6d28a,
    pathB:     0xd6c074,
    pathEdge:  0xa68a4a,
    water:     0x4ba0d8,
    waterDeep: 0x3580ba,
    waterFoam: 0xa2d0ec,
    wallA:     0xead2a2,
    wallB:     0xcfb682,
    wallShade: 0x8a6e44,
    roofA:     0xb04030,
    roofB:     0x8a2c20,
    roofRidge: 0x66200f,
    door:      0x5a3820,
    treeLeaf:  0x2f7a3a,
    treeLeafL: 0x4ea050,
    treeLeafD: 0x1e5a26,
    treeTrunk: 0x5a3a20,
    flowerR:   0xe04848,
    flowerY:   0xf2d040,
    nightWindow: 0xffe8a0,
  };

  // 'g'=grass, 'p'=path, 'w'=water
  const MAP = [
    'gggggggggggggggg',
    'ggggggggggggggggg',
    'gggggggggggggggg',
    'gghhhggggghhhggg',
    'gghhhggggghhhggg',
    'gghhhggggghhhggg',
    'gghhhggggghhhggg',
    'gggggggggggggggg',
    'ggppppppppppppgg',
    'ggppppppppppppgg',
    'gggggggggggggggg',
    'gghhhgggggghhhgg',
    'gghhhgggggghhhgg',
    'gghhhgggggghhhgg',
    'gghhhgggggghhhgg',
    'gggggggggggggggg',
    'gggwwwwwgggggggg',
    'ggwwwwwwwwggggg',
    'ggwwwwwwwwggggg',
    'gggwwwwwgggggggg',
    'gggggggggggggggg',
    'gggggggggggggggg',
  ];
  function tileAt(x, y) {
    const row = MAP[y];
    if (!row) return 'g';
    const c = row[x];
    return c || 'g';
  }
  function tileTypeOf(c) {
    if (c === 'p') return 'path';
    if (c === 'w') return 'water';
    return 'grass';
  }

  // House definitions (footprint top-left + size)
  const HOUSES = [
    { tx: 2,  ty: 3,  w: 3, h: 4, roof: 0xb04030 },
    { tx: 11, ty: 3,  w: 3, h: 4, roof: 0xc88858 },
    { tx: 2,  ty: 11, w: 3, h: 4, roof: 0x8a5a3a },
    { tx: 12, ty: 11, w: 3, h: 4, roof: 0x6c8c50 },
  ];

  const TREES = [
    { tx: 1,  ty: 1 }, { tx: 14, ty: 1 },
    { tx: 6,  ty: 1 }, { tx: 9,  ty: 2 },
    { tx: 0,  ty: 8 }, { tx: 15, ty: 9 },
    { tx: 7,  ty: 16 }, { tx: 13, ty: 17 }, { tx: 10, ty: 19 },
    { tx: 1,  ty: 20 }, { tx: 14, ty: 20 }, { tx: 6, ty: 20 },
  ];

  const FLOWERS = [
    { tx: 7, ty: 11.5 }, { tx: 8, ty: 11.5 },
    { tx: 7, ty: 12.5 }, { tx: 8, ty: 12.5 },
  ];

  // Movement waypoint loops (in tile coords, centred on path tiles)
  const PATHS = [
    // Long loop along the path going round both blocks
    [
      { x: 2.5, y: 8.5 }, { x: 13.5, y: 8.5 },
      { x: 13.5, y: 9.5 }, { x: 2.5, y: 9.5 },
    ],
    // Around the upper-left house
    [
      { x: 1.5, y: 2.5 }, { x: 5.5, y: 2.5 },
      { x: 5.5, y: 7.5 }, { x: 1.5, y: 7.5 },
    ],
    // Around the upper-right house
    [
      { x: 10.5, y: 2.5 }, { x: 14.5, y: 2.5 },
      { x: 14.5, y: 7.5 }, { x: 10.5, y: 7.5 },
    ],
    // Down by the pond, between cottages and water
    [
      { x: 5.5, y: 15.5 }, { x: 12.5, y: 15.5 },
      { x: 12.5, y: 20.5 }, { x: 5.5, y: 20.5 },
    ],
  ];

  // ---------------------------------------------------------------------
  function drawGround(g, rng) {
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const c = tileAt(x, y);
        const t = tileTypeOf(c);
        let fill;
        if (t === 'path') {
          fill = (x + y) % 2 === 0 ? PAL.pathA : PAL.pathB;
        } else if (t === 'water') {
          fill = (x + y) % 3 === 0 ? PAL.waterDeep : PAL.water;
        } else {
          const r = rng();
          fill = r < 0.15 ? PAL.grassB : (r > 0.85 ? PAL.grassC : PAL.grassA);
        }
        g.rect(x * TS, y * TS, TS, TS).fill(fill);
        // small grass tufts
        if (t === 'grass' && rng() < 0.25) {
          const tx = x * TS + Math.floor(rng() * (TS - 4)) + 1;
          const ty = y * TS + Math.floor(rng() * (TS - 4)) + 1;
          g.rect(tx, ty, 2, 1).fill(PAL.grassB);
          g.rect(tx + 1, ty + 1, 1, 1).fill(PAL.grassC);
        }
      }
    }
  }

  function drawPathEdges(g) {
    // Soft edge between path and grass
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (tileTypeOf(tileAt(x, y)) !== 'path') continue;
        // top neighbour grass?
        if (tileTypeOf(tileAt(x, y - 1)) === 'grass') {
          g.rect(x * TS, y * TS, TS, 1).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
        if (tileTypeOf(tileAt(x, y + 1)) === 'grass') {
          g.rect(x * TS, (y + 1) * TS - 1, TS, 1).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
        if (tileTypeOf(tileAt(x - 1, y)) === 'grass') {
          g.rect(x * TS, y * TS, 1, TS).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
        if (tileTypeOf(tileAt(x + 1, y)) === 'grass') {
          g.rect((x + 1) * TS - 1, y * TS, 1, TS).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
      }
    }
  }

  function drawWaterFoam(g, rng) {
    // little highlights scattered on water
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (tileTypeOf(tileAt(x, y)) !== 'water') continue;
        if (rng() < 0.35) {
          const fx = x * TS + Math.floor(rng() * (TS - 3)) + 1;
          const fy = y * TS + Math.floor(rng() * (TS - 3)) + 1;
          g.rect(fx, fy, 2, 1).fill({ color: PAL.waterFoam, alpha: 0.6 });
        }
      }
    }
  }

  function drawHouse(stage, scene, h) {
    const { tx, ty, w, hh = h.h, roof } = h;
    const x0 = tx * TS, y0 = ty * TS;
    const W = h.w * TS, H = h.h * TS;
    const wall1 = PAL.wallA, wall2 = PAL.wallB;

    const g = new Graphics();
    // shadow
    g.rect(x0 + 2, y0 + H - 2, W, 4).fill({ color: 0x000000, alpha: 0.18 });

    // South wall slice (visible 6px strip at bottom of footprint)
    const wallTop = y0 + H - 7;
    g.rect(x0, wallTop, W, 7).fill(wall1);
    g.rect(x0, wallTop + 5, W, 2).fill(PAL.wallShade);

    // Door
    const doorX = x0 + Math.floor(W / 2) - 2;
    g.rect(doorX, wallTop + 1, 4, 6).fill(PAL.door);
    g.rect(doorX + 3, wallTop + 4, 1, 1).fill(0xf0d040);

    // Windows on either side of door
    g.rect(x0 + 4, wallTop + 1, 4, 3).fill(0x6a90b0);
    g.rect(x0 + 4, wallTop + 1, 4, 1).fill(PAL.wallShade);
    g.rect(x0 + W - 8, wallTop + 1, 4, 3).fill(0x6a90b0);
    g.rect(x0 + W - 8, wallTop + 1, 4, 1).fill(PAL.wallShade);

    // Roof — simple two-slope (gable runs east-west). Two trapezoidal halves meeting at horizontal ridge.
    const ridgeY = y0 + Math.floor((H - 7) * 0.45);
    // upper slope (lighter)
    g.poly([
      x0 + 2,      y0 + 2,
      x0 + W - 2,  y0 + 2,
      x0 + W,      ridgeY,
      x0,          ridgeY,
    ]).fill(lighten(roof, 0.1));
    // lower slope (darker)
    g.poly([
      x0,          ridgeY,
      x0 + W,      ridgeY,
      x0 + W + 2,  wallTop,
      x0 - 2,      wallTop,
    ]).fill(darken(roof, 0.85));
    // ridge line
    g.rect(x0, ridgeY - 1, W, 1).fill(PAL.roofRidge);
    // shingle texture (horizontal lines)
    for (let r = 1; r < 4; r++) {
      const ry = y0 + 2 + (ridgeY - y0 - 2) * (r / 4);
      g.rect(x0 + 2, Math.round(ry), W - 4, 1).fill({ color: PAL.roofRidge, alpha: 0.25 });
    }
    for (let r = 1; r < 3; r++) {
      const ry = ridgeY + (wallTop - ridgeY) * (r / 3);
      g.rect(x0, Math.round(ry), W, 1).fill({ color: 0x000000, alpha: 0.18 });
    }
    // chimney
    g.rect(x0 + W - 6, y0, 3, 5).fill(0x6a4030);
    g.rect(x0 + W - 6, y0, 3, 1).fill(0x3a2018);

    g.zIndex = (ty + h.h) * 100 + 5;
    stage.addChild(g);

    // Window glow at night
    const night = new Graphics();
    night.rect(x0 + 4, wallTop + 1, 4, 3).fill(PAL.nightWindow);
    night.rect(x0 + W - 8, wallTop + 1, 4, 3).fill(PAL.nightWindow);
    night.rect(x0 + 3, wallTop, 6, 5).fill({ color: PAL.nightWindow, alpha: 0.2 });
    night.rect(x0 + W - 9, wallTop, 6, 5).fill({ color: PAL.nightWindow, alpha: 0.2 });
    night.zIndex = (ty + h.h) * 100 + 6;
    night.alpha = 0;
    stage.addChild(night);
    scene.windowLights.push(night);
  }

  function drawTree(stage, t) {
    const cx = (t.tx + 0.5) * TS;
    const cy = (t.ty + 0.5) * TS;
    const g = new Graphics();
    g.ellipse(cx, cy + 4, 9, 3).fill({ color: 0x000000, alpha: 0.28 });
    // trunk
    g.rect(cx - 2, cy + 1, 4, 4).fill(PAL.treeTrunk);
    // canopy
    g.circle(cx, cy - 2, 9).fill(PAL.treeLeafD);
    g.circle(cx - 1, cy - 3, 8).fill(PAL.treeLeaf);
    g.circle(cx + 2, cy - 4, 5).fill(PAL.treeLeafL);
    // dot highlights
    g.rect(cx + 1, cy - 6, 1, 1).fill(lighten(PAL.treeLeafL, 0.4));
    g.rect(cx - 3, cy - 1, 1, 1).fill(lighten(PAL.treeLeafL, 0.4));
    g.zIndex = t.ty * 100 + 50;
    stage.addChild(g);
  }

  function drawFlower(stage, f) {
    const cx = f.tx * TS + TS * 0.5;
    const cy = f.ty * TS + TS * 0.5;
    const g = new Graphics();
    const col = (f.tx + f.ty) % 2 === 0 ? PAL.flowerR : PAL.flowerY;
    g.rect(cx - 1, cy + 1, 1, 2).fill(0x3a6028);
    g.rect(cx, cy - 1, 2, 2).fill(col);
    g.rect(cx, cy - 1, 1, 1).fill(lighten(col, 0.4));
    stage.addChild(g);
  }

  // Top-down chibi person — a few facings.
  function makePerson(skin, shirt, pants, hair) {
    const sprites = {};
    // Each direction is its own Graphics. We'll swap on facing change.
    function base(g) {
      g.ellipse(0, 5, 4, 1.5).fill({ color: 0x000000, alpha: 0.28 });
    }
    // SOUTH (facing camera)
    const s = new Graphics();
    base(s);
    s.rect(-2, 0, 1.5, 3).fill(pants);
    s.rect( 0.5, 0, 1.5, 3).fill(pants);
    s.rect(-2, -3, 4, 3).fill(shirt);
    s.rect(-3, -2, 1, 2).fill(skin); // arm
    s.rect( 2, -2, 1, 2).fill(skin); // arm
    s.circle(0, -6, 3).fill(skin);
    s.rect(-3, -8, 6, 2).fill(hair);
    // eyes
    s.rect(-1.5, -6, 1, 1).fill(0x111118);
    s.rect( 0.5, -6, 1, 1).fill(0x111118);
    sprites.south = s;

    // NORTH (facing away)
    const n = new Graphics();
    base(n);
    n.rect(-2, 0, 1.5, 3).fill(pants);
    n.rect( 0.5, 0, 1.5, 3).fill(pants);
    n.rect(-2, -3, 4, 3).fill(darken(shirt, 0.85));
    n.rect(-3, -2, 1, 2).fill(skin);
    n.rect( 2, -2, 1, 2).fill(skin);
    n.circle(0, -6, 3).fill(hair);
    n.rect(-3, -8, 6, 1).fill(darken(hair, 0.8));
    sprites.north = n;

    // EAST (facing right) — also used flipped for west
    const e = new Graphics();
    base(e);
    e.rect(-1, 0, 1.5, 3).fill(pants);
    e.rect( 0.5, 0, 1.5, 3).fill(darken(pants, 0.8));
    e.rect(-1, -3, 3, 3).fill(shirt);
    e.rect(-1, -3, 3, 1).fill(lighten(shirt, 0.2));
    e.rect( 1, -2, 1, 2).fill(skin);
    e.circle(0, -6, 3).fill(skin);
    e.rect(-2, -8, 5, 2).fill(hair);
    e.rect(1.5, -6, 1, 1).fill(0x111118); // single visible eye
    sprites.east = e;

    return sprites;
  }

  PCity.buildTopdown = async function (container) {
    const app = new Application();
    await app.init({
      width: 360, height: 480,
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
      const bands = 24;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        sky.rect(0, (i / bands) * 480, 360, 480 / bands + 1).fill(lerpColor(top, bot, t));
      }
    }

    const world = new Container();
    world.sortableChildren = true;
    const worldW = GW * TS, worldH = GH * TS;
    world.x = (360 - worldW) / 2;
    world.y = (480 - worldH) / 2;
    app.stage.addChild(world);

    const scene = { app, world, windowLights: [], paintSky, time: 0.5 };

    // Ground
    const ground = new Graphics();
    ground.zIndex = 0;
    const rng = mulberry32(101);
    drawGround(ground, rng);
    drawPathEdges(ground);
    drawWaterFoam(ground, rng);
    world.addChild(ground);

    // Houses
    for (const h of HOUSES) drawHouse(world, scene, h);
    // Trees
    for (const t of TREES) drawTree(world, t);
    // Flowers
    for (const f of FLOWERS) drawFlower(world, f);

    // Water shimmer overlay (re-randomised each second)
    const shimmer = new Graphics();
    shimmer.zIndex = 30;
    world.addChild(shimmer);
    let shimmerTimer = 0;
    function repaintShimmer() {
      shimmer.clear();
      const r = mulberry32(((performance.now() / 600) | 0));
      for (let y = 0; y < GH; y++) {
        for (let x = 0; x < GW; x++) {
          if (tileTypeOf(tileAt(x, y)) !== 'water') continue;
          if (r() < 0.15) {
            const fx = x * TS + Math.floor(r() * (TS - 3)) + 1;
            const fy = y * TS + Math.floor(r() * (TS - 3)) + 1;
            shimmer.rect(fx, fy, 2, 1).fill({ color: PAL.waterFoam, alpha: 0.85 });
          }
        }
      }
    }
    repaintShimmer();

    // Agents
    const agentRng = mulberry32(77);
    const skins  = [0xf0c89a, 0xd9a070, 0xa86c44, 0xefd0a8];
    const shirts = [0xe04848, 0x4a8cd0, 0xf2c440, 0x4ca866, 0xb060c8, 0xee9244, 0xe4dac4];
    const pants  = [0x2a3050, 0x3c2818, 0x222230, 0x4a3a28];
    const hairs  = [0x2a1a10, 0x6a4626, 0xc89048, 0x18181c, 0xa0683a];

    const agents = [];
    for (let i = 0; i < 9; i++) {
      const path = PATHS[i % PATHS.length];
      const startIdx = Math.floor(agentRng() * path.length);
      const a = new PathAgent({
        path,
        speed: 14 + agentRng() * 10, // pixels-per-second feel; tile coords here
        idleChance: 0.2,
      });
      a.idx = startIdx;
      a.x = path[startIdx].x + (agentRng() - 0.5) * 0.3;
      a.y = path[startIdx].y + (agentRng() - 0.5) * 0.3;
      a.speed = 0.9 + agentRng() * 0.6; // tiles/sec
      a.facingDir = 'south';
      a.sprites = makePerson(
        skins[i % skins.length],
        shirts[i % shirts.length],
        pants[i % pants.length],
        hairs[i % hairs.length]
      );
      a.container = new Container();
      a.container.addChild(a.sprites.south);
      a.currentSprite = a.sprites.south;
      world.addChild(a.container);
      agents.push(a);
    }

    function setFacing(a, dir, flipX) {
      const target = a.sprites[dir] || a.sprites.south;
      if (a.currentSprite !== target) {
        a.container.removeChild(a.currentSprite);
        a.container.addChild(target);
        a.currentSprite = target;
      }
      a.container.scale.x = flipX ? -1 : 1;
    }

    let last = performance.now();
    app.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      shimmerTimer += dt;
      if (shimmerTimer > 0.45) {
        shimmerTimer = 0;
        repaintShimmer();
      }

      for (const a of agents) {
        a.update(dt, now);
        // facing from velocity direction
        const target = a.path[(a.idx + 1) % a.path.length];
        const dx = target.x - a.x, dy = target.y - a.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          setFacing(a, 'east', dx < 0);
        } else if (dy > 0) {
          setFacing(a, 'south', false);
        } else {
          setFacing(a, 'north', false);
        }
        const px = a.x * TS;
        const py = a.y * TS;
        const bob = Math.sin(a.bobPhase) * 0.7;
        a.container.x = px;
        a.container.y = py + bob;
        a.container.zIndex = py | 0;
      }
    });

    scene.setTime = function (t) {
      scene.time = t;
      world.tint = ambientForTime(t);
      const nf = nightFactor(t);
      let top, bot;
      if (t < 0.22 || t > 0.86) {
        top = 0x101a3a; bot = 0x223060;
      } else if (t < 0.32) {
        top = lerpColor(0x223060, 0xf08c70, (t - 0.22) / 0.10);
        bot = lerpColor(0x6a4878, 0xffd09a, (t - 0.22) / 0.10);
      } else if (t < 0.70) {
        top = 0x88c4e0; bot = 0xb8e0f0;
      } else if (t < 0.84) {
        top = lerpColor(0x88c4e0, 0xe07040, (t - 0.70) / 0.14);
        bot = lerpColor(0xb8e0f0, 0xffb878, (t - 0.70) / 0.14);
      } else {
        top = lerpColor(0xe07040, 0x101a3a, (t - 0.84) / 0.06);
        bot = lerpColor(0xffb878, 0x223060, (t - 0.84) / 0.06);
      }
      paintSky(top, bot);
      for (const w of scene.windowLights) w.alpha = nf;
    };
    scene.setTime(0.375);

    return scene;
  };

  // === CITY (TOWN) VARIANT =============================================

  const CITY_TS = 16;
  const CITY_GW = 22;
  const CITY_GH = 30;

  function buildCityMap() {
    const map = [];
    for (let y = 0; y < CITY_GH; y++) {
      let row = '';
      for (let x = 0; x < CITY_GW; x++) {
        // horizontal paths
        if ((y === 9 || y === 10 || y === 15 || y === 16) && x > 1 && x < CITY_GW - 2) {
          row += 'p';
          continue;
        }
        // vertical connectors
        if (((x === 11) || (x === 12)) && y > 8 && y < 17) {
          row += 'p';
          continue;
        }
        // pond (lower-left lobed)
        const dx = x - 5, dy = y - 24;
        if (dx * dx + dy * dy * 1.6 < 14) { row += 'w'; continue; }
        row += 'g';
      }
      map.push(row);
    }
    return map;
  }

  function cityTileAt(map, x, y) {
    const row = map[y];
    if (!row) return 'g';
    return row[x] || 'g';
  }

  function drawCityGround(stage, map, rng) {
    const g = new Graphics();
    for (let y = 0; y < CITY_GH; y++) {
      for (let x = 0; x < CITY_GW; x++) {
        const c = cityTileAt(map, x, y);
        const t = tileTypeOf(c);
        let fill;
        if (t === 'path') {
          fill = (x + y) % 2 === 0 ? PAL.pathA : PAL.pathB;
        } else if (t === 'water') {
          fill = (x + y) % 3 === 0 ? PAL.waterDeep : PAL.water;
        } else {
          const r = rng();
          fill = r < 0.15 ? PAL.grassB : (r > 0.85 ? PAL.grassC : PAL.grassA);
        }
        g.rect(x * CITY_TS, y * CITY_TS, CITY_TS, CITY_TS).fill(fill);
        if (t === 'grass' && rng() < 0.22) {
          const tx = x * CITY_TS + Math.floor(rng() * (CITY_TS - 4)) + 1;
          const ty = y * CITY_TS + Math.floor(rng() * (CITY_TS - 4)) + 1;
          g.rect(tx, ty, 2, 1).fill(PAL.grassB);
          g.rect(tx + 1, ty + 1, 1, 1).fill(PAL.grassC);
        }
      }
    }
    // Path edges
    for (let y = 0; y < CITY_GH; y++) {
      for (let x = 0; x < CITY_GW; x++) {
        if (tileTypeOf(cityTileAt(map, x, y)) !== 'path') continue;
        if (tileTypeOf(cityTileAt(map, x, y - 1)) === 'grass') {
          g.rect(x * CITY_TS, y * CITY_TS, CITY_TS, 1).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
        if (tileTypeOf(cityTileAt(map, x, y + 1)) === 'grass') {
          g.rect(x * CITY_TS, (y + 1) * CITY_TS - 1, CITY_TS, 1).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
        if (tileTypeOf(cityTileAt(map, x - 1, y)) === 'grass') {
          g.rect(x * CITY_TS, y * CITY_TS, 1, CITY_TS).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
        if (tileTypeOf(cityTileAt(map, x + 1, y)) === 'grass') {
          g.rect((x + 1) * CITY_TS - 1, y * CITY_TS, 1, CITY_TS).fill({ color: PAL.pathEdge, alpha: 0.6 });
        }
      }
    }
    // Static water foam
    for (let y = 0; y < CITY_GH; y++) {
      for (let x = 0; x < CITY_GW; x++) {
        if (tileTypeOf(cityTileAt(map, x, y)) !== 'water') continue;
        if (rng() < 0.3) {
          const fx = x * CITY_TS + Math.floor(rng() * (CITY_TS - 3)) + 1;
          const fy = y * CITY_TS + Math.floor(rng() * (CITY_TS - 3)) + 1;
          g.rect(fx, fy, 2, 1).fill({ color: PAL.waterFoam, alpha: 0.6 });
        }
      }
    }
    g.zIndex = 0;
    stage.addChild(g);
  }

  // Custom drawHouse that respects CITY_TS (not module-level TS).
  function drawCityHouse(stage, scene, h) {
    const TS = CITY_TS;
    const x0 = h.tx * TS, y0 = h.ty * TS;
    const W = h.w * TS, H = h.hh ? h.hh * TS : h.h * TS;
    const wall1 = PAL.wallA;

    const g = new Graphics();
    g.rect(x0 + 2, y0 + H - 2, W, 4).fill({ color: 0x000000, alpha: 0.18 });
    const wallTop = y0 + H - 8;
    g.rect(x0, wallTop, W, 8).fill(wall1);
    g.rect(x0, wallTop + 6, W, 2).fill(PAL.wallShade);

    // Door
    const doorX = x0 + Math.floor(W / 2) - 2;
    g.rect(doorX, wallTop + 1, 4, 7).fill(PAL.door);
    g.rect(doorX + 3, wallTop + 4, 1, 1).fill(0xf0d040);

    // Windows
    g.rect(x0 + 4, wallTop + 2, 4, 3).fill(0x6a90b0);
    g.rect(x0 + 4, wallTop + 2, 4, 1).fill(PAL.wallShade);
    g.rect(x0 + W - 8, wallTop + 2, 4, 3).fill(0x6a90b0);
    g.rect(x0 + W - 8, wallTop + 2, 4, 1).fill(PAL.wallShade);

    // Roof
    const ridgeY = y0 + Math.floor((H - 8) * 0.45);
    g.poly([
      x0 + 2,     y0 + 2,
      x0 + W - 2, y0 + 2,
      x0 + W,     ridgeY,
      x0,         ridgeY,
    ]).fill(lighten(h.roof, 0.1));
    g.poly([
      x0,         ridgeY,
      x0 + W,     ridgeY,
      x0 + W + 2, wallTop,
      x0 - 2,     wallTop,
    ]).fill(darken(h.roof, 0.85));
    g.rect(x0, ridgeY - 1, W, 1).fill(PAL.roofRidge);
    for (let r = 1; r < 4; r++) {
      const ry = y0 + 2 + (ridgeY - y0 - 2) * (r / 4);
      g.rect(x0 + 2, Math.round(ry), W - 4, 1).fill({ color: PAL.roofRidge, alpha: 0.25 });
    }
    for (let r = 1; r < 3; r++) {
      const ry = ridgeY + (wallTop - ridgeY) * (r / 3);
      g.rect(x0, Math.round(ry), W, 1).fill({ color: 0x000000, alpha: 0.18 });
    }
    g.rect(x0 + W - 6, y0, 3, 5).fill(0x6a4030);
    g.rect(x0 + W - 6, y0, 3, 1).fill(0x3a2018);

    g.zIndex = (h.ty + h.h) * 100 + 5;
    stage.addChild(g);

    // Window glow
    const night = new Graphics();
    night.rect(x0 + 4, wallTop + 2, 4, 3).fill(PAL.nightWindow);
    night.rect(x0 + W - 8, wallTop + 2, 4, 3).fill(PAL.nightWindow);
    night.rect(x0 + 3, wallTop + 1, 6, 5).fill({ color: PAL.nightWindow, alpha: 0.2 });
    night.rect(x0 + W - 9, wallTop + 1, 6, 5).fill({ color: PAL.nightWindow, alpha: 0.2 });
    night.zIndex = (h.ty + h.h) * 100 + 6;
    night.alpha = 0;
    stage.addChild(night);
    scene.windowLights.push(night);
  }

  function drawCityTree(stage, t) {
    const cx = (t.tx + 0.5) * CITY_TS;
    const cy = (t.ty + 0.5) * CITY_TS;
    const g = new Graphics();
    g.ellipse(cx, cy + 4, 8, 3).fill({ color: 0x000000, alpha: 0.28 });
    g.rect(cx - 2, cy + 1, 4, 4).fill(PAL.treeTrunk);
    g.circle(cx, cy - 2, 8).fill(PAL.treeLeafD);
    g.circle(cx - 1, cy - 3, 7).fill(PAL.treeLeaf);
    g.circle(cx + 2, cy - 4, 4).fill(PAL.treeLeafL);
    g.rect(cx + 1, cy - 6, 1, 1).fill(lighten(PAL.treeLeafL, 0.4));
    g.rect(cx - 3, cy - 1, 1, 1).fill(lighten(PAL.treeLeafL, 0.4));
    g.zIndex = t.ty * 100 + 50;
    stage.addChild(g);
  }

  function drawCityFlower(stage, f) {
    const cx = f.tx * CITY_TS + CITY_TS * 0.5;
    const cy = f.ty * CITY_TS + CITY_TS * 0.5;
    const g = new Graphics();
    const col = (f.tx + f.ty) % 2 === 0 ? PAL.flowerR : PAL.flowerY;
    g.rect(cx - 1, cy + 1, 1, 2).fill(0x3a6028);
    g.rect(cx, cy - 1, 2, 2).fill(col);
    g.rect(cx, cy - 1, 1, 1).fill(lighten(col, 0.4));
    stage.addChild(g);
  }

  function drawTrainTracksTD(stage, x0, x1, yCenter) {
    const g = new Graphics();
    const sleeper = 0x4a3220, sleeperD = 0x2a1810;
    const rail = 0xb8bcc4, railD = 0x707478;
    const halfTrack = 7;
    // ballast bed
    g.rect(x0, yCenter - halfTrack - 2, x1 - x0, halfTrack * 2 + 4).fill(0x4e4e4e);
    g.rect(x0, yCenter - halfTrack - 2, x1 - x0, 1).fill(0x666666);
    g.rect(x0, yCenter + halfTrack + 1, x1 - x0, 1).fill(0x303030);
    // sleepers
    for (let x = x0 + 1; x < x1; x += 6) {
      g.rect(x, yCenter - halfTrack, 4, halfTrack * 2).fill(sleeper);
      g.rect(x, yCenter + halfTrack - 1, 4, 1).fill(sleeperD);
    }
    // rails
    g.rect(x0, yCenter - 5, x1 - x0, 1).fill(rail);
    g.rect(x0, yCenter - 4, x1 - x0, 1).fill(railD);
    g.rect(x0, yCenter + 4, x1 - x0, 1).fill(rail);
    g.rect(x0, yCenter + 5, x1 - x0, 1).fill(railD);
    g.zIndex = 5;
    stage.addChild(g);
  }

  function makeTrainEngineTD() {
    const body = 0x5a2a18, bodyL = 0x80442e, bodyD = 0x3a1808;
    const accent = 0xc0a040;
    const g = new Graphics();
    g.rect(-22, -9, 44, 18).fill({ color: 0x000000, alpha: 0 });
    // shadow
    g.rect(-20, 8, 40, 2).fill({ color: 0x000000, alpha: 0.4 });
    // main body
    g.rect(-20, -7, 40, 14).fill(body);
    g.rect(-20, -7, 40, 1).fill(bodyL);
    g.rect(-20,  6, 40, 1).fill(bodyD);
    // top stripe
    g.rect(-18, -3, 36, 1).fill(accent);
    g.rect(-18,  3, 36, 1).fill(accent);
    // cab (rear)
    g.rect(-20, -7, 8, 14).fill(0x3a1808);
    g.rect(-19, -6, 6, 4).fill(0xa8d0e8);
    g.rect(-19,  3, 6, 4).fill(0xa8d0e8);
    // smokestack
    g.circle(-6, 0, 3.5).fill(0x18181c);
    g.circle(-6, 0, 2.5).fill(0x4a3a2a);
    g.circle(-6, -0.5, 1).fill(0x6a5a4a);
    // mid vents
    g.rect(2, -4, 4, 1).fill(bodyD);
    g.rect(2,  3, 4, 1).fill(bodyD);
    // headlight + cowcatcher (front)
    g.rect(20, -3, 3, 6).fill(bodyD);
    g.rect(22, -2, 1, 4).fill(0xfff080);
    g.poly([23, -3, 26, 0, 23, 3]).fill(0x18181c);
    // wheels
    for (const wx of [-15, -8, -1, 6, 13]) {
      g.circle(wx, -8, 2.2).fill(0x18181c);
      g.circle(wx, -8, 1).fill(0x404048);
      g.circle(wx,  8, 2.2).fill(0x18181c);
      g.circle(wx,  8, 1).fill(0x404048);
    }
    return g;
  }

  function makeTrainCarTD(col) {
    const body = col, bodyL = lighten(col, 0.2), bodyD = darken(col, 0.7);
    const accent = 0xead2a2;
    const g = new Graphics();
    g.rect(-20, 8, 40, 2).fill({ color: 0x000000, alpha: 0.4 });
    g.rect(-20, -7, 40, 14).fill(body);
    g.rect(-20, -7, 40, 1).fill(bodyL);
    g.rect(-20,  6, 40, 1).fill(bodyD);
    g.rect(-18, -3, 36, 1).fill(accent);
    g.rect(-18,  3, 36, 1).fill(accent);
    // windows on top
    for (let wx = -16; wx < 16; wx += 6) {
      g.rect(wx, -5, 4, 4).fill(0xa8d0e8);
      g.rect(wx, -5, 4, 1).fill(0x6a8898);
    }
    // doors
    g.rect(-2, -5, 4, 10).fill(bodyD);
    g.rect(-1, -4, 2, 8).fill(darken(body, 0.85));
    // wheels
    for (const wx of [-14, -7, 7, 14]) {
      g.circle(wx, -8, 2).fill(0x18181c);
      g.circle(wx, -8, 0.8).fill(0x404048);
      g.circle(wx,  8, 2).fill(0x18181c);
      g.circle(wx,  8, 0.8).fill(0x404048);
    }
    // couplers
    g.rect(-22, -1, 2, 2).fill(0x18181c);
    g.rect( 20, -1, 2, 2).fill(0x18181c);
    return g;
  }

  function drawStation(stage, scene, tx, ty) {
    const TS = CITY_TS;
    const x0 = tx * TS, y0 = ty * TS;
    const W = 5 * TS, H = 3 * TS;
    const g = new Graphics();
    g.rect(x0 + 2, y0 + H - 1, W, 3).fill({ color: 0x000000, alpha: 0.18 });
    // platform (lighter strip in front)
    g.rect(x0 - 4, y0 - 6, W + 8, 6).fill(0xb8b0a0);
    g.rect(x0 - 4, y0 - 6, W + 8, 1).fill(0x8a8270);
    g.rect(x0 - 4, y0 - 1, W + 8, 1).fill(0x6a6450);
    // building wall
    g.rect(x0, y0, W, H - 6).fill(PAL.wallA);
    g.rect(x0, y0, W, 1).fill(darken(PAL.wallA, 0.7));
    g.rect(x0, y0 + H - 7, W, 1).fill(PAL.wallShade);
    // door (centre)
    g.rect(x0 + W/2 - 3, y0 + 4, 6, H - 11).fill(PAL.door);
    g.rect(x0 + W/2 + 2, y0 + 4 + (H - 11)/2, 1, 1).fill(0xf0d040);
    // windows
    g.rect(x0 + 6, y0 + 6, 6, 5).fill(0x6a90b0);
    g.rect(x0 + 6, y0 + 6, 6, 1).fill(PAL.wallShade);
    g.rect(x0 + W - 12, y0 + 6, 6, 5).fill(0x6a90b0);
    g.rect(x0 + W - 12, y0 + 6, 6, 1).fill(PAL.wallShade);
    // roof — hipped, dark slate
    g.poly([
      x0 - 2, y0 - 1,
      x0 + W + 2, y0 - 1,
      x0 + W + 2, y0 + 4,
      x0 - 2, y0 + 4,
    ]).fill(0x4a4854);
    g.rect(x0 - 2, y0 - 1, W + 4, 1).fill(0x303040);
    g.rect(x0 - 2, y0 + 3, W + 4, 1).fill(0x303040);
    // sign
    g.rect(x0 + W/2 - 6, y0 + 1, 12, 3).fill(0x6a4030);
    g.rect(x0 + W/2 - 5, y0 + 2, 10, 1).fill(0xead2a2);
    // clock face
    g.circle(x0 + W/2, y0 + 3, 2).fill(0xead2a2);
    g.rect(x0 + W/2, y0 + 1.5, 1, 1.5).fill(0x222222);
    g.rect(x0 + W/2, y0 + 3, 1.5, 1).fill(0x222222);

    g.zIndex = (ty + 3) * 100 + 5;
    stage.addChild(g);

    // window glow
    const night = new Graphics();
    night.rect(x0 + 6, y0 + 6, 6, 5).fill(PAL.nightWindow);
    night.rect(x0 + W - 12, y0 + 6, 6, 5).fill(PAL.nightWindow);
    night.rect(x0 + 5, y0 + 5, 8, 7).fill({ color: PAL.nightWindow, alpha: 0.2 });
    night.rect(x0 + W - 13, y0 + 5, 8, 7).fill({ color: PAL.nightWindow, alpha: 0.2 });
    // platform lamp pools
    night.ellipse(x0 + 4, y0 - 3, 8, 4).fill({ color: PAL.nightWindow, alpha: 0.25 });
    night.ellipse(x0 + W - 4, y0 - 3, 8, 4).fill({ color: PAL.nightWindow, alpha: 0.25 });
    night.zIndex = (ty + 3) * 100 + 6;
    night.alpha = 0;
    stage.addChild(night);
    scene.windowLights.push(night);
  }

  function drawBridge(stage, x0, x1, yCenter) {
    const g = new Graphics();
    const w = x1 - x0;
    g.rect(x0, yCenter - 4, w, 9).fill(0x6a4626);
    g.rect(x0, yCenter - 4, w, 1).fill(0x4a3220);
    g.rect(x0, yCenter + 4, w, 1).fill(0x2a1810);
    // planks
    for (let p = x0 + 2; p < x1; p += 4) {
      g.rect(p, yCenter - 4, 1, 9).fill(0x4a3220);
    }
    // railings
    g.rect(x0, yCenter - 6, w, 1).fill(0x4a3220);
    g.rect(x0, yCenter + 5, w, 1).fill(0x4a3220);
    for (let p = x0; p <= x1; p += 5) {
      g.rect(p, yCenter - 6, 1, 2).fill(0x4a3220);
      g.rect(p, yCenter + 5, 1, 2).fill(0x4a3220);
    }
    g.zIndex = 25 * 100 + 10;
    stage.addChild(g);
  }

  PCity.buildTopdownCity = async function (container) {
    const W = 360, H = 540;
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
      const bands = 24;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        sky.rect(0, (i / bands) * H, W, H / bands + 1).fill(lerpColor(top, bot, t));
      }
    }

    const world = new Container();
    world.sortableChildren = true;
    const worldW = CITY_GW * CITY_TS, worldH = CITY_GH * CITY_TS;
    world.x = (W - worldW) / 2;
    world.y = (H - worldH) / 2;
    app.stage.addChild(world);

    const scene = { app, world, windowLights: [], paintSky, time: 0.5 };

    const map = buildCityMap();
    const rng = mulberry32(202);
    drawCityGround(world, map, rng);

    // Train tracks at the top — runs across full width at y=1.5 tiles
    const trackY = 1.5 * CITY_TS;
    drawTrainTracksTD(world, 0, worldW, trackY);

    // Train station near right edge
    drawStation(world, scene, 14, 3);

    // Houses
    const HOUSES = [
      // Top row (between station and tracks)
      { tx: 1,  ty: 4, w: 3, h: 4, roof: 0xb04030 },
      { tx: 5,  ty: 4, w: 3, h: 4, roof: 0xc88858 },
      { tx: 9,  ty: 4, w: 3, h: 4, roof: 0x8a5a3a },
      // (station at 14,3 already drawn)
      // Middle commercial row (y=11)
      { tx: 1,   ty: 11, w: 4, h: 3, roof: 0x6a8aa6 }, // shop
      { tx: 6,   ty: 11, w: 3, h: 3, roof: 0xa84050 },
      { tx: 14,  ty: 11, w: 3, h: 3, roof: 0xc88858 },
      { tx: 18,  ty: 11, w: 3, h: 3, roof: 0x6c8c50 },
      // Bottom row (y=17)
      { tx: 13, ty: 17, w: 3, h: 4, roof: 0x8a5a3a },
      { tx: 17, ty: 17, w: 3, h: 4, roof: 0xb04030 },
      // Far bottom
      { tx: 13, ty: 23, w: 3, h: 4, roof: 0xc88858 },
      { tx: 17, ty: 23, w: 3, h: 4, roof: 0x6c8c50 },
    ];
    for (const h of HOUSES) drawCityHouse(world, scene, h);

    // Trees scattered
    const TREES = [
      { tx: 0,  ty: 0  }, { tx: 21, ty: 0 },
      { tx: 0,  ty: 12 }, { tx: 21, ty: 12 },
      { tx: 0,  ty: 19 }, { tx: 21, ty: 19 },
      { tx: 4,  ty: 19 }, { tx: 8,  ty: 19 },
      { tx: 11, ty: 22 }, { tx: 21, ty: 27 },
      { tx: 14, ty: 28 }, { tx: 18, ty: 28 },
      { tx: 9,  ty: 28 }, { tx: 6,  ty: 28 },
      { tx: 1,  ty: 28 }, { tx: 0,  ty: 21 },
    ];
    for (const t of TREES) drawCityTree(world, t);

    // Flower beds — small splashes
    const FLOWERS = [];
    for (let i = 0; i < 16; i++) {
      FLOWERS.push({ tx: 11 + (i % 4) * 0.4, ty: 9 + (i / 4 | 0) * 0.4 });
    }
    for (const f of FLOWERS) drawCityFlower(world, f);

    // Bridge over pond
    drawBridge(world, 4 * CITY_TS, 8 * CITY_TS, 24 * CITY_TS + 8);

    // Water shimmer
    const shimmer = new Graphics();
    shimmer.zIndex = 30;
    world.addChild(shimmer);
    let shimmerTimer = 0;
    function repaintShimmer() {
      shimmer.clear();
      const r = mulberry32(((performance.now() / 600) | 0) + 5);
      for (let y = 0; y < CITY_GH; y++) {
        for (let x = 0; x < CITY_GW; x++) {
          if (tileTypeOf(cityTileAt(map, x, y)) !== 'water') continue;
          if (r() < 0.18) {
            const fx = x * CITY_TS + Math.floor(r() * (CITY_TS - 3)) + 1;
            const fy = y * CITY_TS + Math.floor(r() * (CITY_TS - 3)) + 1;
            shimmer.rect(fx, fy, 2, 1).fill({ color: PAL.waterFoam, alpha: 0.85 });
          }
        }
      }
    }
    repaintShimmer();

    // ---------- agents ------------------------------------------------
    const aRng = mulberry32(909);
    const skins  = [0xf0c89a, 0xd9a070, 0xa86c44, 0xefd0a8];
    const shirts = [0xe04848, 0x4a8cd0, 0xf2c440, 0x4ca866, 0xb060c8, 0xee9244, 0xe4dac4];
    const pants  = [0x2a3050, 0x3c2818, 0x222230, 0x4a3a28];
    const hairs  = [0x2a1a10, 0x6a4626, 0xc89048, 0x18181c, 0xa0683a];

    const PATHS = [
      // Long horizontal path top
      [
        { x: 2.5, y: 9.5 }, { x: 19.5, y: 9.5 },
        { x: 19.5, y: 10.5 }, { x: 2.5, y: 10.5 },
      ],
      // Long horizontal path bottom
      [
        { x: 2.5, y: 15.5 }, { x: 19.5, y: 15.5 },
        { x: 19.5, y: 16.5 }, { x: 2.5, y: 16.5 },
      ],
      // Vertical connector
      [
        { x: 11.5, y: 9.5 }, { x: 11.5, y: 16.5 },
        { x: 12.5, y: 16.5 }, { x: 12.5, y: 9.5 },
      ],
      // Loop around top-left house
      [
        { x: 0.5, y: 3.5 }, { x: 4.5, y: 3.5 },
        { x: 4.5, y: 8.5 }, { x: 0.5, y: 8.5 },
      ],
      // Pond/bridge stroll
      [
        { x: 4.5, y: 22.5 }, { x: 8.5, y: 22.5 },
        { x: 8.5, y: 25.5 }, { x: 4.5, y: 25.5 },
      ],
    ];

    const agents = [];
    for (let i = 0; i < 14; i++) {
      const path = PATHS[i % PATHS.length];
      const startIdx = Math.floor(aRng() * path.length);
      const a = new PathAgent({
        path,
        speed: 0.9 + aRng() * 0.5,
        idleChance: 0.22,
      });
      a.idx = startIdx;
      a.x = path[startIdx].x + (aRng() - 0.5) * 0.3;
      a.y = path[startIdx].y + (aRng() - 0.5) * 0.3;
      a.sprites = makePerson(
        skins[i % skins.length],
        shirts[i % shirts.length],
        pants[i % pants.length],
        hairs[i % hairs.length]
      );
      a.container = new Container();
      a.container.addChild(a.sprites.south);
      a.currentSprite = a.sprites.south;
      world.addChild(a.container);
      agents.push(a);
    }

    function setFacing(a, dir, flipX) {
      const target = a.sprites[dir] || a.sprites.south;
      if (a.currentSprite !== target) {
        a.container.removeChild(a.currentSprite);
        a.container.addChild(target);
        a.currentSprite = target;
      }
      a.container.scale.x = flipX ? -1 : 1;
    }

    // Train: engine + 3 cars on top tracks
    const trainContainer = new Container();
    const engine = makeTrainEngineTD();
    const car1 = makeTrainCarTD(0xc6c6d2);
    const car2 = makeTrainCarTD(0xc6c6d2);
    const car3 = makeTrainCarTD(0xa86048);
    car1.x = -44; car2.x = -88; car3.x = -132;
    trainContainer.addChild(car3, car2, car1, engine);
    trainContainer.zIndex = 1000;
    world.addChild(trainContainer);
    const train = {
      container: trainContainer,
      x: -180,
      y: trackY,
      speed: 60, // pixels per second
      dir: 1,
    };

    // Pause schedule for the train (picks up at the station every loop)
    let trainStopUntil = 0;

    // ---------- ticker -----------------------------------------------
    let last = performance.now();
    app.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      shimmerTimer += dt;
      if (shimmerTimer > 0.5) { shimmerTimer = 0; repaintShimmer(); }

      for (const a of agents) {
        a.update(dt, now);
        const target = a.path[(a.idx + 1) % a.path.length];
        const dx = target.x - a.x, dy = target.y - a.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          setFacing(a, 'east', dx < 0);
        } else if (dy > 0) {
          setFacing(a, 'south', false);
        } else {
          setFacing(a, 'north', false);
        }
        const px = a.x * CITY_TS;
        const py = a.y * CITY_TS;
        const bob = Math.sin(a.bobPhase) * 0.7;
        a.container.x = px;
        a.container.y = py + bob;
        a.container.zIndex = py | 0;
      }

      // Train logic
      if (now > trainStopUntil) {
        train.x += train.dir * train.speed * dt;
        // station stop near x=15 tiles
        const stationX = 15 * CITY_TS;
        if (train.dir > 0 && train.x > stationX - 6 && train.x < stationX + 6 && trainStopUntil < now - 2000) {
          // arrived — pause
          if (Math.abs(train.x - stationX) < train.speed * dt + 1) {
            trainStopUntil = now + 3500;
          }
        }
        if (train.x > worldW + 200) train.x = -180;
      }
      trainContainer.x = train.x;
      trainContainer.y = train.y;
    });

    scene.setTime = function (t) {
      scene.time = t;
      world.tint = ambientForTime(t);
      const nf = nightFactor(t);
      let top, bot;
      if (t < 0.22 || t > 0.86) { top = 0x101a3a; bot = 0x223060; }
      else if (t < 0.32) {
        top = lerpColor(0x223060, 0xf08c70, (t - 0.22) / 0.10);
        bot = lerpColor(0x6a4878, 0xffd09a, (t - 0.22) / 0.10);
      } else if (t < 0.70) {
        top = 0x88c4e0; bot = 0xb8e0f0;
      } else if (t < 0.84) {
        top = lerpColor(0x88c4e0, 0xe07040, (t - 0.70) / 0.14);
        bot = lerpColor(0xb8e0f0, 0xffb878, (t - 0.70) / 0.14);
      } else {
        top = lerpColor(0xe07040, 0x101a3a, (t - 0.84) / 0.06);
        bot = lerpColor(0xffb878, 0x223060, (t - 0.84) / 0.06);
      }
      paintSky(top, bot);
      for (const w of scene.windowLights) w.alpha = nf;
    };
    scene.setTime(0.42);

    return scene;
  };
})();
