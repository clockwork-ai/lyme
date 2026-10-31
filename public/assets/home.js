/* Lyme home page. The engine drives the acts; this file is the page's own behaviour:
   1. the hero pipe run, read off the hero's --sc-p: copper reaches each fitting in turn and stops at the boiler
   2. "Point at the problem": the fault finder
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
  if (!reduce) document.documentElement.classList.add('sc-animate');

  /* ---------------------------------------------------------------- 1. hero */
  var hero = document.getElementById('hero');
  var svg = hero.querySelector('.house');
  var cap = hero.querySelector('[data-cap]');
  // key, from, to (hero progress), caption once it's lit
  var RUN = [
    ['stopcock', 0.02, 0.08, 'Stopcock: where your water comes in.'],
    ['tap', 0.08, 0.16, 'Kitchen tap: <em>that’s me.</em>'],
    ['outside', 0.16, 0.24, 'Outside tap: <em>me.</em>'],
    ['basin', 0.24, 0.32, 'Basin and taps: <em>me.</em>'],
    ['toilet', 0.32, 0.40, 'Toilet: <em>me.</em>'],
    ['leak', 0.40, 0.48, 'Water where it shouldn’t be: <em>me.</em>'],
    ['pump', 0.48, 0.56, 'Pump and valves: <em>me.</em>'],
    ['rad1', 0.56, 0.62, 'Radiators: <em>me.</em>'],
    ['rad2', 0.62, 0.66, 'Radiators: <em>me.</em>'],
    ['stat', 0.66, 0.72, 'Thermostat and controls: <em>me.</em>'],
    ['cylinder', 0.72, 0.78, 'Hot water cylinder: <em>me.</em>'],
    ['heatpump', 0.78, 0.86, 'Air source heat pump: <em>me.</em>'],
    ['toboiler', 0.86, 0.92, 'And the boiler?'],
  ];
  var BOILER_AT = 0.92, DONE_AT = 0.95, ANGLE_AT = 0.98;
  var BOILER = '<span class="no">Boiler: not me.</span> You\'ll need a gas engineer.';
  var DONE = '<span class="no">Boiler: not me.</span>';
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
      if (t > 0.5) capHtml = r[3];
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
