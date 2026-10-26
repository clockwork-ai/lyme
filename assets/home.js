/* Lyme home page. The engine drives the acts; this file is the page's own behaviour:
   1. the hero pipe run, read off the hero's --sc-p: copper reaches each fitting in turn, stops dead at the boiler,
      then carries on out through the wall to the heat pump
   2. "Point at the problem": the fault finder (the signature move)
   3. per-row swipe-ins for the job key and the reviews line */
ScrollCraft.mount(document.body);

/* phones get the drawing cropped in to the house, so it reads at 390px */
(function () {
  var mq = matchMedia('(max-width: 860px)');
  function crop() {
    document.querySelectorAll('svg.house').forEach(function (s) {
      if (!s.dataset.vbWide) s.dataset.vbWide = s.getAttribute('viewBox');
      s.setAttribute('viewBox', mq.matches ? s.dataset.vbPhone : s.dataset.vbWide);
    });
    var vb = (mq.matches ? document.querySelector('svg.house').dataset.vbPhone : '0 0 1000 720').split(' ').map(Number);
    document.querySelectorAll('.spot').forEach(function (b) {
      b.style.left = ((b.dataset.x - vb[0]) / vb[2] * 100).toFixed(2) + '%';
      b.style.top = ((b.dataset.y - vb[1]) / vb[3] * 100).toFixed(2) + '%';
    });
  }
  crop();
  (mq.addEventListener ? mq.addEventListener('change', crop) : mq.addListener(crop));
})();

