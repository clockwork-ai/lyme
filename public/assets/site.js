/* Lyme Plumbing & Heating: phone menu, the "Call or text" chooser, and the quote form. Every page. */
(function () {
  var cfg = window.LYME || {};

  /* ---- phone menu: closes on the button, a link or Escape, and locks the page scroll ---- */
  var menu = document.getElementById('menu');
  var openBtn = document.querySelector('.bar__menu');
  if (menu && openBtn) {
    var closeBtn = menu.querySelector('.menu__close');
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('menu-open', open);
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      (open ? closeBtn : openBtn).focus();
    };
    openBtn.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });
  }

  /* ---- "Call or text": close the chooser on Escape or a tap elsewhere ---- */
  var cots = [].slice.call(document.querySelectorAll('details.cot'));
  document.addEventListener('click', function (e) {
    cots.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
  });
  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    cots.forEach(function (d) { if (d.open) { d.open = false; d.querySelector('summary').focus(); } });
  });

  /* ---- quote form: check the required boxes, then let the browser post to /api/quote ---- */
  var form = document.getElementById('quote');
  if (form) {
    form.addEventListener('submit', function (e) {
      var bad = [].slice.call(form.querySelectorAll('[required]')).filter(function (f) { return !f.checkValidity(); });
      form.querySelectorAll('[aria-invalid]').forEach(function (f) { f.removeAttribute('aria-invalid'); });
      var err = form.querySelector('.form-err');
      if (bad.length) {
        e.preventDefault();
        bad.forEach(function (f) { f.setAttribute('aria-invalid', 'true'); });
        if (!err) { err = document.createElement('p'); err.className = 'form-err'; err.setAttribute('role', 'alert'); form.insertBefore(err, form.firstChild); }
        err.textContent = 'Please fill in the boxes marked in red' + (bad.some(function (f) { return f.type === 'checkbox'; }) ? ' and tick the box at the bottom.' : '.');
        bad[0].focus();
        return;
      }
      var honey = form.querySelector('[name="hp"]');
      if (honey && honey.value) {
        e.preventDefault();
        location.href = cfg.thanks || "/thanks/";
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      if (btn) btn.setAttribute("aria-busy", "true");
    });
  }

  /* Muted clips: ask to play, and leave the poster alone when motion is reduced. */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('video').forEach(function (v) {
      v.muted = true;
      var play = v.play();
      if (play && play.catch) play.catch(function () {});
    });
  }
})();
