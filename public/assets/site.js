/* Lyme Plumbing & Heating: phone menu, the "Call or text" chooser, and the quote form. Every page.
   Reviews: set SHOW_REVIEWS to true to put the Reviews link back in the nav, the phone menu
   and the footer, and to show the home page Reviews section. The page file stays at
   public/reviews/index.html either way. When you turn it on, add the reviews address
   back to public/sitemap.xml as well. */
var SHOW_REVIEWS = false;

(function () {
  var cfg = window.LYME || {};

  /* Reviews links are not in the HTML while SHOW_REVIEWS is false, so nothing points at /reviews/. */
  (function () {
    var reviewsHref = function (contactHref) {
      return String(contactHref || "").replace(/contact\/$/, "reviews/");
    };
    var contactIn = function (root) {
      return [].slice.call(root.querySelectorAll("a")).find(function (a) {
        return /contact\/$/.test(a.getAttribute("href") || "");
      });
    };
    var addLink = function (root, beforeContact) {
      if (!root) return;
      var contact = contactIn(root);
      if (!contact) return;
      var href = reviewsHref(contact.getAttribute("href"));
      if (root.querySelector('a[href="' + href + '"]')) return;
      var a = document.createElement("a");
      a.setAttribute("href", href);
      a.textContent = "Reviews";
      if (beforeContact) {
        var li = document.createElement("li");
        li.appendChild(a);
        contact.closest("li").before(li);
      } else {
        contact.before(a);
      }
    };
    if (SHOW_REVIEWS) {
      addLink(document.querySelector(".bar__nav"), false);
      addLink(document.querySelector(".menu__nav"), false);
      var more = [].slice.call(document.querySelectorAll(".foot h2")).find(function (h) {
        return h.textContent.trim() === "More";
      });
      addLink(more && more.nextElementSibling, true);
      if (document.body.classList.contains("is-home") && !document.getElementById("reviews")) {
        var close = document.getElementById("close");
        if (close) {
          var section = document.createElement("section");
          section.id = "reviews";
          section.className = "ground-light-2 section";
          section.setAttribute("aria-labelledby", "rev-h");
          section.innerHTML = '<div class="wrap reviews swipe"><h2 id="rev-h" class="h2">Reviews</h2><p class="lede">I\'m building my reviews up. If I\'ve done a job for you, I\'d appreciate a Google review.</p></div>';
          close.before(section);
        }
      }
      return;
    }
    document.querySelectorAll("a").forEach(function (a) {
      if (!/(^|\/)reviews\/$/.test(a.getAttribute("href") || "")) return;
      var li = a.parentElement && a.parentElement.tagName === "LI" ? a.parentElement : null;
      if (li) li.remove();
      else a.remove();
    });
    var homeReviews = document.getElementById("reviews");
    if (homeReviews) homeReviews.remove();
  })();

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

  /* Muted clips: ask to play, and leave the poster alone when motion is reduced.
     A source with data-src waits until the clip is near the screen. */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var playClip = function (v) {
      v.muted = true;
      var pending = v.querySelector('source[data-src]');
      if (pending && !pending.getAttribute('src')) {
        pending.src = pending.getAttribute('data-src');
        v.load();
      }
      var play = v.play();
      if (play && play.catch) play.catch(function () {});
    };
    document.querySelectorAll('video').forEach(function (v) {
      v.muted = true;
      if (v.querySelector('source[data-src]') && 'IntersectionObserver' in window) {
        var watch = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            watch.disconnect();
            playClip(v);
          });
        }, { rootMargin: '240px 0px' });
        watch.observe(v);
        return;
      }
      playClip(v);
    });
  }

  /* Ask Lyme loads after the page is idle. The widget stays hidden if the chat is off. */
  addEventListener('load', function () {
    if (window.__lymeChat) return;
    window.__lymeChat = 1;
    var start = function () {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/chat/widget.css';
      document.head.appendChild(css);
      var script = document.createElement('script');
      script.src = '/chat/widget.js';
      document.body.appendChild(script);
    };
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1800 });
    else setTimeout(start, 800);
  });
})();
