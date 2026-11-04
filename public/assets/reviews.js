/* Live reviews card. One script tag plus <div data-reviews="slug">. Reads the host page's own
   colours, fonts and radius from CSS variables, so every site keeps its branding. Shows the
   reviews in the order they are given, never filtered. No cookies, no tracking, no fonts loaded. */
(function () {
  "use strict";
  var ATTRIB = "Google Maps";
  var ORDER_NOTE = "Reviews shown in the order Google gives them.";
  var CSS = ".rv{font:inherit;font-family:var(--reviews-font,inherit);color:var(--reviews-ink,inherit)}" +
    ".rv *{box-sizing:border-box}" +
    ".rv__head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .9rem;margin:0 0 1rem}" +
    ".rv__score{font-size:2rem;font-weight:700;line-height:1}" +
    ".rv__stars{color:var(--reviews-accent,#e08c55);letter-spacing:.12em;font-size:1.05rem;line-height:1}" +
    ".rv__count{color:var(--reviews-muted,inherit);opacity:.85}" +
    ".rv__list{list-style:none;margin:0;padding:0;display:grid;gap:.9rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))}" +
    ".rv__card{margin:0;padding:1.1rem 1.2rem 1rem;background:var(--reviews-card-bg,#fff);color:var(--reviews-card-ink,var(--reviews-ink,inherit));border-radius:var(--reviews-radius,14px);box-shadow:var(--reviews-shadow,0 1px 2px rgba(0,0,0,.08))}" +
    ".rv__who{display:flex;align-items:center;gap:.65rem;margin:0 0 .6rem}" +
    ".rv__pic{width:2.4rem;height:2.4rem;border-radius:50%;object-fit:cover;flex:none;background:var(--reviews-muted,#ccc)}" +
    ".rv__pic--blank{display:grid;place-items:center;font-weight:700;color:#fff}" +
    ".rv__name{font-weight:600;text-decoration:none;color:inherit}.rv__name:hover{text-decoration:underline}" +
    ".rv__when{display:block;font-size:.85em;color:var(--reviews-muted,inherit);opacity:.85}" +
    ".rv__text{margin:.3rem 0 0;white-space:pre-line;overflow-wrap:anywhere}" +
    ".rv__link{display:inline-block;margin-top:.7rem;font-size:.9em;color:inherit}" +
    ".rv__foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.6rem 1.2rem;margin-top:1rem;font-size:.9em}" +
    ".rv__note{margin:0;color:var(--reviews-muted,inherit);opacity:.85}" +
    ".rv__attr{font-family:Roboto,Arial,sans-serif;font-weight:400;font-size:13px;color:var(--reviews-attr,#5e5e5e);white-space:nowrap}" +
    ".rv__all{font-weight:600;color:inherit}" +
    ".rv__name,.rv__link,.rv__all{display:inline-block;padding:.65rem 0;margin:-.65rem 0}.rv__link{margin-top:.05rem}" +
    ".rv__example{margin:0 0 .8rem;padding:.5rem .8rem;border-radius:8px;background:#fff3cd;color:#5c4400;font-size:.9em}";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function safeUrl(u) {
    return /^https:\/\//.test(String(u || "")) ? String(u) : "";
  }
  function stars(n) {
    var r = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    var s = "";
    for (var i = 0; i < 5; i++) s += i < r ? "★" : "☆";
    return '<span class="rv__stars" role="img" aria-label="' + r + ' out of 5 stars"><span aria-hidden="true">' + s + "</span></span>";
  }
  function link(href, text, cls) {
    var u = safeUrl(href);
    return u ? '<a class="' + cls + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + text + "</a>" : "";
  }
  function card(r) {
    var pic = safeUrl(r.authorPhotoUri)
      ? '<img class="rv__pic" src="' + esc(r.authorPhotoUri) + '" alt="" width="38" height="38" loading="lazy" referrerpolicy="no-referrer">'
      : '<span class="rv__pic rv__pic--blank" aria-hidden="true">' + esc(String(r.authorName || "?").charAt(0).toUpperCase()) + "</span>";
    var name = safeUrl(r.authorUri) ? link(r.authorUri, esc(r.authorName), "rv__name") : '<span class="rv__name">' + esc(r.authorName) + "</span>";
    var when = r.relativePublishTime ? '<span class="rv__when">' + esc(r.relativePublishTime) + "</span>" : "";
    return '<li><article class="rv__card">' +
      '<div class="rv__who">' + pic + "<div>" + name + when + "</div></div>" +
      stars(r.rating) +
      (r.text ? '<p class="rv__text">' + esc(r.text) + "</p>" : "") +
      link(r.reviewUri, "See this review on " + ATTRIB, "rv__link") +
      "</article></li>";
  }
  function build(d) {
    var reviews = Array.isArray(d.reviews) ? d.reviews : [];
    var score = typeof d.rating === "number" ? d.rating.toFixed(1) : "";
    var count = Number(d.userRatingCount) || 0;
    return (d.fixture ? '<p class="rv__example">Example layout: these are not real reviews.</p>' : "") +
      '<div class="rv__head">' +
      (score ? '<span class="rv__score">' + esc(score) + "</span>" + stars(d.rating) : "") +
      '<span class="rv__count">' + count + " review" + (count === 1 ? "" : "s") + " on " + ATTRIB + "</span></div>" +
      (reviews.length ? '<ul class="rv__list">' + reviews.map(card).join("") + "</ul>" : "") +
      '<div class="rv__foot"><p class="rv__note">' + ORDER_NOTE + "</p>" +
      link(d.allReviewsUrl || d.mapsUri, "Read all reviews on Google", "rv__all") +
      '<span class="rv__attr" aria-label="' + ATTRIB + '">' + ATTRIB + "</span></div>";
  }

  function style() {
    if (typeof document === "undefined" || document.getElementById("rv-css")) return;
    var s = document.createElement("style");
    s.id = "rv-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function mount(el, base) {
    var slug = el.getAttribute("data-reviews");
    if (!slug || el.getAttribute("data-reviews-state")) return;
    el.setAttribute("data-reviews-state", "loading");
    var url = base + "/api/reviews/" + encodeURIComponent(slug) + "?o=" + encodeURIComponent(location.origin);
    fetch(url, { mode: "cors", credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) {
        style();
        el.classList.add("rv");
        el.innerHTML = build(d);
        el.setAttribute("data-reviews-state", "live");
      })
      .catch(function () { el.setAttribute("data-reviews-state", "static"); });
  }
  function init() {
    var script = document.currentScript || document.querySelector('script[src*="reviews.js"]');
    var base = "";
    try { base = script && script.src ? new URL(script.src, location.href).origin : ""; } catch (e) { base = ""; }
    if (!base) return;
    var els = [].slice.call(document.querySelectorAll("[data-reviews]"));
    if (!els.length) return;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); mount(en.target, base); } });
      }, { rootMargin: "400px 0px" });
      els.forEach(function (el) { io.observe(el); });
    } else {
      els.forEach(function (el) { mount(el, base); });
    }
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { build: build, stars: stars, card: card, ATTRIB: ATTRIB, ORDER_NOTE: ORDER_NOTE };
  } else if (typeof document !== "undefined") {
    var base0 = document.currentScript;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { document.currentScript || (document.currentScript = base0); init(); });
    else init();
  }
})();
