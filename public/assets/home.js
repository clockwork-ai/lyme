/* Lyme home page. The engine drives the acts; this file is the page's own behaviour:
   1. the hero: the drawing comes to life (grid, pipework run by run, then the photo), read off the hero's --sc-p
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
  // The drawing comes to life. On load the section grid draws and the section line sweeps the pencil drawing in
  // (time-based, so the first screen is never blank paper). Then the act's --sc-p drives the rest: each pipe run
  // draws in turn and its label lights, the caption names what it is, then the dusk photo dissolves in over the
  // drawing and the page turns from paper to dusk. Reduced motion skips all of it and shows the photo.
  var hero = document.getElementById('hero');
  if (hero && !reduce) {
    document.documentElement.classList.add('js-scene');
    var plan = hero.querySelector('.scene__plan'), cut = hero.querySelector('.scene__cut');
    var draw = hero.querySelector('.scene__draw');
    var caps = [].slice.call(hero.querySelectorAll('.scene__caps li'));
    var cap = hero.querySelector('[data-cap]');
    var prog = hero.querySelector('.scene__prog');
    var lines = [].slice.call(plan.querySelectorAll('.g-datum line, .g-axis line'));
    var texts = [].slice.call(plan.querySelectorAll('.g-text text, .g-key'));
    var runs = {}, marks = {}, syms = {};
    plan.querySelectorAll('.run').forEach(function (r) { runs[r.dataset.k] = r; r.style.strokeDashoffset = 1; });
    plan.querySelectorAll('.mk').forEach(function (m) { marks[m.dataset.k] = m; });
    plan.querySelectorAll('.sym').forEach(function (m) { (syms[m.dataset.k] = syms[m.dataset.k] || []).push(m); });
    // key, from, to (hero progress), caption once it's drawn
    var RUN = [
      ['stopcock', 0.04, 0.10, 'Stopcock: where your water comes in.'],
      ['tap', 0.10, 0.16, 'Kitchen tap: that’s me.'],
      ['outside', 0.16, 0.22, 'Outside tap: me.'],
      ['cylinder', 0.22, 0.28, 'Hot water cylinder: me.'],
      ['heatpump', 0.28, 0.35, 'Air source heat pump: me.'],
      ['rad-g', 0.35, 0.41, 'Radiators: me.'],
      ['rad-f', 0.41, 0.47, 'Radiators upstairs: me.'],
      ['rad-gable', 0.47, 0.50, 'Radiators upstairs: me.'],
      ['stat', 0.50, 0.56, 'Thermostat and controls: me.']
    ];
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var span = function (p, a, b) { return clamp((p - a) / (b - a)); };
    var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

    // intro: grid then the section sweep, about 2.2 seconds
    var t0 = null, introDone = false;
    lines.forEach(function (l) { l.style.strokeDasharray = 1; l.style.strokeDashoffset = 1; });
    texts.forEach(function (t) { t.style.opacity = 0; });
    draw.style.clipPath = 'inset(0 100% 0 0)';
    function intro(ts) {
      if (t0 === null) t0 = ts;
      var t = (ts - t0) / 2200;
      lines.forEach(function (l, i) { l.style.strokeDashoffset = (1 - ease(span(t, i * 0.06, 0.4 + i * 0.06))).toFixed(4); });
      texts.forEach(function (x, i) { x.style.opacity = span(t, 0.35 + i * 0.03, 0.5 + i * 0.03).toFixed(3); });
      var w = ease(span(t, 0.3, 1));
      draw.style.clipPath = 'inset(0 ' + ((1 - w) * 100).toFixed(2) + '% 0 0)';
      cut.style.left = (w * 100).toFixed(2) + '%';
      cut.style.opacity = t > 0.3 && t < 1 ? 1 : 0;
      if (t < 1) requestAnimationFrame(intro); else { introDone = true; draw.style.clipPath = ''; }
    }
    requestAnimationFrame(intro);

    var lastCap = null, lastStage = -1;
    function paint(p) {
      var capText = RUN[0][3];
      RUN.forEach(function (r) {
        var t = span(p, r[1], r[2]);
        if (runs[r[0]]) runs[r[0]].style.strokeDashoffset = (1 - t).toFixed(4);
        if (marks[r[0]]) { marks[r[0]].classList.toggle('is-lit', t >= 1); }
        (syms[r[0]] || []).forEach(function (s) { s.style.opacity = t > 0.6 ? 1 : 0; });
        if (t > 0.5) capText = r[3];
      });
      if (capText !== lastCap) { lastCap = capText; cap.textContent = capText; }
      var stage = p < 0.035 ? 0 : p < 0.6 ? 1 : 2;
      if (stage !== lastStage) { lastStage = stage; caps.forEach(function (c, i) { c.classList.toggle('is-on', i === stage); }); }
      var photo = ease(span(p, 0.58, 0.76));
      hero.style.setProperty('--photo', photo.toFixed(3));
      hero.style.setProperty('--zoom', (1.12 - 0.12 * ease(span(p, 0.58, 0.97))).toFixed(4));
      hero.style.setProperty('--plan', (1 - span(p, 0.66, 0.8)).toFixed(3));
      hero.style.setProperty('--shade', span(p, 0.62, 0.8).toFixed(3));
      hero.classList.toggle('is-photo', photo > 0.5);
      if (prog) prog.style.setProperty('--prog', p.toFixed(3));
    }
    paint(0);
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
    var fhpu = fsvg.querySelector('.hpu');
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
