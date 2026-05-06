// Bootstrap: build the three scenes, wire up the time slider + auto-cycle.
(async function () {
  const scenes = await Promise.all([
    PCity.buildChunky(document.getElementById('stage-a')),
    PCity.buildChunkyCity(document.getElementById('stage-a-city')),
    PCity.buildDetailed(document.getElementById('stage-b')),
    PCity.buildDetailedCity(document.getElementById('stage-b-city')),
    PCity.buildTopdown(document.getElementById('stage-c')),
    PCity.buildTopdownCity(document.getElementById('stage-c-city')),
  ]);

  const slider = document.getElementById('time');
  const label  = document.getElementById('time-label');
  const playBtn = document.getElementById('play-btn');

  function fmt(min) {
    const h = Math.floor(min / 60) % 24;
    const m = Math.floor(min) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function applyTime(min) {
    const t = (min / 1440) % 1;
    for (const s of scenes) s.setTime(t);
    label.textContent = fmt(min);
  }

  slider.addEventListener('input', () => {
    autoPlay = false;
    playBtn.classList.remove('active');
    playBtn.textContent = '▶ Auto-cycle day';
    applyTime(+slider.value);
  });

  // Auto-cycle: full day loops every ~60 seconds.
  let autoPlay = false;
  let lastTick = performance.now();
  let virtualMin = +slider.value;

  function tick() {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (autoPlay) {
      virtualMin = (virtualMin + dt * (1440 / 60)) % 1440;
      slider.value = String(Math.floor(virtualMin));
      applyTime(virtualMin);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  playBtn.addEventListener('click', () => {
    autoPlay = !autoPlay;
    if (autoPlay) {
      virtualMin = +slider.value;
      lastTick = performance.now();
      playBtn.classList.add('active');
      playBtn.textContent = '⏸ Pause';
    } else {
      playBtn.classList.remove('active');
      playBtn.textContent = '▶ Auto-cycle day';
    }
  });

  applyTime(+slider.value);
})();
