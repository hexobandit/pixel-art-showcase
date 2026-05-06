// Style B — Detailed Isometric
// Muted palette, multi-tone shading, props (lamps, hedges, fences, awnings).
(function () {
  const { iso, isoCenter, rgb, darken, lighten, lerpColor, ambientForTime, nightFactor, mulberry32, PathAgent } = PCity;
  const { Application, Container, Graphics } = PIXI;

  const TW = 26, TH = 13;
  const STORY_H = 12;
  const GW = 9, GH = 9;

  const PAL = {
    skyDay:    0x86b8d8,
    skyNight:  0x10162a,
    grass:     0x4f7a3c,
    grassA:    0x44693a,
    grassB:    0x5a8a44,
    sidewalk:  0xa39880,
    sidewalkA: 0x988c75,
    sidewalkE: 0x736a58,
    road:      0x2e2e34,
    roadA:     0x363640,
    roadLine:  0xc8a838,
    treeLeaf:  0x4a7a3a,
    treeLeafD: 0x355a28,
    treeLeafL: 0x6c9a56,
    treeTrunk: 0x4a3220,
    fence:     0x5a4030,
    lampPost:  0x2a2a30,
    lampGlow:  0xffe098,
    flowerR:   0xd64a4a,
    flowerY:   0xf0d040,
  };

  // Buildings: tx, ty, w, h, stories, type
  // Types: 'brick', 'stucco', 'concrete'
  const BUILDINGS = [
    { tx: 1, ty: 1, w: 2, h: 2, stories: 3, type: 'brick'    },
    { tx: 4, ty: 1, w: 2, h: 2, stories: 4, type: 'concrete' },
    { tx: 6.5, ty: 1, w: 1.5, h: 2, stories: 2, type: 'stucco' },
    { tx: 1, ty: 6, w: 2, h: 2, stories: 2, type: 'stucco'   },
    { tx: 6, ty: 6, w: 2, h: 2, stories: 3, type: 'brick'    },
  ];

  const TREES = [
    { tx: 4.5, ty: 6.6, big: true },
    { tx: 5.3, ty: 7.6, big: false },
    { tx: 0.4, ty: 0.4, big: false },
    { tx: 8.5, ty: 0.5, big: false },
    { tx: 0.4, ty: 8.4, big: false },
  ];

  const LAMPS = [
    { tx: 0.5, ty: 3.5 }, { tx: 4.5, ty: 3.5 }, { tx: 8.5, ty: 3.5 },
    { tx: 0.5, ty: 5.5 }, { tx: 4.5, ty: 5.5 }, { tx: 8.5, ty: 5.5 },
  ];

  const FENCES = [
    // Park area (lower middle): corner posts + horizontal beam
    { x1: 3.2, y1: 6.2, x2: 5.8, y2: 6.2 },
    { x1: 3.2, y1: 8.4, x2: 5.8, y2: 8.4 },
    { x1: 3.2, y1: 6.2, x2: 3.2, y2: 8.4 },
    { x1: 5.8, y1: 6.2, x2: 5.8, y2: 8.4 },
  ];

  // Sidewalk loop, hugging the road on both sides.
  const SIDEWALK_LOOP = [
    { x: 0.5, y: 3.4 }, { x: 8.5, y: 3.4 }, { x: 8.5, y: 5.6 }, { x: 0.5, y: 5.6 },
  ];

  function tileType(x, y) {
    if (y === 4) return 'road';
    if (y === 3 || y === 5) return 'sidewalk';
    return 'grass';
  }

  function buildingPalette(type) {
    if (type === 'brick') {
      return { base: 0x9a4c3a, top: 0xb86552, mortar: 0x5a2a20, accent: 0x70382c, trim: 0xd8c89a };
    }
    if (type === 'stucco') {
      return { base: 0xd9c89a, top: 0xe8d8ac, mortar: 0x9a8868, accent: 0xb89a78, trim: 0x7a5a3a };
    }
    // concrete
    return { base: 0x8a8e92, top: 0xa1a4a8, mortar: 0x60666a, accent: 0x73767a, trim: 0x40464c };
  }

  function drawTile(g, tx, ty, fill, edge) {
    const p = iso(tx, ty, TW, TH);
    g.poly([
      p.x, p.y, p.x + TW/2, p.y + TH/2, p.x, p.y + TH, p.x - TW/2, p.y + TH/2
    ]).fill(fill);
    if (edge !== undefined) {
      g.poly([
        p.x, p.y, p.x + TW/2, p.y + TH/2, p.x, p.y + TH, p.x - TW/2, p.y + TH/2, p.x, p.y
      ]).stroke({ color: edge, width: 1, alpha: 0.25 });
    }
  }

  function drawGrassTufts(g, tx, ty) {
    const p = iso(tx, ty, TW, TH);
    g.rect(p.x - 4, p.y + TH/2 - 1, 1, 1).fill(PAL.grassB);
    g.rect(p.x + 5, p.y + TH/2 + 1, 1, 1).fill(PAL.grassB);
    g.rect(p.x + 1, p.y + TH/2 + 2, 1, 1).fill(PAL.grassA);
  }

  function drawRoadDetails(g) {
    // Centre dashed line
    for (let tx = 0; tx <= GW; tx += 0.5) {
      const phase = (tx * 2) % 2;
      if (phase < 1) {
        const a = iso(tx,        4.5, TW, TH);
        const b = iso(tx + 0.35, 4.5, TW, TH);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.roadLine, width: 1.5, alpha: 0.85 });
      }
    }
    // Subtle dark wear stripes along wheel paths
    for (let tx = 0; tx < GW; tx += 0.1) {
      if (((tx * 10) | 0) % 7 !== 0) continue;
      const a = iso(tx, 4.25, TW, TH);
      const b = iso(tx + 0.05, 4.25, TW, TH);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x000000, width: 1, alpha: 0.12 });
    }
  }

  function drawBuilding(stage, def, scene) {
    const { tx, ty, w, h, stories, type } = def;
    const totalH = stories * STORY_H;
    const pal = buildingPalette(type);

    const back  = iso(tx,     ty,     TW, TH);
    const right = iso(tx + w, ty,     TW, TH);
    const front = iso(tx + w, ty + h, TW, TH);
    const left  = iso(tx,     ty + h, TW, TH);

    const cTop   = pal.top;
    const cRight = darken(pal.base, 0.78);
    const cLeft  = darken(pal.base, 0.62);

    const day = new Graphics();
    // Drop shadow on the ground
    day.poly([
      back.x,  back.y + 3,
      right.x, right.y + 3,
      front.x, front.y + 3,
      left.x,  left.y + 3
    ]).fill({ color: 0x000000, alpha: 0.22 });

    // Right wall
    day.poly([
      right.x, right.y,
      front.x, front.y,
      front.x, front.y - totalH,
      right.x, right.y - totalH
    ]).fill(cRight);
    // Left wall
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

    // Texture: brick rows or concrete panels
    drawWallTexture(day, right, front, totalH, type, pal, true);
    drawWallTexture(day, front, left,  totalH, type, pal, false);

    // Windows (day) & their night counterparts
    const winNight = new Graphics();
    drawWindows(day, winNight, right, front, totalH, w, type, pal);
    drawWindows(day, winNight, front, left,  totalH, h, type, pal);

    // Door + awning on the front-facing wall
    drawDoor(day, front, left, type, pal);

    // Cornice — slim trim line at top of walls
    day.moveTo(right.x, right.y - totalH).lineTo(front.x, front.y - totalH).lineTo(left.x, left.y - totalH)
      .stroke({ color: pal.trim, width: 1, alpha: 0.7 });

    // Roof detail: parapet edge + AC unit on tall buildings
    if (stories >= 3) {
      const cx = (back.x + front.x) / 2;
      const cy = (back.y + front.y) / 2 - totalH;
      day.rect(cx - 6, cy - 4, 12, 5).fill(pal.accent);
      day.rect(cx - 5, cy - 5, 4, 1).fill(darken(pal.accent, 0.7));
      day.rect(cx + 1, cy - 5, 4, 1).fill(darken(pal.accent, 0.7));
    }

    day.zIndex = (tx + ty) * 10 + 5;
    stage.addChild(day);

    winNight.zIndex = (tx + ty) * 10 + 6;
    winNight.alpha = 0;
    stage.addChild(winNight);
    scene.windowLights.push(winNight);
  }

  function drawWallTexture(g, p1, p2, totalH, type, pal, isRight) {
    const stories = Math.floor(totalH / STORY_H);
    if (type === 'brick') {
      // horizontal mortar lines per story
      for (let s = 1; s < stories; s++) {
        const yOff = -s * STORY_H;
        g.moveTo(p1.x, p1.y + yOff).lineTo(p2.x, p2.y + yOff)
          .stroke({ color: pal.mortar, width: 1, alpha: 0.35 });
      }
    } else if (type === 'concrete') {
      // panel grid
      for (let s = 1; s < stories; s++) {
        const yOff = -s * STORY_H;
        g.moveTo(p1.x, p1.y + yOff).lineTo(p2.x, p2.y + yOff)
          .stroke({ color: pal.mortar, width: 1, alpha: 0.4 });
      }
      // vertical seam at midpoint
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      g.moveTo(mx, my).lineTo(mx, my - totalH)
        .stroke({ color: pal.mortar, width: 1, alpha: 0.3 });
    } else {
      // stucco — light vertical streak at corners
      g.moveTo(p1.x, p1.y).lineTo(p1.x, p1.y - totalH)
        .stroke({ color: pal.accent, width: 1, alpha: 0.25 });
    }
  }

  function drawWindows(gDay, gNight, p1, p2, totalH, span, type, pal) {
    const stories = Math.floor(totalH / STORY_H);
    const cols = Math.max(1, Math.round(span * 1.6));
    const winW = 3, winH = 5;
    const frame = pal.trim;
    const paneDay = darken(pal.base, 0.35);
    const paneNight = 0xffe9a8;

    for (let s = 0; s < stories; s++) {
      const yMid = -(s * STORY_H + STORY_H / 2 + 1);
      // skip the bottom row's centre window — door takes that spot
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const wx = p1.x + u * (p2.x - p1.x) - winW / 2;
        const wy = p1.y + u * (p2.y - p1.y) + yMid - winH / 2;
        // frame
        gDay.rect(wx - 1, wy - 1, winW + 2, winH + 2).fill(frame);
        gDay.rect(wx, wy, winW, winH).fill(paneDay);
        // small reflection highlight
        gDay.rect(wx, wy, 1, 2).fill(lighten(paneDay, 0.4));
        // night
        gNight.rect(wx - 1, wy - 1, winW + 2, winH + 2).fill({ color: paneNight, alpha: 0.25 });
        gNight.rect(wx, wy, winW, winH).fill(paneNight);
      }
    }
  }

  function drawDoor(g, p1, p2, type, pal) {
    // place door at u=0.5 along the front-facing wall, base level
    const u = 0.5;
    const dx = p1.x + u * (p2.x - p1.x);
    const dy = p1.y + u * (p2.y - p1.y);
    g.rect(dx - 3, dy - 9, 6, 8).fill(pal.trim);
    g.rect(dx - 2, dy - 8, 4, 7).fill(darken(pal.trim, 0.6));
    g.rect(dx + 1, dy - 5, 1, 1).fill(0xf0d050);
    // awning
    g.rect(dx - 5, dy - 9, 10, 1).fill(pal.accent);
    g.rect(dx - 5, dy - 9, 10, 1).stroke({ color: darken(pal.accent, 0.6), width: 1 });
  }

  function drawTree(stage, t) {
    const p = iso(t.tx, t.ty, TW, TH);
    const g = new Graphics();
    // shadow
    g.ellipse(p.x, p.y + 3, t.big ? 11 : 8, t.big ? 4 : 3).fill({ color: 0x000000, alpha: 0.22 });
    // trunk
    g.rect(p.x - 1.5, p.y - 6, 3, 10).fill(PAL.treeTrunk);
    g.rect(p.x + 1, p.y - 6, 0.5, 10).fill(darken(PAL.treeTrunk, 0.6));
    // leaves — three layered ellipses for depth
    const r = t.big ? 9 : 7;
    g.ellipse(p.x - 4, p.y - 10, r, r * 0.8).fill(PAL.treeLeafD);
    g.ellipse(p.x + 3, p.y - 11, r, r * 0.8).fill(PAL.treeLeaf);
    g.ellipse(p.x,     p.y - 14, r * 0.9, r * 0.75).fill(PAL.treeLeafL);
    // dot highlights
    g.rect(p.x - 1, p.y - 16, 1, 1).fill(lighten(PAL.treeLeafL, 0.3));
    g.rect(p.x + 4, p.y - 13, 1, 1).fill(lighten(PAL.treeLeafL, 0.3));
    g.zIndex = (t.tx + t.ty) * 10 + 4;
    stage.addChild(g);
  }

  function drawLamp(stage, scene, l) {
    const p = iso(l.tx, l.ty, TW, TH);
    const day = new Graphics();
    day.ellipse(p.x, p.y + 2, 3, 1).fill({ color: 0x000000, alpha: 0.25 });
    day.rect(p.x - 0.5, p.y - 14, 1, 14).fill(PAL.lampPost);
    day.rect(p.x - 2, p.y - 16, 4, 2).fill(PAL.lampPost);
    day.rect(p.x - 1.5, p.y - 16, 3, 1).fill(darken(PAL.lampPost, 0.6));
    day.zIndex = (l.tx + l.ty) * 10 + 3;
    stage.addChild(day);

    const night = new Graphics();
    // glow blob
    night.circle(p.x, p.y - 15, 8).fill({ color: PAL.lampGlow, alpha: 0.15 });
    night.circle(p.x, p.y - 15, 4).fill({ color: PAL.lampGlow, alpha: 0.35 });
    night.rect(p.x - 1, p.y - 15, 2, 1).fill(0xffffd0);
    // ground pool
    night.ellipse(p.x, p.y + 3, 14, 4).fill({ color: PAL.lampGlow, alpha: 0.15 });
    night.zIndex = (l.tx + l.ty) * 10 + 7;
    night.alpha = 0;
    stage.addChild(night);
    scene.windowLights.push(night);
  }

  function drawFence(stage, f) {
    const a = iso(f.x1, f.y1, TW, TH);
    const b = iso(f.x2, f.y2, TW, TH);
    const g = new Graphics();
    // posts every 0.5 tile
    const dx = f.x2 - f.x1, dy = f.y2 - f.y1;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.round(len / 0.4));
    g.moveTo(a.x, a.y - 3).lineTo(b.x, b.y - 3)
      .stroke({ color: PAL.fence, width: 1.5 });
    g.moveTo(a.x, a.y - 1).lineTo(b.x, b.y - 1)
      .stroke({ color: darken(PAL.fence, 0.7), width: 1 });
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const px = a.x + (b.x - a.x) * u;
      const py = a.y + (b.y - a.y) * u;
      g.rect(px - 0.5, py - 5, 1, 5).fill(PAL.fence);
    }
    g.zIndex = ((f.x1 + f.x2) / 2 + (f.y1 + f.y2) / 2) * 10 + 3;
    stage.addChild(g);
  }

  function drawFlowerBed(stage, tx, ty) {
    const p = iso(tx, ty, TW, TH);
    const g = new Graphics();
    g.rect(p.x - 6, p.y, 12, 4).fill(0x4a3220);
    g.rect(p.x - 5, p.y + 1, 10, 2).fill(0x3a2418);
    // dots of flowers
    const seeds = [-4, -2, 0, 2, 4];
    seeds.forEach((sx, i) => {
      const col = i % 2 === 0 ? PAL.flowerR : PAL.flowerY;
      g.rect(p.x + sx, p.y + 1, 1, 1).fill(col);
      g.rect(p.x + sx + 1, p.y + 2, 1, 1).fill(col);
    });
    g.zIndex = (tx + ty) * 10 + 2;
    stage.addChild(g);
  }

  function drawBench(stage, tx, ty) {
    const p = iso(tx, ty, TW, TH);
    const g = new Graphics();
    g.ellipse(p.x, p.y + 3, 9, 2).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(p.x - 7, p.y - 1, 14, 2).fill(PAL.treeTrunk);
    g.rect(p.x - 7, p.y - 4, 14, 2).fill(darken(PAL.treeTrunk, 0.7));
    g.rect(p.x - 6, p.y + 1, 1, 3).fill(0x222226);
    g.rect(p.x + 5, p.y + 1, 1, 3).fill(0x222226);
    g.zIndex = (tx + ty) * 10 + 3;
    stage.addChild(g);
  }

  function makePersonSprite(skin, shirt, pants, hair) {
    const g = new Graphics();
    g.ellipse(0, 1, 4, 1.5).fill({ color: 0x000000, alpha: 0.3 });
    // legs
    g.rect(-2, -3, 1.5, 3).fill(pants);
    g.rect( 0.5, -3, 1.5, 3).fill(pants);
    g.rect(-0.5, -3, 1, 3).fill(darken(pants, 0.7));
    // shoes
    g.rect(-2, 0, 1.5, 1).fill(0x222226);
    g.rect( 0.5, 0, 1.5, 1).fill(0x222226);
    // body
    g.rect(-2, -7, 4, 4).fill(shirt);
    g.rect( 1, -7, 1, 4).fill(darken(shirt, 0.75));
    g.rect(-2, -7, 4, 1).fill(lighten(shirt, 0.2));
    // arms (small)
    g.rect(-3, -6, 1, 3).fill(skin);
    g.rect( 2, -6, 1, 3).fill(skin);
    // head
    g.rect(-2, -10, 4, 3).fill(skin);
    g.rect( 1, -10, 1, 3).fill(darken(skin, 0.85));
    // hair
    g.rect(-2, -10, 4, 1).fill(hair);
    g.rect(-2, -11, 4, 1).fill(hair);
    return g;
  }

  function makeCarSprite(col) {
    const g = new Graphics();
    g.ellipse(0, 1, 14, 3).fill({ color: 0x000000, alpha: 0.3 });
    // base
    g.rect(-12, -5, 24, 6).fill(col);
    g.rect(-12,  1, 24, 1).fill(darken(col, 0.55));
    g.rect(-12, -5, 24, 1).fill(lighten(col, 0.2));
    // roof
    g.rect(-7, -10, 14, 5).fill(darken(col, 0.85));
    g.rect(-7, -10, 14, 1).fill(darken(col, 0.65));
    // windows
    g.rect(-6, -9, 5, 4).fill(0x6a90b8);
    g.rect( 1, -9, 5, 4).fill(0x6a90b8);
    g.rect(-6, -9, 1, 4).fill(0x9ad0ff);
    // door line
    g.rect(0, -5, 1, 6).fill(darken(col, 0.65));
    // wheels
    g.rect(-10, 1, 4, 2).fill(0x18181c);
    g.rect( 6,  1, 4, 2).fill(0x18181c);
    // headlight
    g.rect(11, -3, 1, 2).fill(0xfff2a0);
    g.rect(-12, -3, 1, 2).fill(0xc62828);
    return g;
  }

  PCity.buildDetailed = async function (container) {
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
      const bands = 28;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        sky.rect(0, (i / bands) * 480, 360, 480 / bands + 1).fill(lerpColor(top, bot, t));
      }
    }

    const world = new Container();
    world.sortableChildren = true;
    const isoH = (GW + GH) * TH / 2;
    world.x = 360 / 2;
    world.y = (480 - isoH) / 2 + 30;
    app.stage.addChild(world);

    const scene = { app, world, windowLights: [], paintSky, time: 0.5 };

    // Ground tiles, with subtle variation per tile
    const ground = new Graphics();
    ground.zIndex = 0;
    const rng = mulberry32(12);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const t = tileType(x, y);
        let col;
        if (t === 'road') col = (x + y) % 2 === 0 ? PAL.road : PAL.roadA;
        else if (t === 'sidewalk') col = (x + y) % 3 === 0 ? PAL.sidewalkA : PAL.sidewalk;
        else {
          const r = rng();
          col = r < 0.2 ? PAL.grassA : (r > 0.8 ? PAL.grassB : PAL.grass);
        }
        const p = iso(x, y, TW, TH);
        ground.poly([
          p.x, p.y, p.x + TW/2, p.y + TH/2, p.x, p.y + TH, p.x - TW/2, p.y + TH/2
        ]).fill(col);
        if (t === 'sidewalk' && (x + y) % 4 === 0) {
          // sidewalk crack
          ground.moveTo(p.x - 3, p.y + TH/2).lineTo(p.x + 2, p.y + TH/2 - 1)
            .stroke({ color: PAL.sidewalkE, width: 1, alpha: 0.5 });
        }
        if (t === 'grass' && rng() < 0.3) drawGrassTufts(ground, x, y);
      }
    }
    drawRoadDetails(ground);
    world.addChild(ground);

    // Buildings
    for (const b of BUILDINGS) drawBuilding(world, b, scene);

    // Flower bed in front of one building
    drawFlowerBed(world, 4.5, 5.6);
    drawFlowerBed(world, 3, 5.6);

    // Park furniture
    drawBench(world, 4.5, 7);
    drawBench(world, 4.5, 7.8);

    // Trees
    for (const t of TREES) drawTree(world, t);

    // Fences around park
    for (const f of FENCES) drawFence(world, f);

    // Lamps
    for (const l of LAMPS) drawLamp(world, scene, l);

    // --- agents -------------------------------------------------------
    const agentRng = mulberry32(33);
    const skins  = [0xf0c89a, 0xd9a070, 0xa86c44, 0xefd0a8];
    const shirts = [0xc24848, 0x4882c0, 0xc8a040, 0x4a8060, 0x8852a0, 0xb86a3a, 0xe8e0d0];
    const pants  = [0x3a4258, 0x2a3040, 0x4a3a2a, 0x202028];
    const hairs  = [0x2a1a10, 0x6a4626, 0xc89048, 0x18181c, 0x90562a];

    const agents = [];
    for (let i = 0; i < 8; i++) {
      const a = new PathAgent({
        path: SIDEWALK_LOOP,
        speed: 0.7 + agentRng() * 0.4,
        idleChance: 0.18,
      });
      a.idx = i % SIDEWALK_LOOP.length;
      a.x = SIDEWALK_LOOP[a.idx].x + (agentRng() - 0.5) * 0.2;
      a.y = SIDEWALK_LOOP[a.idx].y + (agentRng() - 0.5) * 0.2;
      a.sprite = makePersonSprite(
        skins[i % skins.length],
        shirts[i % shirts.length],
        pants[i % pants.length],
        hairs[i % hairs.length]
      );
      world.addChild(a.sprite);
      agents.push(a);
    }

    // --- cars ----------------------------------------------------------
    const carColours = [0x9c2828, 0x2c5d96, 0xefefe0, 0x404048, 0x6a8c4a];
    const cars = [];
    for (let i = 0; i < 2; i++) {
      const goingRight = i % 2 === 0;
      const lane = goingRight ? 4.25 : 4.75;
      const c = {
        sprite: makeCarSprite(carColours[i % carColours.length]),
        x: goingRight ? -2 + i * 5 : GW + 2 - i * 5,
        y: lane,
        speed: 2.2 + agentRng() * 0.6,
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
        const bob = Math.sin(a.bobPhase) * 0.5;
        a.sprite.x = p.x;
        a.sprite.y = p.y + bob;
        a.sprite.zIndex = (a.x + a.y) * 10 + 50;
      }
      for (const c of cars) {
        c.x += c.dir * c.speed * dt;
        if (c.dir > 0 && c.x > GW + 2) c.x = -2;
        if (c.dir < 0 && c.x < -2)     c.x = GW + 2;
        const p = isoCenter(c.x, c.lane, TW, TH);
        c.sprite.x = p.x;
        c.sprite.y = p.y - 1;
        c.sprite.scale.x = c.dir > 0 ? 1 : -1;
        c.sprite.zIndex = (c.x + c.lane) * 10 + 40;
      }
    });

    scene.setTime = function (t) {
      scene.time = t;
      world.tint = ambientForTime(t);
      const nf = nightFactor(t);

      let top, bot;
      if (t < 0.22 || t > 0.86) {
        top = 0x080c20; bot = PAL.skyNight;
      } else if (t < 0.32) {
        top = lerpColor(PAL.skyNight, 0xc24a48, (t - 0.22) / 0.10);
        bot = lerpColor(0x4a3868, 0xffb888, (t - 0.22) / 0.10);
      } else if (t < 0.70) {
        top = PAL.skyDay; bot = lighten(PAL.skyDay, 0.35);
      } else if (t < 0.84) {
        top = lerpColor(PAL.skyDay, 0xd84838, (t - 0.70) / 0.14);
        bot = lerpColor(lighten(PAL.skyDay, 0.35), 0xffa060, (t - 0.70) / 0.14);
      } else {
        top = lerpColor(0xd84838, 0x080c20, (t - 0.84) / 0.06);
        bot = lerpColor(0xffa060, PAL.skyNight, (t - 0.84) / 0.06);
      }
      paintSky(top, bot);
      for (const w of scene.windowLights) w.alpha = nf;
    };
    scene.setTime(0.375);

    return scene;
  };

  // === CITY VARIANT ===================================================

  const CITY_W = 12, CITY_H = 16;

  // Buildings — mix of types and footprints
  const CITY_BUILDINGS = [
    { tx: 1,  ty: 2,  w: 2, h: 2.5, stories: 5, type: 'concrete' },
    { tx: 3.5, ty: 2, w: 2, h: 2.5, stories: 4, type: 'brick'    },
    { tx: 6,   ty: 2, w: 2, h: 2.5, stories: 3, type: 'stucco'   },
    { tx: 8.5, ty: 2, w: 2.5, h: 2.5, stories: 6, type: 'concrete' },
    { tx: 1,   ty: 5, w: 2, h: 2,   stories: 2, type: 'brick'    },
    { tx: 3.5, ty: 5, w: 2, h: 2,   stories: 3, type: 'stucco'   },
    { tx: 6,   ty: 5, w: 2, h: 2,   stories: 2, type: 'brick'    },
    { tx: 8.5, ty: 5, w: 2, h: 2,   stories: 3, type: 'concrete' },
    // Bottom row — townhouses
    { tx: 1,   ty: 10, w: 1.7, h: 2, stories: 3, type: 'brick'  },
    { tx: 2.9, ty: 10, w: 1.7, h: 2, stories: 3, type: 'stucco' },
    { tx: 4.8, ty: 10, w: 1.7, h: 2, stories: 3, type: 'brick'  },
    { tx: 7,   ty: 10, w: 1.7, h: 2, stories: 3, type: 'stucco' },
    { tx: 8.9, ty: 10, w: 1.7, h: 2, stories: 3, type: 'brick'  },
  ];

  const CITY_TREES = [
    { tx: 0.4, ty: 0.4, big: false }, { tx: 11.4, ty: 0.4, big: false },
    { tx: 3.0, ty: 0.5, big: false }, { tx: 7.5, ty: 0.5, big: false },
    { tx: 5.5, ty: 8.5, big: false },                        // tree on traffic island? skip
    { tx: 0.4, ty: 13.4, big: true  }, { tx: 11.4, ty: 13.4, big: true },
    { tx: 4.5, ty: 14, big: true }, { tx: 7.5, ty: 14, big: true },
    { tx: 5.5, ty: 15, big: false }, { tx: 6.5, ty: 14.5, big: false },
  ];

  const CITY_LAMPS = [
    { tx: 0.5, ty: 7.4 }, { tx: 4.5, ty: 7.4 }, { tx: 8.5, ty: 7.4 }, { tx: 11.5, ty: 7.4 },
    { tx: 0.5, ty: 9.6 }, { tx: 4.5, ty: 9.6 }, { tx: 8.5, ty: 9.6 }, { tx: 11.5, ty: 9.6 },
  ];

  const CITY_FLOWERS = [
    { tx: 2.5, ty: 13 }, { tx: 9.5, ty: 13 },
    { tx: 4, ty: 13 }, { tx: 7.5, ty: 13 },
  ];

  function cityTileType(x, y) {
    if (y === 8 || y === 9) return 'road';
    if (y === 7 || y === 10) return 'sidewalk';
    return 'grass';
  }

  function drawElevatedTrackB(stage, gridW, trackRow, ZH) {
    const beam = 0x55585e, beamD = 0x383b40, beamL = 0x6a6e74;
    const rail = 0xc0c4cc;
    const sleeper = 0x4a3220;
    const g = new Graphics();

    // pillars
    for (let x = 0; x <= gridW; x += 2) {
      const p = iso(x, trackRow, TW, TH);
      g.rect(p.x - 2, p.y - ZH, 4, ZH).fill(beam);
      g.rect(p.x - 1, p.y - ZH, 1, ZH).fill(beamD);
      g.rect(p.x + 1, p.y - ZH, 1, ZH).fill(beamL);
      g.rect(p.x - 4, p.y - 4, 8, 4).fill(beamD);
      g.rect(p.x - 4, p.y - 4, 8, 1).fill(beam);
    }
    // deck
    const a = iso(0, trackRow, TW, TH);
    const b = iso(gridW, trackRow, TW, TH);
    g.poly([a.x, a.y - ZH, b.x, b.y - ZH, b.x, b.y - ZH + 6, a.x, a.y - ZH + 6]).fill(beam);
    g.poly([a.x, a.y - ZH, b.x, b.y - ZH, b.x, b.y - ZH + 1, a.x, a.y - ZH + 1]).fill(beamL);
    g.poly([a.x, a.y - ZH + 5, b.x, b.y - ZH + 5, b.x, b.y - ZH + 6, a.x, a.y - ZH + 6]).fill(beamD);
    // sleepers
    for (let x = 0; x < gridW; x += 0.4) {
      const p = iso(x, trackRow, TW, TH);
      g.rect(p.x - 4, p.y - ZH - 1, 8, 1).fill(sleeper);
    }
    // rails
    g.moveTo(a.x, a.y - ZH - 3).lineTo(b.x, b.y - ZH - 3).stroke({ color: rail, width: 1 });
    g.moveTo(a.x, a.y - ZH - 1).lineTo(b.x, b.y - ZH - 1).stroke({ color: rail, width: 1 });

    g.zIndex = -10;
    stage.addChild(g);
  }

  function makeTrainEngineB() {
    const body = 0x9c2828, bodyD = 0x6e1818, bodyL = 0xc44848;
    const roof = 0x3a3036;
    const trim = 0xe8c844;
    const g = new Graphics();
    g.ellipse(0, 8, 32, 3).fill({ color: 0x000000, alpha: 0.35 });
    // body
    g.rect(-30, -10, 56, 14).fill(body);
    g.rect(-30, -10, 56, 1).fill(bodyL);
    g.rect(-30,  3, 56, 1).fill(bodyD);
    // belt stripe
    g.rect(-30, -2, 56, 1).fill(trim);
    // roof
    g.rect(-26, -16, 52, 6).fill(roof);
    g.rect(-26, -16, 52, 1).fill(darken(roof, 0.6));
    g.rect(-26, -10, 52, 1).fill(lighten(roof, 0.3));
    // windows
    g.rect(-24, -8, 48, 5).fill(0x4a6878);
    for (let x = -24; x <= 24; x += 8) {
      g.rect(x, -8, 1, 5).fill(roof);
      g.rect(x + 1, -8, 6, 1).fill(0x6a8898); // window highlight strip
    }
    // streamlined nose
    g.poly([26, -10, 34, -3, 34, 4, 26, 4]).fill(bodyD);
    g.rect(31, -2, 3, 2).fill(0xfff080);
    g.rect(33, -1, 1, 1).fill(0xffffff);
    // roof vents
    g.rect(-20, -17, 5, 1).fill(darken(roof, 0.4));
    g.rect( -8, -17, 5, 1).fill(darken(roof, 0.4));
    g.rect( 10, -17, 5, 1).fill(darken(roof, 0.4));
    // door line
    g.rect(0, -10, 1, 14).fill(bodyD);
    // bogie wheel sets
    g.rect(-25, 4, 8, 4).fill(0x18181c);
    g.rect( -8, 4, 8, 4).fill(0x18181c);
    g.rect( 12, 4, 8, 4).fill(0x18181c);
    g.rect(-23, 5, 4, 2).fill(0x404048);
    g.rect( -6, 5, 4, 2).fill(0x404048);
    g.rect( 14, 5, 4, 2).fill(0x404048);
    return g;
  }

  function makeTrainCarB() {
    const body = 0x9c2828, bodyD = 0x6e1818, bodyL = 0xc44848;
    const roof = 0x3a3036;
    const trim = 0xe8c844;
    const g = new Graphics();
    g.ellipse(0, 8, 28, 3).fill({ color: 0x000000, alpha: 0.35 });
    g.rect(-26, -10, 52, 14).fill(body);
    g.rect(-26, -10, 52, 1).fill(bodyL);
    g.rect(-26,  3, 52, 1).fill(bodyD);
    g.rect(-26, -2, 52, 1).fill(trim);
    g.rect(-22, -16, 44, 6).fill(roof);
    g.rect(-22, -16, 44, 1).fill(darken(roof, 0.6));
    g.rect(-22, -10, 44, 1).fill(lighten(roof, 0.3));
    g.rect(-20, -8, 40, 5).fill(0x4a6878);
    for (let x = -20; x <= 20; x += 8) {
      g.rect(x, -8, 1, 5).fill(roof);
      g.rect(x + 1, -8, 6, 1).fill(0x6a8898);
    }
    g.rect(-28, 0, 2, 2).fill(0x18181c);
    g.rect( 26, 0, 2, 2).fill(0x18181c);
    g.rect(-22, 4, 8, 4).fill(0x18181c);
    g.rect( 14, 4, 8, 4).fill(0x18181c);
    return g;
  }

  function makeTramB() {
    const body = 0xd4a838, bodyD = 0x9a7a20, bodyL = 0xebc35a;
    const trim = 0x4a3a18;
    const g = new Graphics();
    g.ellipse(0, 1, 18, 3).fill({ color: 0x000000, alpha: 0.32 });
    g.rect(-16, -8, 32, 8).fill(body);
    g.rect(-16, -8, 32, 1).fill(bodyL);
    g.rect(-16,  0, 32, 1).fill(bodyD);
    g.rect(-12, -12, 24, 4).fill(trim);
    g.rect(-12, -12, 24, 1).fill(darken(trim, 0.6));
    g.rect(-14, -6, 28, 4).fill(0x4a6878);
    for (let x = -10; x < 12; x += 6) {
      g.rect(x, -6, 1, 4).fill(trim);
      g.rect(x + 1, -6, 4, 1).fill(0x6a8898);
    }
    g.rect(-2, -2, 1, 4).fill(bodyD); // door
    // pantograph
    g.moveTo(0, -12).lineTo(-3, -16).stroke({ color: trim, width: 1 });
    g.moveTo(0, -12).lineTo( 3, -16).stroke({ color: trim, width: 1 });
    g.rect(-5, -16, 10, 1).fill(trim);
    // wheels
    g.rect(-13, 0, 5, 2).fill(0x18181c);
    g.rect(  8, 0, 5, 2).fill(0x18181c);
    g.rect(-12, 1, 3, 1).fill(0x404048);
    g.rect(  9, 1, 3, 1).fill(0x404048);
    return g;
  }

  function drawAwningB(stage, a) {
    const p = iso(a.tx,        a.ty, TW, TH);
    const r = iso(a.tx + a.w,  a.ty, TW, TH);
    const g = new Graphics();
    g.poly([p.x, p.y - 6, r.x, r.y - 6, r.x, r.y - 1, p.x, p.y - 1]).fill(a.col);
    g.poly([p.x, p.y - 1, r.x, r.y - 1, r.x + 1, r.y, p.x + 1, p.y]).fill(darken(a.col, 0.6));
    // Stripe pattern
    for (let s = 0; s < a.w * 3; s++) {
      const u = (s + 0.5) / (a.w * 3);
      const x = p.x + u * (r.x - p.x);
      const y = p.y + u * (r.y - p.y);
      g.rect(x - 0.5, y - 5, 1, 4).fill(0xfff0e0);
    }
    // support poles
    g.rect(p.x - 0.5, p.y - 1, 1, 4).fill(0x222226);
    g.rect(r.x - 0.5, r.y - 1, 1, 4).fill(0x222226);
    g.zIndex = (a.tx + a.ty) * 10 + 2;
    stage.addChild(g);
  }

  PCity.buildDetailedCity = async function (container) {
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
    world.y = (H - isoH) / 2 + 30;
    app.stage.addChild(world);

    const scene = { app, world, windowLights: [], paintSky, time: 0.5 };

    // Ground
    const ground = new Graphics();
    ground.zIndex = 0;
    const gRng = mulberry32(57);
    for (let y = 0; y < CITY_H; y++) {
      for (let x = 0; x < CITY_W; x++) {
        const t = cityTileType(x, y);
        let col;
        if (t === 'road') col = (x + y) % 2 === 0 ? PAL.road : PAL.roadA;
        else if (t === 'sidewalk') col = (x + y) % 3 === 0 ? PAL.sidewalkA : PAL.sidewalk;
        else {
          const r = gRng();
          col = r < 0.2 ? PAL.grassA : (r > 0.8 ? PAL.grassB : PAL.grass);
        }
        const p = iso(x, y, TW, TH);
        ground.poly([
          p.x, p.y, p.x + TW/2, p.y + TH/2, p.x, p.y + TH, p.x - TW/2, p.y + TH/2
        ]).fill(col);
        if (t === 'sidewalk' && (x + y) % 4 === 0) {
          ground.moveTo(p.x - 3, p.y + TH/2).lineTo(p.x + 2, p.y + TH/2 - 1)
            .stroke({ color: PAL.sidewalkE, width: 1, alpha: 0.5 });
        }
        if (t === 'grass' && gRng() < 0.3) drawGrassTufts(ground, x, y);
      }
    }
    // Road centre dashed line
    for (let tx = 0; tx <= CITY_W; tx += 0.5) {
      if (((tx * 2) | 0) % 2 !== 0) continue;
      const a = iso(tx,        8.5, TW, TH);
      const b = iso(tx + 0.35, 8.5, TW, TH);
      ground.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.roadLine, width: 1.5, alpha: 0.85 });
    }
    // Tram rails embedded in road
    for (const lane of [8.3, 9.7]) {
      const a = iso(0,       lane, TW, TH);
      const b = iso(CITY_W,  lane, TW, TH);
      ground.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xa0a4ac, width: 1, alpha: 0.85 });
    }
    world.addChild(ground);

    // Elevated train track at the back
    drawElevatedTrackB(world, CITY_W, 0.5, 38);

    // Buildings
    for (const b of CITY_BUILDINGS) drawBuilding(world, b, scene);

    // Awnings on bottom row (cafe vibe)
    const awnings = [
      { tx: 1, ty: 12, w: 1.7, col: 0xc24848 },
      { tx: 2.9, ty: 12, w: 1.7, col: 0x4882c0 },
      { tx: 4.8, ty: 12, w: 1.7, col: 0x4a8060 },
      { tx: 7, ty: 12, w: 1.7, col: 0xb86a3a },
      { tx: 8.9, ty: 12, w: 1.7, col: 0x8852a0 },
    ];
    for (const a of awnings) drawAwningB(world, a);

    // Flower beds in front of bottom row
    for (const f of CITY_FLOWERS) drawFlowerBed(world, f.tx, f.ty);

    // Park benches in lower area
    drawBench(world, 4, 14.5);
    drawBench(world, 8, 14.5);

    // Trees
    for (const t of CITY_TREES) drawTree(world, t);

    // Lamps
    for (const l of CITY_LAMPS) drawLamp(world, scene, l);

    // ---------- agents ------------------------------------------------
    const aRng = mulberry32(63);
    const skins  = [0xf0c89a, 0xd9a070, 0xa86c44, 0xefd0a8];
    const shirts = [0xc24848, 0x4882c0, 0xc8a040, 0x4a8060, 0x8852a0, 0xb86a3a, 0xe8e0d0];
    const pants  = [0x3a4258, 0x2a3040, 0x4a3a2a, 0x202028];
    const hairs  = [0x2a1a10, 0x6a4626, 0xc89048, 0x18181c, 0x90562a];

    const topLoop = [
      { x: 0.5, y: 7.4 }, { x: 11.5, y: 7.4 },
      { x: 11.5, y: 9.6 }, { x: 0.5, y: 9.6 },
    ];
    const botLoop = [
      { x: 0.5, y: 9.6 }, { x: 11.5, y: 9.6 },
      { x: 11.5, y: 13.5 }, { x: 0.5, y: 13.5 },
    ];

    const agents = [];
    for (let i = 0; i < 16; i++) {
      const path = i % 2 === 0 ? topLoop : botLoop;
      const a = new PathAgent({
        path,
        speed: 0.6 + aRng() * 0.4,
        idleChance: 0.22,
      });
      a.idx = i % path.length;
      a.x = path[a.idx].x + (aRng() - 0.5) * 0.3;
      a.y = path[a.idx].y + (aRng() - 0.5) * 0.2;
      a.sprite = makePersonSprite(
        skins[i % skins.length],
        shirts[i % shirts.length],
        pants[i % pants.length],
        hairs[i % hairs.length]
      );
      world.addChild(a.sprite);
      agents.push(a);
    }

    // Cars
    const carColours = [0x9c2828, 0x2c5d96, 0xefefe0, 0x404048, 0x6a8c4a];
    const cars = [];
    for (let i = 0; i < 3; i++) {
      const goingRight = i % 2 === 0;
      const lane = goingRight ? 8.45 : 9.55;
      const c = {
        sprite: makeCarSprite(carColours[i % carColours.length]),
        x: goingRight ? -2 + i * 5 : CITY_W + 2 - i * 5,
        y: lane,
        speed: 2.2 + aRng() * 0.6,
        dir: goingRight ? 1 : -1,
        lane,
      };
      world.addChild(c.sprite);
      cars.push(c);
    }

    // Tram
    const tram = {
      sprite: makeTramB(),
      x: -3,
      lane: 9,
      speed: 1.9,
      dir: 1,
    };
    world.addChild(tram.sprite);

    // Train
    const trainContainer = new Container();
    const engine = makeTrainEngineB();
    const car1 = makeTrainCarB();
    const car2 = makeTrainCarB();
    car1.x = -64; car2.x = -126;
    trainContainer.addChild(car2, car1, engine);
    trainContainer.zIndex = 10000;
    world.addChild(trainContainer);
    const train = {
      container: trainContainer,
      x: -4,
      speed: 4.2,
      dir: 1,
      row: 0.5,
      ZH: 38,
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
        const bob = Math.sin(a.bobPhase) * 0.5;
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
      if (t < 0.22 || t > 0.86) { top = 0x080c20; bot = PAL.skyNight; }
      else if (t < 0.32) {
        top = lerpColor(PAL.skyNight, 0xc24a48, (t - 0.22) / 0.10);
        bot = lerpColor(0x4a3868, 0xffb888, (t - 0.22) / 0.10);
      } else if (t < 0.70) {
        top = PAL.skyDay; bot = lighten(PAL.skyDay, 0.35);
      } else if (t < 0.84) {
        top = lerpColor(PAL.skyDay, 0xd84838, (t - 0.70) / 0.14);
        bot = lerpColor(lighten(PAL.skyDay, 0.35), 0xffa060, (t - 0.70) / 0.14);
      } else {
        top = lerpColor(0xd84838, 0x080c20, (t - 0.84) / 0.06);
        bot = lerpColor(0xffa060, PAL.skyNight, (t - 0.84) / 0.06);
      }
      paintSky(top, bot);
      for (const w of scene.windowLights) w.alpha = nf;
    };
    scene.setTime(0.42);

    return scene;
  };
})();