(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 1. hero */
  var hero = document.getElementById('hero');
  var svg = hero.querySelector('.house');
  var cap = hero.querySelector('[data-cap]');
  // key, from, to (hero progress), caption once it's lit
  var RUN = [
    ['stopcock', 0.02, 0.07, 'Stopcock: where your water comes in.'],
    ['tap', 0.07, 0.13, 'Kitchen tap: <em>that’s me.</em>'],
    ['outside', 0.13, 0.19, 'Outside tap: <em>me.</em>'],
    ['basin', 0.19, 0.25, 'Basin and taps: <em>me.</em>'],
    ['toilet', 0.25, 0.30, 'Toilet: <em>me.</em>'],
    ['cylinder', 0.30, 0.36, 'Hot water tank, unvented or standard: <em>me.</em>'],
    ['leak', 0.36, 0.41, 'Water where it shouldn’t be: <em>me.</em>'],
    ['pump', 0.41, 0.47, 'Pump and valves: <em>me.</em>'],
    ['rad1', 0.47, 0.53, 'Radiators: <em>me.</em>'],
    ['rad2', 0.53, 0.58, 'Radiators: <em>me.</em>'],
    ['stat', 0.58, 0.63, 'Smart thermostat and controls: <em>me.</em>'],
    ['toboiler', 0.63, 0.71, 'And the boiler?'],
    ['heatpump', 0.79, 0.87, 'Heat pump outside? <em>That’s me.</em>'],
  ];
  // the boiler gets its own beat between the last pipe inside and the run out to the heat pump
  var BOILER_AT = 0.72, DONE_AT = 0.89, ANGLE_AT = 0.95;
  var BOILER = '<span class="no">Boiler: not me.</span> That’s a Gas Safe engineer.';
  var DONE = '<span class="no">Boiler: not me.</span> Heat pump: <em>me.</em>';
  var ANGLE = 'The bloke who quotes it is <em>the bloke who fixes it.</em>';
  var pipes = {}, marks = {}, drips = svg.querySelector('.drips'), hpu = svg.querySelector('.hpu');
  svg.querySelectorAll('.pipe').forEach(function (p) { pipes[p.dataset.k] = p; });
  svg.querySelectorAll('.mk').forEach(function (m) { marks[m.dataset.k] = m; });
  var lastCap = null;
  function setCap(html) { if (html !== lastCap) { lastCap = html; cap.innerHTML = html; } }

  function paint(p) {
    var capHtml = 'Here’s what I do.';
    RUN.forEach(function (r) {
      var t = Math.min(1, Math.max(0, (p - r[1]) / (r[2] - r[1])));
      if (pipes[r[0]]) pipes[r[0]].style.strokeDashoffset = (1 - t).toFixed(4);
      var m = marks[r[0]];
      if (m) { m.classList.toggle('is-lit', t >= 1); m.classList.toggle('is-near', t > 0); }
      if (r[0] === 'leak' && drips) drips.classList.toggle('is-lit', t >= 1);
      if (r[0] === 'heatpump' && hpu) hpu.classList.toggle('is-lit', t >= 1);
      if (t > 0.5 && (r[0] !== 'heatpump' || p >= BOILER_AT)) capHtml = r[3];
      if (r[0] === 'toboiler' && p >= BOILER_AT) capHtml = BOILER;
    });
    hero.classList.toggle('is-boiler', p >= BOILER_AT);
    var done = p >= DONE_AT;
    hero.classList.toggle('is-done', done);
    if (done) capHtml = p >= ANGLE_AT ? ANGLE : DONE;
    setCap(capHtml);
  }

  if (reduce) { paint(1); }
  else {
    var lastP = -1;
    (function tick() {
      var p = parseFloat(hero.style.getPropertyValue('--sc-p')) || 0;
      if (Math.abs(p - lastP) > 0.0005) { lastP = p; paint(p); }
      requestAnimationFrame(tick);
    })();
  }

  /* ------------------------------------------- 2. point at the problem */
  var finder = document.querySelector('.finder');
  if (finder) {
    var fsvg = finder.querySelector('.house');
    var answers = {};
    finder.querySelectorAll('[data-answer]').forEach(function (a) { answers[a.dataset.answer] = a; });
    var chips = [].slice.call(finder.querySelectorAll('.chip'));
    var spots = [].slice.call(finder.querySelectorAll('.spot'));
    var fmarks = {};
    fsvg.querySelectorAll('.mk').forEach(function (m) { fmarks[m.dataset.k] = m; });
    var boilerG = fsvg.querySelector('.boiler'), fhpu = fsvg.querySelector('.hpu');
    var current = '';
    function show(k, fromSpot) {
      current = (k === current && fromSpot) ? '' : k;
      Object.keys(answers).forEach(function (key) {
        var on = key === current;
        answers[key].hidden = !on;
        if (on) { answers[key].classList.remove('is-in'); void answers[key].offsetWidth; answers[key].classList.add('is-in'); }
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.fault === current ? 'true' : 'false'); });
      spots.forEach(function (s) { s.classList.toggle('is-on', s.dataset.fault === current); });
      Object.keys(fmarks).forEach(function (key) { fmarks[key].classList.toggle('is-on', key === current); });
      boilerG.classList.toggle('is-on', current === 'boiler');
      if (fhpu) fhpu.classList.toggle('is-on', current === 'heatpump');
    }
    function reveal() {
      if (!matchMedia('(max-width: 860px)').matches) return;
      var a = answers[current] || answers[''], r = a && a.getBoundingClientRect();
      if (r && (r.top < 70 || r.bottom > innerHeight - 80)) a.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { show(c.dataset.fault, false); reveal(); }); });
    spots.forEach(function (s) {
      s.addEventListener('click', function () {
        show(s.dataset.fault, true);
        reveal(); // on a phone the answer sits under the drawing
      });
    });
  }

  /* ----------------------------------------------------- 3. swipe-ins */
  var swipes = [].slice.call(document.querySelectorAll('.swipe, .drawin'));
  function checkSwipes() {
    swipes = swipes.filter(function (s, i) {
      if (reduce || s.getBoundingClientRect().top < innerHeight * 0.9) {
        setTimeout(function () { s.classList.add('in'); }, reduce ? 0 : 70 * (s.parentElement.children.length > 1 ? [].indexOf.call(s.parentElement.children, s) % 5 : 0));
        return false;
      }
      return true;
    });
  }
  addEventListener('scroll', checkSwipes, { passive: true }); checkSwipes();
})();
