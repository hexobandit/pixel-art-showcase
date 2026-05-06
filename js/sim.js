// Sim — agents, schedules, vehicles. Operates in tile coords.
(function () {
  const { Container } = PIXI;
  const { isoCenter, iso, mulberry32 } = PCity;
  const { City, RD } = PCity;
  const { TW, TH } = RD;

  function pickRandom(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

  // Resident — has a home, work, lunch & leisure spots; schedule by hour-of-day.
  class Resident {
    constructor(id, world, rng) {
      this.id = id;
      this.world = world;
      this.rng = rng;

      const homes   = world.buildings.filter(b => b.role === 'home');
      const works   = world.buildings.filter(b => ['office', 'cafe', 'shop'].includes(b.role));
      const cafes   = world.buildings.filter(b => b.role === 'cafe');
      const leisure = world.buildings.filter(b => ['cafe', 'park'].includes(b.role));

      this.home      = pickRandom(homes, rng);
      this.work      = pickRandom(works, rng);
      this.lunchSpot = pickRandom(cafes, rng);
      this.favSpot   = pickRandom(leisure, rng);

      this.offset = (rng() - 0.5) * 1.8;          // ±0.9 sim hours
      this.speed  = 1.0 + rng() * 0.5;            // tiles per second

      const SKINS  = [0xf0c89a, 0xd9a070, 0xa86c44, 0xefd0a8];
      const SHIRTS = [0xc24848, 0x4882c0, 0xc8a040, 0x4a8060, 0x8852a0, 0xb86a3a, 0xe8e0d0, 0x6a8cd0, 0xd06a8c];
      const PANTS  = [0x3a4258, 0x2a3040, 0x4a3a2a, 0x202028];
      const HAIRS  = [0x2a1a10, 0x6a4626, 0xc89048, 0x18181c, 0x90562a];
      this.skin  = pickRandom(SKINS,  rng);
      this.shirt = pickRandom(SHIRTS, rng);
      this.pants = pickRandom(PANTS,  rng);
      this.hair  = pickRandom(HAIRS,  rng);

      this.sprite = RD.makePerson(this.skin, this.shirt, this.pants, this.hair);
      this.sprite.visible = false;

      this.state = 'inside';        // 'inside' | 'walking' | 'idle'
      this.currentBuilding = this.home;
      this.x = this.home.door.x;
      this.y = this.home.door.y;
      this.path = null;
      this.pathIdx = 0;
      this.targetBuilding = this.home;
      this.lastTargetId = this.home.id;
      this.bobPhase = rng() * Math.PI * 2;
      this.idleUntil = 0;
      this.parkPos = null;
    }

    desiredTarget(hour) {
      const h = ((hour - this.offset) + 24) % 24;
      if (h < 7 || h >= 22) return this.home;
      if (h < 9)  return this.work;
      if (h < 12) return this.work;
      if (h < 13) return this.lunchSpot;
      if (h < 17) return this.work;
      if (h < 21) return this.favSpot;
      return this.home;
    }

    update(dt, hour) {
      const desired = this.desiredTarget(hour);
      if (this.state === 'inside' || this.state === 'idle') {
        if (desired.id !== (this.currentBuilding ? this.currentBuilding.id : null)) {
          this.exit(desired);
        }
      }
      if (this.state === 'walking') this.advance(dt);
      if (this.state === 'idle') {
        this.bobPhase += dt * 4; // gentle idle bob
      }
    }

    exit(target) {
      // If we're idling outdoors (e.g., in the park) start from current position;
      // otherwise emerge from the previous building's door.
      const fromIdle = this.state === 'idle';
      const start = fromIdle
        ? { x: Math.round(this.x), y: Math.round(this.y) }
        : this.currentBuilding.door;
      this.x = start.x;
      this.y = start.y;
      this.targetBuilding = target;
      this.lastTargetId = target.id;
      const goal = this.destinationTile(target);
      const path = this.world.findPath(start, goal);
      if (!path || path.length < 2) { return; } // stuck — stay put
      this.path = path;
      this.pathIdx = 0;
      this.state = 'walking';
      this.currentBuilding = null;
      this.sprite.visible = true;
      this.parkPos = null;
    }

    destinationTile(target) {
      if (target.role === 'park') {
        // Pick a random tile inside the park area.
        const px = 6 + Math.floor(this.rng() * 4); // 6..9
        const py = 20 + Math.floor(this.rng() * 2); // 20..21
        return { x: px, y: py };
      }
      return target.door;
    }

    advance(dt) {
      if (!this.path || this.pathIdx >= this.path.length - 1) {
        this.arrive();
        return;
      }
      const next = this.path[this.pathIdx + 1];
      const dx = next.x - this.x;
      const dy = next.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.05) { this.pathIdx++; return; }
      const move = Math.min(this.speed * dt, d);
      this.x += dx / d * move;
      this.y += dy / d * move;
      this.bobPhase += dt * 8;
    }

    arrive() {
      const t = this.targetBuilding;
      if (t.role === 'park') {
        // Hang out at park — sprite stays visible, gentle idle.
        this.state = 'idle';
        this.currentBuilding = t;
        this.path = null;
        return;
      }
      // Enter building — hide sprite.
      this.state = 'inside';
      this.currentBuilding = t;
      this.path = null;
      this.sprite.visible = false;
    }
  }

  // -------------------------------------------------------------------
  class Sim {
    constructor(world, scene, container) {
      this.world = world;
      this.scene = scene;
      this.world_container = container;
      this.simHour = 7.5;
      this.simSpeed = 24 / 480; // sim hours per real second; 1 day = 8 min
      this.paused = false;
      this.residents = [];
      this.cars = [];
    }

    spawn() {
      const rng = mulberry32(2026);
      // Residents
      for (let i = 0; i < 25; i++) {
        const r = new Resident(i, this.world, rng);
        this.world_container.addChild(r.sprite);
        this.residents.push(r);
      }

      // Tram — sits on the centre line between the two road rows (iso y = 7.0,
      // so lane = 6.5 because isoCenter adds 0.5).
      this.tram = {
        sprite: RD.makeTram(),
        x: -3,
        lane: 6.5,
        speed: 2.0,
        dir: 1,
      };
      this.world_container.addChild(this.tram.sprite);

      // Cars — `lane` is the tile-row index used with isoCenter (which adds +0.5
      // to land on tile centre). Road occupies rows 6 & 7, so use 6 and 7.
      const carCols = [0x9c2828, 0x2c5d96, 0xefefe0, 0x404048, 0x6a8c4a];
      for (let i = 0; i < 4; i++) {
        const goingRight = i % 2 === 0;
        const lane = goingRight ? 6 : 7;
        const c = {
          sprite: RD.makeCar(carCols[i % carCols.length]),
          x: goingRight ? -2 + i * 5 : City.MAP_W + 2 - i * 5,
          y: lane,
          speed: 2.2 + rng() * 0.6,
          dir: goingRight ? 1 : -1,
          lane,
        };
        this.world_container.addChild(c.sprite);
        this.cars.push(c);
      }

      // Train (engine + 2 cars). Spacing has to follow the iso x axis so
      // each car sits a bit "up and to the left" of the engine in screen space.
      const trainContainer = new Container();
      const engine = RD.makeTrainEngine();
      const car1 = RD.makeTrainCar();
      const car2 = RD.makeTrainCar();
      // Engine length 2.8, car length 2.4, +0.1 gap between bodies (in tile units).
      const car1Offset = -(2.8/2 + 0.1 + 2.4/2);                // -2.7
      const car2Offset = -(2.8/2 + 0.1 + 2.4 + 0.1 + 2.4/2);    // -5.2
      car1.x = car1Offset * TW / 2; car1.y = car1Offset * TH / 2;
      car2.x = car2Offset * TW / 2; car2.y = car2Offset * TH / 2;
      trainContainer.addChild(car2, car1, engine);
      // zIndex is recomputed every frame from the train's iso position so that
      // taller buildings closer to the camera (higher x+y) correctly occlude it.
      this.world_container.addChild(trainContainer);
      this.train = {
        container: trainContainer,
        x: -8,
        row: 0.5,
        ZH: 38,
        speed: 4.5,
        stopX: 12.5,         // station's x centre
        state: 'approaching', // 'approaching' | 'stopped' | 'leaving'
        stopUntil: 0,
      };
    }

    update(dt) {
      if (this.paused) return;
      this.simHour = (this.simHour + dt * this.simSpeed) % 24;

      for (const r of this.residents) {
        r.update(dt, this.simHour);
        const p = isoCenter(r.x, r.y, TW, TH);
        const bob = (r.state === 'walking') ? Math.sin(r.bobPhase) * 0.5 : Math.sin(r.bobPhase) * 0.2;
        r.sprite.x = p.x;
        r.sprite.y = p.y + bob;
        // +0.5 so a mobile object at the same depth as a static prop wins on top.
        r.sprite.zIndex = (r.x + r.y) * 10 + 0.5;
      }

      // Tram — sprite.y offset puts the wheels on the road centerline (the
      // sprite anchor is the centre of the box's ground plane, so we shift
      // down by ~average wheel sprite-y to land wheels on the surface).
      const t = this.tram;
      t.x += t.dir * t.speed * dt;
      if (t.x > City.MAP_W + 4) t.x = -4;
      {
        const p = isoCenter(t.x, t.lane, TW, TH);
        t.sprite.x = p.x;
        t.sprite.y = p.y - 3;
        t.sprite.zIndex = (t.x + t.lane + 0.5) * 10 + 0.5;
      }

      // Cars
      for (const c of this.cars) {
        c.x += c.dir * c.speed * dt;
        if (c.dir > 0 && c.x > City.MAP_W + 2) c.x = -2;
        if (c.dir < 0 && c.x < -2)             c.x = City.MAP_W + 2;
        const p = isoCenter(c.x, c.lane, TW, TH);
        c.sprite.x = p.x;
        c.sprite.y = p.y - 3;
        c.sprite.scale.x = c.dir > 0 ? 1 : -1;
        c.sprite.zIndex = (c.x + c.lane + 0.5) * 10 + 0.5;
      }

      // Train
      const tr = this.train;
      const now = performance.now();
      if (tr.state === 'stopped') {
        if (now > tr.stopUntil) {
          tr.state = 'leaving';
        }
      } else {
        tr.x += tr.speed * dt;
        if (tr.state === 'approaching' && tr.x >= tr.stopX) {
          tr.x = tr.stopX;
          tr.state = 'stopped';
          tr.stopUntil = now + 4000;
        }
        if (tr.x > City.MAP_W + 6) {
          // loop back
          tr.x = -8;
          tr.state = 'approaching';
        }
      }
      const trp = iso(tr.x, tr.row, TW, TH);
      tr.container.x = trp.x;
      // Box anchor is the centre of its ground plane. Drop it so the +y face
      // bottom edge sits on the deck top (rail level).
      tr.container.y = trp.y - tr.ZH - 2;
      // Sort by current iso position so tall buildings closer to camera occlude.
      tr.container.zIndex = (tr.x + tr.row) * 10;
    }
  }

  PCity.Sim = Sim;
  PCity.Resident = Resident;
})();
