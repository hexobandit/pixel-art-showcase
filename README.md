# pixel-art-showcase

A growing collection of animated pixel-art scenes (180×320, Endesga 32 palette).
Each scene is a self-contained HTML file with its own mechanics, built so it
could plausibly grow into a small calming game.

## Layout

```
index.html              # gallery
shared/
  engine.js             # tiny canvas + RAF + tap helper, no opinions
  style.css             # mobile-first
scenes/
  01-city-street.html   # cars, pedestrians, day/night, traffic light
  02-forest-clearing.html # swaying trees, deer, birds, falling leaves
  03-fishing-pier.html  # sunset, water, boats, gulls, fisherman
```

## Running

Open `index.html` in any browser, or serve with:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Adding a new scene

1. Copy any `scenes/*.html` as a starting point.
2. Add a `<a class="card">` entry to `index.html`.
3. The engine API:
   ```js
   const scene = Pixel.createScene({ width: 180, height: 320 });
   scene.onTap((x, y) => { /* virtual coords */ });
   scene.start({ update(dt) {}, draw(ctx) {} });
   ```
   Plus helpers: `Pixel.PALETTE`, `Pixel.fillRect`, `Pixel.pixel`, `Pixel.clear`,
   `Pixel.lerp`, `Pixel.lerpColor`, `Pixel.clamp`, `Pixel.rng`.
