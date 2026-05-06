// Live-city rendering kit (style A — chunky cartoon iso).
// Self-contained drawing primitives. Same public API as the detailed kit so
// city.js / sim.js don't need to know which style they're rendering.
(function () {
  const { Container, Graphics } = PIXI;
  const { iso, isoCenter, darken, lighten, lerpColor } = PCity;

  const TW = 24, TH = 12;
  const STORY_H = 14;

  const PAL = {
    skyDay:    0x9adcff,
    skyNight:  0x18223f,
    grass:     0x6cc16a,
    grassDark: 0x4ea34d,
    sidewalk:  0xc4bea4,
    sidewalkA: 0xb6b095,
    sidewalkE: 0xa9a386,
    plaza:     0xc4a878,
    plazaA:    0xb39660,
    road:      0x474750,
    roadA:     0x4f4f5a,
    roadLine:  0xf0d040,
    crosswalk: 0xf0e8c4,
    treeLeaf:  0x3da55a,
    treeLeafD: 0x2c7e44,
    treeLeafL: 0x6cc068,
    treeTrunk: 0x6a4626,
    benchWood: 0x8a5a32,
    lampPost:  0x2a2a30,
    lampGlow:  0xffe098,
    fenceWood: 0x6a4626,
  };

  // ---------- helpers --------------------------------------------------
  function drawWindowGrid(g, base1, base2, totalH, cols, col, glow) {
    const stories = Math.floor(totalH / STORY_H);
    const winW = 3, winH = 5;
    for (let s = 0; s < stories; s++) {
      const yMid = -(s * STORY_H + STORY_H / 2 + 1);
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const wx = base1.x + u * (base2.x - base1.x) - winW / 2;
        const wy = base1.y + u * (base2.y - base1.y) + yMid - winH / 2;
        if (glow) g.rect(wx - 1, wy - 1, winW + 2, winH + 2).fill({ color: col, alpha: 0.25 });
        g.rect(wx, wy, winW, winH).fill(col);
      }
    }
  }

  function nightWinColor(role) {
    if (role === 'office') return 0xc8e0ff;
    if (role === 'cafe')   return 0xffd070;
    return 0xfff0a0;
  }

  // ---------- exposed kit ----------------------------------------------
  PCity.RD = {
    TW, TH, STORY_H, PAL,

    drawTile(g, tx, ty, fill) {
      const p = iso(tx, ty, TW, TH);
      g.poly([p.x, p.y, p.x + TW/2, p.y + TH/2, p.x, p.y + TH, p.x - TW/2, p.y + TH/2]).fill(fill);
    },

    // Chunky style has no sidewalk cracks; keep as a no-op so city.js can call it.
    drawSidewalkCrack() {},

    drawGrassTufts(g, tx, ty) {
      const p = iso(tx, ty, TW, TH);
      g.rect(p.x - 4, p.y + TH/2,     1, 1).fill(PAL.grassDark);
      g.rect(p.x + 5, p.y + TH/2 + 1, 1, 1).fill(PAL.grassDark);
    },

    drawCrosswalkStripes(g, tx, ty) {
      const p = iso(tx, ty, TW, TH);
      for (let i = 0; i < 3; i++) {
        const t = (i + 0.3) / 3;
        const a = { x: p.x - TW/2 + t * TW/2,        y: p.y         + (1 - t) * TH/2 };
        const b = { x: p.x         + t * TW/2,        y: p.y + TH/2  + (1 - t) * TH/2 };
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PAL.crosswalk, width: 1.5 });
      }
    },

    // def: { tx, ty, w, h, stories, color, role, door, ... }
    drawBuilding(stage, def, scene) {
      const { tx, ty, w, h, stories, color, role } = def;
      const totalH = stories * STORY_H;

      const back  = iso(tx,     ty,     TW, TH);
      const right = iso(tx + w, ty,     TW, TH);
      const front = iso(tx + w, ty + h, TW, TH);
      const left  = iso(tx,     ty + h, TW, TH);

      const cTop   = lighten(color, 0.05);
      const cRight = darken(color, 0.78);
      const cLeft  = darken(color, 0.6);

      const day = new Graphics();
      // Right wall
      day.poly([
        right.x, right.y,
        front.x, front.y,
        front.x, front.y - totalH,
        right.x, right.y - totalH
      ]).fill(cRight);
      // Left wall (this is the front-facing wall in iso terms — the one with the door)
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
      // Roof rim highlight
      day.poly([
        back.x,  back.y - totalH,
        right.x, right.y - totalH,
        front.x, front.y - totalH,
        left.x,  left.y - totalH,
        back.x,  back.y - totalH
      ]).stroke({ color: lighten(color, 0.2), width: 1, alpha: 0.7 });

      // Day windows (dim slits in building tone)
      const winDay = darken(color, 0.45);
      drawWindowGrid(day, right, front, totalH, Math.max(2, Math.round(w * 2)), winDay, false);
      drawWindowGrid(day, front, left,  totalH, Math.max(2, Math.round(h * 2)), winDay, false);

      // Door — placed at the centre of the front-facing wall (front→left edge)
      const doorMid = { x: (front.x + left.x) / 2, y: (front.y + left.y) / 2 };
      day.rect(doorMid.x - 3, doorMid.y - 9, 6, 8).fill(darken(color, 0.4));
      day.rect(doorMid.x - 2, doorMid.y - 8, 4, 7).fill(darken(color, 0.6));
      day.rect(doorMid.x + 1, doorMid.y - 5, 1, 1).fill(0xf0d050);

      // Awning for cafés / shops
      if (role === 'cafe' || role === 'shop') {
        const awn = role === 'cafe' ? 0xd64c5e : 0x4a92e0;
        day.rect(doorMid.x - 5, doorMid.y - 9, 10, 1).fill(awn);
        day.rect(doorMid.x - 5, doorMid.y - 9, 10, 1).stroke({ color: darken(awn, 0.6), width: 1 });
      }

      // HVAC box on tall buildings
      if (stories >= 4) {
        const rcx = (back.x + front.x) / 2;
        const rcy = (back.y + front.y) / 2 - totalH;
        day.rect(rcx - 5, rcy - 3, 10, 5).fill(darken(color, 0.55));
        day.rect(rcx - 4, rcy - 4, 3, 1).fill(darken(color, 0.4));
      }

      // Sort by front-most tile so things passing in front of the building
      // (cars, pedestrians at higher y) draw on top.
      const frontDepth = (tx + w - 1) + (ty + h - 1);
      day.zIndex = frontDepth * 10 + 5;
      stage.addChild(day);

      // Night windows — drawn above the ambient overlay so they stay warm.
      const winNight = new Graphics();
      const nc = nightWinColor(role);
      drawWindowGrid(winNight, right, front, totalH, Math.max(2, Math.round(w * 2)), nc, true);
      drawWindowGrid(winNight, front, left,  totalH, Math.max(2, Math.round(h * 2)), nc, true);
      winNight.zIndex = 100100 + frontDepth;
      winNight.alpha = 0;
      stage.addChild(winNight);
      scene.windowLights.push(winNight);
    },

    // Small 1×1 family house with peaked roof.
    // def: { tx, ty, color, roofColor, role }
    drawSmallHouse(stage, def, scene) {
      const { tx, ty, color, roofColor, role } = def;
      const wallH = 11;
      const peakH = 7;

      const back  = iso(tx,     ty,     TW, TH);
      const right = iso(tx + 1, ty,     TW, TH);
      const front = iso(tx + 1, ty + 1, TW, TH);
      const left  = iso(tx,     ty + 1, TW, TH);

      const cRight = darken(color, 0.78);
      const cLeft  = darken(color, 0.6);
      const cRoof  = roofColor || 0x8b3a26;
      const cRoofL = lighten(cRoof, 0.15);
      const cRoofD = darken(cRoof, 0.7);

      const day = new Graphics();
      // East wall
      day.poly([right.x, right.y, front.x, front.y, front.x, front.y - wallH, right.x, right.y - wallH]).fill(cRight);
      // South wall (front-facing)
      day.poly([front.x, front.y, left.x, left.y, left.x, left.y - wallH, front.x, front.y - wallH]).fill(cLeft);

      // Door on south wall (centred)
      const doorMid = { x: (front.x + left.x) / 2, y: (front.y + left.y) / 2 };
      day.rect(doorMid.x - 2, doorMid.y - 7, 4, 6).fill(darken(color, 0.4));
      day.rect(doorMid.x - 1, doorMid.y - 6, 2, 5).fill(darken(color, 0.6));
      day.rect(doorMid.x + 1, doorMid.y - 4, 1, 1).fill(0xf0d050);

      // Window on east wall
      const winE = { x: (right.x + front.x) / 2, y: (right.y + front.y) / 2 };
      day.rect(winE.x - 1.5, winE.y - 7, 3, 3).fill(darken(color, 0.45));
      day.rect(winE.x - 1.5, winE.y - 7, 3, 1).fill(darken(color, 0.3));

      // Top corners of walls
      const aT = { x: back.x,  y: back.y  - wallH };
      const bT = { x: right.x, y: right.y - wallH };
      const cT = { x: front.x, y: front.y - wallH };
      const dT = { x: left.x,  y: left.y  - wallH };

      // Peak ends — peak ridge runs iso x direction
      const peakW = { x: (aT.x + dT.x) / 2, y: (aT.y + dT.y) / 2 - peakH };
      const peakE = { x: (bT.x + cT.x) / 2, y: (bT.y + cT.y) / 2 - peakH };

      // East gable (continuation of east wall up to peak)
      day.poly([bT.x, bT.y, cT.x, cT.y, peakE.x, peakE.y]).fill(cRight);
      // South-facing roof slope
      day.poly([cT.x, cT.y, dT.x, dT.y, peakW.x, peakW.y, peakE.x, peakE.y]).fill(cRoofL);
      // Roof edges + ridge
      day.moveTo(cT.x, cT.y).lineTo(peakE.x, peakE.y).stroke({ color: cRoofD, width: 1, alpha: 0.7 });
      day.moveTo(dT.x, dT.y).lineTo(peakW.x, peakW.y).stroke({ color: cRoofD, width: 1, alpha: 0.7 });
      day.moveTo(peakW.x, peakW.y).lineTo(peakE.x, peakE.y).stroke({ color: cRoofD, width: 1.2 });

      // Chimney near west end of ridge
      const chimX = peakW.x + 2;
      const chimY = peakW.y - 1;
      day.rect(chimX, chimY - 4, 2, 5).fill(0x6a4030);
      day.rect(chimX, chimY - 4, 2, 1).fill(0x3a2018);

      const frontDepth = tx + ty;
      day.zIndex = frontDepth * 10 + 5;
      stage.addChild(day);

      // Night window glow
      const winNight = new Graphics();
      const nc = nightWinColor(role);
      winNight.rect(winE.x - 1.5, winE.y - 7, 3, 3).fill(nc);
      winNight.rect(winE.x - 2, winE.y - 7.5, 4, 4).fill({ color: nc, alpha: 0.3 });
      winNight.rect(doorMid.x - 1.5, doorMid.y - 5, 3, 1).fill({ color: nc, alpha: 0.4 });
      winNight.zIndex = 100100 + frontDepth;
      winNight.alpha = 0;
      stage.addChild(winNight);
      scene.windowLights.push(winNight);
    },

    drawTree(stage, t) {
      const p = iso(t.tx, t.ty, TW, TH);
      const g = new Graphics();
      g.rect(p.x - 1.5, p.y - 4, 3, 8).fill(PAL.treeTrunk);
      g.ellipse(p.x - 3, p.y - 7,  6, 5).fill(PAL.treeLeafD);
      g.ellipse(p.x + 3, p.y - 8,  6, 5).fill(PAL.treeLeafD);
      g.ellipse(p.x,     p.y - 11, 7, 6).fill(PAL.treeLeaf);
      g.ellipse(p.x - 1, p.y - 13, 4, 3).fill(PAL.treeLeafL);
      g.zIndex = (t.tx + t.ty) * 10 + 4;
      stage.addChild(g);
    },

    drawLamp(stage, scene, l) {
      const p = iso(l.tx, l.ty, TW, TH);
      const day = new Graphics();
      day.rect(p.x - 0.5, p.y - 14, 1, 14).fill(PAL.lampPost);
      day.rect(p.x - 2, p.y - 16, 4, 2).fill(PAL.lampPost);
      day.rect(p.x - 1.5, p.y - 16, 3, 1).fill(darken(PAL.lampPost, 0.6));
      day.zIndex = (l.tx + l.ty) * 10 + 3;
      stage.addChild(day);

      const night = new Graphics();
      night.circle(p.x, p.y - 15, 8).fill({ color: PAL.lampGlow, alpha: 0.18 });
      night.circle(p.x, p.y - 15, 4).fill({ color: PAL.lampGlow, alpha: 0.4 });
      night.rect(p.x - 1, p.y - 15, 2, 1).fill(0xffffd0);
      night.ellipse(p.x, p.y + 3, 14, 4).fill({ color: PAL.lampGlow, alpha: 0.18 });
      night.zIndex = 100200 + (l.tx + l.ty);
      night.alpha = 0;
      stage.addChild(night);
      scene.windowLights.push(night);
    },

    drawBench(stage, tx, ty) {
      const p = iso(tx, ty, TW, TH);
      const g = new Graphics();
      g.rect(p.x - 7, p.y - 1, 14, 2).fill(PAL.benchWood);
      g.rect(p.x - 7, p.y - 4, 14, 2).fill(darken(PAL.benchWood, 0.7));
      g.rect(p.x - 6, p.y + 1, 1, 3).fill(0x222226);
      g.rect(p.x + 5, p.y + 1, 1, 3).fill(0x222226);
      g.zIndex = (tx + ty) * 10 + 3;
      stage.addChild(g);
    },

    drawFlowerBed(stage, tx, ty) {
      const p = iso(tx, ty, TW, TH);
      const g = new Graphics();
      g.rect(p.x - 6, p.y, 12, 4).fill(0x6a4030);
      g.rect(p.x - 5, p.y + 1, 10, 2).fill(0x4a2818);
      const seeds = [-4, -2, 0, 2, 4];
      seeds.forEach((sx, i) => {
        const col = i % 2 === 0 ? 0xd64a4a : 0xf0d040;
        g.rect(p.x + sx, p.y + 1, 1, 1).fill(col);
        g.rect(p.x + sx + 1, p.y + 2, 1, 1).fill(col);
      });
      g.zIndex = (tx + ty) * 10 + 2;
      stage.addChild(g);
    },

    drawFountain(stage, tx, ty) {
      const p = iso(tx, ty, TW, TH);
      const g = new Graphics();
      g.ellipse(p.x, p.y, 14, 6).fill(0x6c604e);
      g.ellipse(p.x, p.y, 11, 5).fill(0x4ab0e0);
      g.rect(p.x - 1, p.y - 5, 2, 5).fill(0x6c604e);
      g.circle(p.x, p.y - 7, 2).fill(0xa8d8f0);
      g.circle(p.x, p.y - 8, 1).fill(0xe0f0ff);
      g.zIndex = (tx + ty) * 10 + 3;
      stage.addChild(g);
    },

    // ---------- person ----------------------------------------------
    makePerson(skin, shirt, _pants, hair) {
      const g = new Graphics();
      // legs
      g.rect(-2, -3, 1, 3).fill(0x2c2c38);
      g.rect( 1, -3, 1, 3).fill(0x2c2c38);
      // body
      g.rect(-2, -7, 4, 4).fill(shirt);
      g.rect( 1, -7, 1, 4).fill(darken(shirt, 0.75));
      // head
      g.rect(-2, -10, 4, 3).fill(skin);
      g.rect( 1, -10, 1, 3).fill(darken(skin, 0.85));
      // hair cap
      g.rect(-2, -10, 4, 1).fill(hair);
      return g;
    },

    // ---------- vehicles (iso boxes) --------------------------------
    // Vehicle drawn as a 4-corner iso parallelogram extruded by H pixels.
    // Camera sees three faces: roof, +x face (front when going right) and
    // +y face (right side of vehicle, the long side facing the viewer).
    //
    // Box corners on the ground plane (centred at origin):
    //   a = back  (-x, -y)         b = right-front (+x, -y)
    //   d = back-left (-x, +y)     c = front (+x, +y)
    isoBoxCorners(L, W) {
      return {
        a: { x: ((-L/2) - (-W/2)) * TW/2, y: ((-L/2) + (-W/2)) * TH/2 },
        b: { x: (( L/2) - (-W/2)) * TW/2, y: (( L/2) + (-W/2)) * TH/2 },
        c: { x: (( L/2) -  (W/2)) * TW/2, y: (( L/2) +  (W/2)) * TH/2 },
        d: { x: ((-L/2) -  (W/2)) * TW/2, y: ((-L/2) +  (W/2)) * TH/2 },
      };
    },

    drawIsoBox(g, L, W, H, body, opts) {
      opts = opts || {};
      const { a, b, c, d } = PCity.RD.isoBoxCorners(L, W);
      const halfH = H / 2;
      const cTop = opts.roofColor !== undefined ? opts.roofColor : darken(body, 0.85);
      const cFront = darken(body, 0.78);  // +x face
      const cSide  = darken(body, 0.6);   // +y face
      const cWin   = opts.windowColor !== undefined ? opts.windowColor : 0xa8d0e8;
      const winLong  = opts.windowsLong  || 4;
      const winShort = opts.windowsShort || 1;

      // +x face (front)
      g.poly([b.x, b.y, c.x, c.y, c.x, c.y - halfH, b.x, b.y - halfH]).fill(cFront);
      g.poly([b.x, b.y - halfH, c.x, c.y - halfH, c.x, c.y - H, b.x, b.y - H]).fill(cWin);
      for (let i = 1; i < winShort; i++) {
        const t = i / winShort;
        const x = b.x + (c.x - b.x) * t;
        const y = b.y + (c.y - b.y) * t;
        g.moveTo(x, y - halfH).lineTo(x, y - H).stroke({ color: cTop, width: 1 });
      }

      // +y face (long side facing viewer)
      g.poly([c.x, c.y, d.x, d.y, d.x, d.y - halfH, c.x, c.y - halfH]).fill(cSide);
      g.poly([c.x, c.y - halfH, d.x, d.y - halfH, d.x, d.y - H, c.x, c.y - H]).fill(cWin);
      for (let i = 1; i < winLong; i++) {
        const t = i / winLong;
        const x = c.x + (d.x - c.x) * t;
        const y = c.y + (d.y - c.y) * t;
        g.moveTo(x, y - halfH).lineTo(x, y - H).stroke({ color: cTop, width: 1 });
      }
      // Beltline highlight (thin lighter line right at halfH)
      g.moveTo(c.x, c.y - halfH).lineTo(d.x, d.y - halfH).stroke({ color: lighten(body, 0.2), width: 1, alpha: 0.5 });

      // Roof
      g.poly([a.x, a.y - H, b.x, b.y - H, c.x, c.y - H, d.x, d.y - H]).fill(cTop);
      g.poly([a.x, a.y - H, b.x, b.y - H, c.x, c.y - H, d.x, d.y - H, a.x, a.y - H])
        .stroke({ color: lighten(cTop, 0.2), width: 1, alpha: 0.6 });

      return { a, b, c, d };
    },

    makeCar(col) {
      const g = new Graphics();
      const L = 1.4, W = 0.6, H = 8;
      const { a, b, c, d } = PCity.RD.isoBoxCorners(L, W);

      PCity.RD.drawIsoBox(g, L, W, H, col, { windowsLong: 3, windowsShort: 1 });

      // Wheels along +y side (front + back), drawn slightly below edge c-d
      const wf = { x: c.x + (d.x - c.x) * 0.2, y: c.y + (d.y - c.y) * 0.2 + 1.2 };
      const wb = { x: c.x + (d.x - c.x) * 0.8, y: c.y + (d.y - c.y) * 0.8 + 1.2 };
      g.ellipse(wf.x, wf.y, 2.2, 1.3).fill(0x18181c);
      g.ellipse(wb.x, wb.y, 2.2, 1.3).fill(0x18181c);

      // Headlight at front-left of +x face
      const hMid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
      g.rect(hMid.x - 1, hMid.y - 1.5, 2, 1).fill(0xfff2a0);
      // Tail light on -x side (peek of back-left)
      const tMid = { x: (a.x + d.x) / 2, y: (a.y + d.y) / 2 };
      g.rect(tMid.x - 1, tMid.y - 2, 2, 1).fill(0xc62828);
      return g;
    },

    makeTram() {
      const body = 0xe8c440, trim = 0x4a3a18;
      const g = new Graphics();
      const L = 2.0, W = 0.7, H = 11;
      const { a, b, c, d } = PCity.RD.isoBoxCorners(L, W);

      PCity.RD.drawIsoBox(g, L, W, H, body, {
        windowsLong: 5, windowsShort: 1,
        roofColor: trim,
      });

      // Pantograph on roof centre
      g.moveTo(0, -H).lineTo(-3, -H - 4).stroke({ color: trim, width: 1 });
      g.moveTo(0, -H).lineTo( 3, -H - 4).stroke({ color: trim, width: 1 });
      g.rect(-5, -H - 5, 10, 1).fill(trim);

      // Wheels
      const wf = { x: c.x + (d.x - c.x) * 0.15, y: c.y + (d.y - c.y) * 0.15 + 1.3 };
      const wb = { x: c.x + (d.x - c.x) * 0.85, y: c.y + (d.y - c.y) * 0.85 + 1.3 };
      g.ellipse(wf.x, wf.y, 2.5, 1.5).fill(0x18181c);
      g.ellipse(wb.x, wb.y, 2.5, 1.5).fill(0x18181c);
      return g;
    },

    makeTrainEngine() {
      const body = 0xc63838, roof = 0x3a1808, trim = 0xfff080;
      const g = new Graphics();
      const L = 2.8, W = 0.85, H = 16;
      const { a, b, c, d } = PCity.RD.isoBoxCorners(L, W);

      PCity.RD.drawIsoBox(g, L, W, H, body, {
        windowsLong: 5, windowsShort: 1,
        roofColor: roof,
      });

      // Headlight on +x face, lower-front
      const hMid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
      g.rect(hMid.x - 1, hMid.y - 4, 2, 1.5).fill(trim);

      // Smokestack on roof, towards front
      const stackX = (a.x + b.x) * 0.35 + (b.x - a.x) * 0.35;
      const stackY = (a.y + b.y) * 0.35 + (b.y - a.y) * 0.35 - H;
      g.rect(stackX - 1.5, stackY - 3, 3, 3).fill(0x18181c);
      g.rect(stackX - 2, stackY - 4, 4, 1).fill(0x404048);

      // Wheel sets along +y side
      for (const t of [0.12, 0.36, 0.62, 0.88]) {
        const wx = c.x + (d.x - c.x) * t;
        const wy = c.y + (d.y - c.y) * t + 1.4;
        g.ellipse(wx, wy, 2.3, 1.5).fill(0x18181c);
      }
      return g;
    },

    makeTrainCar() {
      const body = 0xc63838, roof = 0x3a1808;
      const g = new Graphics();
      const L = 2.4, W = 0.85, H = 16;
      const { a, b, c, d } = PCity.RD.isoBoxCorners(L, W);

      PCity.RD.drawIsoBox(g, L, W, H, body, {
        windowsLong: 4, windowsShort: 1,
        roofColor: roof,
      });

      // Couplers (small bumps front and back)
      const fMid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
      const rMid = { x: (a.x + d.x) / 2, y: (a.y + d.y) / 2 };
      g.rect(fMid.x - 0.5, fMid.y - 2, 1, 2).fill(0x18181c);
      g.rect(rMid.x - 0.5, rMid.y - 3, 1, 2).fill(0x18181c);

      // Wheels
      for (const t of [0.18, 0.42, 0.58, 0.82]) {
        const wx = c.x + (d.x - c.x) * t;
        const wy = c.y + (d.y - c.y) * t + 1.4;
        g.ellipse(wx, wy, 2.1, 1.4).fill(0x18181c);
      }
      return g;
    },

    drawElevatedTrack(stage, gridW, trackRow, ZH) {
      const beam = 0x6b6f78, rail = 0xb8bcc4, sleeper = 0x5a4030;
      const g = new Graphics();
      // pillars
      for (let x = 0; x <= gridW; x += 2) {
        const p = iso(x, trackRow, TW, TH);
        g.rect(p.x - 2, p.y - ZH, 4, ZH).fill(beam);
        g.rect(p.x - 1, p.y - ZH, 1, ZH).fill(darken(beam, 0.7));
        g.rect(p.x - 4, p.y - 3,  8, 3).fill(darken(beam, 0.6));
      }
      // deck beam
      const a = iso(0, trackRow, TW, TH);
      const b = iso(gridW, trackRow, TW, TH);
      g.poly([a.x, a.y - ZH, b.x, b.y - ZH, b.x, b.y - ZH + 5, a.x, a.y - ZH + 5]).fill(beam);
      g.poly([a.x, a.y - ZH + 4, b.x, b.y - ZH + 4, b.x, b.y - ZH + 5, a.x, a.y - ZH + 5]).fill(darken(beam, 0.6));
      // sleepers
      for (let x = 0; x < gridW; x += 0.5) {
        const p = iso(x, trackRow, TW, TH);
        g.rect(p.x - 4, p.y - ZH - 1, 8, 1).fill(sleeper);
      }
      // two rails
      g.moveTo(a.x, a.y - ZH - 3).lineTo(b.x, b.y - ZH - 3).stroke({ color: rail, width: 1 });
      g.moveTo(a.x, a.y - ZH - 1).lineTo(b.x, b.y - ZH - 1).stroke({ color: rail, width: 1 });
      g.zIndex = -10;
      stage.addChild(g);
    },

    paintSky(g, top, bot, w, h) {
      g.clear();
      const bands = 30;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        g.rect(0, (i / bands) * h, w, h / bands + 1).fill(lerpColor(top, bot, t));
      }
    },

    skyForTime(t) {
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
      return { top, bot };
    },
  };
})();
