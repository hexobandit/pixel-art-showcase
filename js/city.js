// City — map, buildings, walkability, render the static world.
(function () {
  const { Container, Graphics } = PIXI;
  const { iso, mulberry32 } = PCity;
  const { RD } = PCity;
  const { TW, TH, PAL } = RD;

  const MAP_W = 22, MAP_H = 26;

  // role  : 'home' | 'office' | 'cafe' | 'shop' | 'station' | 'park'
  // color : packed RGB used by the chunky-style renderer
  // door  : tile coord agents use to enter/exit (walkable, outside footprint)
  // small : true → render as a 1×1 cottage with peaked roof
  const BUILDINGS = [
    // Train station — east end of top row
    { id: 'station',  tx: 17, ty: 0,  w: 4, h: 1.5, stories: 2, color: 0x9a8870, role: 'station', door: { x: 18, y: 5 } },

    // Office row (5 offices)
    { id: 'office-1', tx: 1,  ty: 2, w: 3, h: 3, stories: 5, color: 0x6a78c8, role: 'office', door: { x: 2,  y: 5 } },
    { id: 'office-2', tx: 5,  ty: 2, w: 3, h: 3, stories: 6, color: 0xe87856, role: 'office', door: { x: 6,  y: 5 } },
    { id: 'office-3', tx: 9,  ty: 2, w: 3, h: 3, stories: 4, color: 0xf0c84a, role: 'office', door: { x: 10, y: 5 } },
    { id: 'office-4', tx: 13, ty: 2, w: 3, h: 3, stories: 5, color: 0x52b0a0, role: 'office', door: { x: 14, y: 5 } },

    // Café / shop row (7 mid-rise)
    { id: 'cafe-1',   tx: 1,  ty: 9, w: 2, h: 2, stories: 2, color: 0xd64c5e, role: 'cafe', door: { x: 2,  y: 11 } },
    { id: 'shop-1',   tx: 4,  ty: 9, w: 2, h: 2, stories: 2, color: 0xeb9a3a, role: 'shop', door: { x: 5,  y: 11 } },
    { id: 'cafe-2',   tx: 7,  ty: 9, w: 2, h: 2, stories: 2, color: 0xc24c5e, role: 'cafe', door: { x: 8,  y: 11 } },
    { id: 'shop-2',   tx: 10, ty: 9, w: 2, h: 2, stories: 2, color: 0x4a92e0, role: 'shop', door: { x: 11, y: 11 } },
    { id: 'cafe-3',   tx: 13, ty: 9, w: 2, h: 2, stories: 2, color: 0xd64c5e, role: 'cafe', door: { x: 14, y: 11 } },
    { id: 'shop-3',   tx: 16, ty: 9, w: 2, h: 2, stories: 2, color: 0x6a8c4a, role: 'shop', door: { x: 17, y: 11 } },
    { id: 'cafe-4',   tx: 19, ty: 9, w: 2, h: 2, stories: 2, color: 0xc862c0, role: 'cafe', door: { x: 20, y: 11 } },

    // Tall townhouse row (7 of them)
    { id: 'home-1',   tx: 1,  ty: 13, w: 2, h: 2, stories: 3, color: 0xb86a3a, role: 'home', door: { x: 2,  y: 15 } },
    { id: 'home-2',   tx: 4,  ty: 13, w: 2, h: 2, stories: 3, color: 0x6a8c4a, role: 'home', door: { x: 5,  y: 15 } },
    { id: 'home-3',   tx: 7,  ty: 13, w: 2, h: 2, stories: 3, color: 0xc24838, role: 'home', door: { x: 8,  y: 15 } },
    { id: 'home-4',   tx: 10, ty: 13, w: 2, h: 2, stories: 3, color: 0x52b0a0, role: 'home', door: { x: 11, y: 15 } },
    { id: 'home-5',   tx: 13, ty: 13, w: 2, h: 2, stories: 3, color: 0xa06840, role: 'home', door: { x: 14, y: 15 } },
    { id: 'home-6',   tx: 16, ty: 13, w: 2, h: 2, stories: 3, color: 0x4882c0, role: 'home', door: { x: 17, y: 15 } },
    { id: 'home-7',   tx: 19, ty: 13, w: 2, h: 2, stories: 3, color: 0xb86a3a, role: 'home', door: { x: 20, y: 15 } },

    // Pedestrian plaza area between rows 16-17 (no buildings — see tileType).

    // Family-house row 1 (small 1×1 with peaked roofs)
    ...smallRow(19, 20, [
      { tx: 1,  color: 0xeed8a8, roof: 0x8b3a26 },
      { tx: 3,  color: 0xc8e0d0, roof: 0x6a4030 },
      { tx: 5,  color: 0xf0c084, roof: 0x4a3018 },
      { tx: 7,  color: 0xd6b0d6, roof: 0x6a3818 },
      { tx: 11, color: 0xe8c8a0, roof: 0x8b3a26 },
      { tx: 13, color: 0xc4d8a8, roof: 0x4a3018 },
      { tx: 15, color: 0xf0a878, roof: 0x6a2818 },
      { tx: 18, color: 0xa8c8e0, roof: 0x6a4030 },
      { tx: 20, color: 0xe8b0a0, roof: 0x4a3018 },
    ]),

    // Family-house row 2 (offset for variety)
    ...smallRow(21, 22, [
      { tx: 2,  color: 0xc8a8e0, roof: 0x6a3818 },
      { tx: 4,  color: 0xe0d090, roof: 0x4a3018 },
      { tx: 6,  color: 0xa8d0a8, roof: 0x6a4030 },
      { tx: 9,  color: 0xeed8a8, roof: 0x8b3a26 },
      { tx: 11, color: 0xd0a890, roof: 0x4a2818 },
      { tx: 13, color: 0xc8e0e0, roof: 0x6a4030 },
      { tx: 15, color: 0xe8a0a0, roof: 0x6a2818 },
      { tx: 18, color: 0xb8c8e0, roof: 0x4a3018 },
      { tx: 20, color: 0xe0c068, roof: 0x6a4030 },
    ]),

    // Park — open area, agents stay visible while there
    { id: 'park',     tx: 8, ty: 23, w: 6, h: 3, role: 'park', door: { x: 9, y: 22 }, isOpen: true },
  ];

  // Helper to expand a row of small houses.
  function smallRow(ty, doorY, defs) {
    return defs.map((d, i) => ({
      id:    `cottage-${ty}-${i}`,
      tx:    d.tx,
      ty,
      w:     1,
      h:     1,
      stories: 1,
      small: true,
      color: d.color,
      roofColor: d.roof,
      role: 'home',
      door: { x: d.tx, y: doorY },
    }));
  }

  // Tile categorisation for the static world map.
  function tileType(x, y) {
    if (y === 6 || y === 7) {
      const crossCols = [3, 7, 11, 15, 19];
      if (crossCols.includes(x)) return 'crosswalk';
      return 'road';
    }
    if (y === 5 || y === 8 || y === 11 || y === 12 || y === 15 || y === 18 || y === 20 || y === 22) return 'sidewalk';
    if (y === 16 || y === 17) return 'plaza';
    if (y >= 23 && y <= 25 && x >= 7 && x <= 14) return 'park';
    return 'grass';
  }

  function computeFootprintMask() {
    const mask = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(null));
    for (const b of BUILDINGS) {
      if (b.isOpen) continue;
      for (let dy = 0; dy < Math.ceil(b.h); dy++) {
        for (let dx = 0; dx < Math.ceil(b.w); dx++) {
          const x = Math.floor(b.tx + dx);
          const y = Math.floor(b.ty + dy);
          if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) mask[y][x] = b.id;
        }
      }
    }
    return mask;
  }

  function buildWalkability(footprintMask) {
    const w = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(false));
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (footprintMask[y][x]) { w[y][x] = false; continue; }
        const t = tileType(x, y);
        if (t === 'road') { w[y][x] = false; continue; }
        w[y][x] = true;
      }
    }
    return w;
  }

  function findPath(walkable, start, goal) {
    const W = MAP_W, H = MAP_H;
    if (start.x === goal.x && start.y === goal.y) return [{ x: start.x, y: start.y }];
    if (!walkable[goal.y]?.[goal.x]) return null;
    const visited = new Uint8Array(W * H);
    const prev = new Int32Array(W * H);
    const queue = [];
    const startIdx = start.y * W + start.x;
    visited[startIdx] = 1;
    prev[startIdx] = -1;
    queue.push(startIdx);
    const goalIdx = goal.y * W + goal.x;
    let found = false;
    while (queue.length) {
      const idx = queue.shift();
      if (idx === goalIdx) { found = true; break; }
      const x = idx % W, y = (idx / W) | 0;
      const neighbours = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
      for (const [nx, ny] of neighbours) {
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const nIdx = ny * W + nx;
        if (visited[nIdx]) continue;
        if (!walkable[ny][nx]) continue;
        visited[nIdx] = 1;
        prev[nIdx] = idx;
        queue.push(nIdx);
      }
    }
    if (!found) return null;
    const path = [];
    let cur = goalIdx;
    while (cur !== -1) {
      path.push({ x: cur % W, y: (cur / W) | 0 });
      cur = prev[cur];
    }
    path.reverse();
    return path;
  }

  function renderWorld(world, scene) {
    const ground = new Graphics();
    ground.zIndex = 0;
    const rng = mulberry32(33);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = tileType(x, y);
        let col;
        if (t === 'road' || t === 'crosswalk') col = (x + y) % 2 === 0 ? PAL.road : PAL.roadA;
        else if (t === 'sidewalk') col = (x + y) % 3 === 0 ? PAL.sidewalkA : PAL.sidewalk;
        else if (t === 'plaza')    col = (x + y) % 2 === 0 ? PAL.plaza : PAL.plazaA;
        else if (t === 'park')     col = (x + y) % 2 === 0 ? PAL.grass : PAL.grassDark;
        else {
          const r = rng();
          col = r < 0.2 ? PAL.grassDark : PAL.grass;
        }
        RD.drawTile(ground, x, y, col);
        if (t === 'grass' && rng() < 0.22) RD.drawGrassTufts(ground, x, y);
      }
    }

    // Road centre dashed line (between rows 6 and 7)
    for (let tx = 0; tx <= MAP_W; tx += 0.5) {
      if (((tx * 2) | 0) % 2 !== 0) continue;
      const a = iso(tx,        6.5, TW, TH);
      const b = iso(tx + 0.35, 6.5, TW, TH);
      ground.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.roadLine, width: 1.5, alpha: 0.85 });
    }
    // Tram rails
    for (const lane of [6.3, 7.7]) {
      const a = iso(0,     lane, TW, TH);
      const b = iso(MAP_W, lane, TW, TH);
      ground.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xa0a4ac, width: 1, alpha: 0.85 });
    }
    // Crosswalk stripes
    for (const x of [3, 7, 11, 15, 19]) {
      RD.drawCrosswalkStripes(ground, x, 6, 'h');
      RD.drawCrosswalkStripes(ground, x, 7, 'h');
    }
    world.addChild(ground);

    // Elevated train track at the back
    RD.drawElevatedTrack(world, MAP_W, 0.5, 38);

    // Buildings (route to drawSmallHouse for cottages)
    for (const b of BUILDINGS) {
      if (b.isOpen) continue;
      if (b.small) RD.drawSmallHouse(world, b, scene);
      else         RD.drawBuilding(world, b, scene);
    }

    // Lamps along sidewalks + plaza edges
    const lamps = [
      // Above road
      { tx: 0.5,  ty: 5 }, { tx: 5.5,  ty: 5 }, { tx: 10.5, ty: 5 }, { tx: 15.5, ty: 5 }, { tx: 21.5, ty: 5 },
      // Below road
      { tx: 0.5,  ty: 8 }, { tx: 5.5,  ty: 8 }, { tx: 10.5, ty: 8 }, { tx: 15.5, ty: 8 }, { tx: 21.5, ty: 8 },
      // Between cafe & home rows
      { tx: 0.5,  ty: 12 }, { tx: 8.5, ty: 12 }, { tx: 15.5, ty: 12 }, { tx: 21.5, ty: 12 },
      // Plaza edge
      { tx: 0.5,  ty: 15.5 }, { tx: 4.5, ty: 15.5 }, { tx: 9.5, ty: 15.5 }, { tx: 14.5, ty: 15.5 }, { tx: 18.5, ty: 15.5 }, { tx: 21.5, ty: 15.5 },
      { tx: 0.5,  ty: 18 }, { tx: 8.5, ty: 18 }, { tx: 16.5, ty: 18 }, { tx: 21.5, ty: 18 },
      // Lower neighbourhood
      { tx: 0.5,  ty: 22 }, { tx: 7.5, ty: 22 }, { tx: 14.5, ty: 22 }, { tx: 21.5, ty: 22 },
    ];
    for (const l of lamps) RD.drawLamp(world, scene, l);

    // Plaza trees (rows 16–17, double row of trees flanking a clear walking strip)
    const plazaTrees = [
      { tx: 0.5,  ty: 16.3 }, { tx: 3.5,  ty: 16.3 }, { tx: 6.5,  ty: 16.3 },
      { tx: 9.5,  ty: 16.3 }, { tx: 12.5, ty: 16.3 }, { tx: 15.5, ty: 16.3 },
      { tx: 18.5, ty: 16.3 }, { tx: 21.5, ty: 16.3 },
      { tx: 0.5,  ty: 17.7 }, { tx: 3.5,  ty: 17.7 }, { tx: 6.5,  ty: 17.7 },
      { tx: 9.5,  ty: 17.7 }, { tx: 12.5, ty: 17.7 }, { tx: 15.5, ty: 17.7 },
      { tx: 18.5, ty: 17.7 }, { tx: 21.5, ty: 17.7 },
    ];
    for (const t of plazaTrees) RD.drawTree(world, t);

    // Border / accent trees
    const trees = [
      { tx: 0.4,  ty: 0.4 }, { tx: 21.4, ty: 0.4 },
      { tx: 4.5,  ty: 0.5 }, { tx: 8.5,  ty: 0.5 }, { tx: 12.5, ty: 0.5 },
      { tx: 0.4,  ty: 25.5 }, { tx: 21.4, ty: 25.5 },
      { tx: 0.4,  ty: 12.4 }, { tx: 21.4, ty: 12.4 },
    ];
    for (const t of trees) RD.drawTree(world, t);

    // Park props (rows 23–25)
    RD.drawFountain(world, 10.5, 24);
    RD.drawBench(world, 8.5, 24);
    RD.drawBench(world, 12.5, 24);
    RD.drawBench(world, 9.5, 25.3);
    RD.drawBench(world, 11.5, 25.3);
    RD.drawTree(world, { tx: 7.4,  ty: 23.5, big: true });
    RD.drawTree(world, { tx: 14.4, ty: 23.5, big: true });
    RD.drawTree(world, { tx: 8.5,  ty: 25.7 });
    RD.drawTree(world, { tx: 13.5, ty: 25.7 });
    RD.drawFlowerBed(world, 10.5, 25.5);

    // Plaza benches (every few blocks)
    RD.drawBench(world, 4.5,  17 );
    RD.drawBench(world, 10.5, 17 );
    RD.drawBench(world, 16.5, 17 );
  }

  function worldBBox() {
    const w = (MAP_W + MAP_H) * TW / 2;
    const h = (MAP_W + MAP_H) * TH / 2 + 80;
    const offsetY = 60;
    return { w, h, offsetY };
  }

  PCity.City = {
    MAP_W, MAP_H,
    BUILDINGS,
    tileType,
    computeFootprintMask,
    buildWalkability,
    findPath,
    renderWorld,
    worldBBox,
  };
})();
