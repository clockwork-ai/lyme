(() => {
  const root = document.createElement("div");
  root.className = "cw-chat";
  root.hidden = true;
  root.innerHTML = `
    <div class="cw-nudge" hidden>
      <button class="cw-nudge__dismiss" type="button" aria-label="Dismiss this question">×</button>
      <button class="cw-nudge__open" type="button"></button>
    </div>
    <button class="cw-launch" type="button" aria-expanded="false" aria-controls="cw-panel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 16.5 4 20l3.8-1.4A8 8 0 1 0 6 16.5z"></path>
      </svg>
      <span class="cw-launch__label">Ask Lyme</span>
    </button>
    <section class="cw-panel" id="cw-panel" role="dialog" aria-labelledby="cw-title" hidden>
      <header class="cw-head">
        <div>
          <span class="cw-kicker">Lyme Plumbing</span>
          <h2 id="cw-title">Ask Lyme</h2>
        </div>
        <button class="cw-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="cw-log" role="log" aria-live="polite"></div>
      <div class="cw-chips"></div>
      <form class="cw-form" hidden>
        <p class="cw-form__title">Get a quote</p>
        <div class="cw-hp" aria-hidden="true">
          <label>Leave this blank<input name="hp" tabindex="-1" autocomplete="off"></label>
        </div>
        <input class="cw-field" name="name" autocomplete="name" maxlength="80" required placeholder="Your name">
        <input class="cw-field" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" required placeholder="Phone">
        <input class="cw-field" name="email" type="email" autocomplete="email" maxlength="120" placeholder="Email, if you want">
        <input class="cw-field" name="postcode" autocomplete="postal-code" maxlength="10" required placeholder="Postcode">
        <select class="cw-field" name="job" required></select>
        <textarea class="cw-field cw-area" name="message" maxlength="4000" required placeholder="What's happening?"></textarea>
        <select class="cw-field" name="best_time"></select>
        <label class="cw-check"><input name="consent" type="checkbox" value="yes" required> I'm happy for Callum to contact me about this job.</label>
        <button class="cw-send" type="submit">Send to Callum</button>
      </form>
      <form class="cw-composer">
        <label class="sr" for="cw-input">Message</label>
        <textarea class="cw-input" id="cw-input" rows="1" maxlength="600" placeholder="Ask about a leak, a radiator, or a quote"></textarea>
        <button class="cw-send" type="submit">Send</button>
      </form>
      <div class="cw-more">
        <button class="cw-details" type="button" aria-expanded="false">Get a quote</button>
      </div>
    </section>
  `;

  const nudge = root.querySelector(".cw-nudge");
  const nudgeDismiss = root.querySelector(".cw-nudge__dismiss");
  const nudgeOpen = root.querySelector(".cw-nudge__open");
  const launch = root.querySelector(".cw-launch");
  const panel = root.querySelector(".cw-panel");
  const close = root.querySelector(".cw-close");
  const log = root.querySelector(".cw-log");
  const chips = root.querySelector(".cw-chips");
  const details = root.querySelector(".cw-details");
  const form = root.querySelector(".cw-form");
  const composer = root.querySelector(".cw-composer");
  const input = root.querySelector(".cw-input");
  const send = composer.querySelector("button");
  const title = root.querySelector("#cw-title");
  const label = root.querySelector(".cw-launch__label");
  const job = form.querySelector('[name="job"]');
  const bestTime = form.querySelector('[name="best_time"]');
  const formTitle = form.querySelector(".cw-form__title");

  const messages = [];
  let busy = false;
  let config = null;
  let nudgeArmed = false;
  const seenKey = "lyme-nudge-seen";

  function seenNudge() {
    try { return sessionStorage.getItem(seenKey) === "1"; } catch { return true; }
  }

  function markNudge() {
    try { sessionStorage.setItem(seenKey, "1"); } catch { /* private mode */ }
  }

  function safeHref(href, fallback) {
    try {
      const url = new URL(href, location.origin);
      if (url.protocol === "tel:" || url.protocol === "mailto:" || url.origin === location.origin || url.protocol === "https:") return url.href;
    } catch { /* keep fallback */ }
    return fallback;
  }

  function keyboardFrame(innerHeight, vvHeight, vvOffsetTop) {
    if (innerHeight - vvHeight - vvOffsetTop <= 80) return null;
    const top = Math.max(0, vvOffsetTop) + 8;
    const height = Math.max(96, Math.round(vvHeight - 16));
    return { top, height: Math.min(height, Math.round(vvHeight - 8)) };
  }

  function clearPanelFit() {
    root.classList.remove("is-keyboard");
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.height = "";
    panel.style.maxHeight = "";
  }

  function fitPanel() {
    const vv = window.visualViewport;
    const narrow = window.matchMedia("(max-width: 860px)").matches;
    if (!vv || !narrow || panel.hidden) {
      clearPanelFit();
      return;
    }
    const frame = keyboardFrame(window.innerHeight, vv.height, vv.offsetTop || 0);
    if (!frame) {
      clearPanelFit();
      return;
    }
    root.classList.add("is-keyboard");
    panel.style.top = frame.top + "px";
    panel.style.bottom = "auto";
    panel.style.height = frame.height + "px";
    panel.style.maxHeight = frame.height + "px";
    log.scrollTop = log.scrollHeight;
  }

  function phoneHref() {
    return (config && config.phoneHref) || "tel:+447846729203";
  }

  function actionsFor(text) {
    const actions = [];
    if (/get a quote|use the form|quote form/i.test(text)) actions.push({ label: "Get a quote", quote: true });
    const phone = ((config && config.phone) || "07846 729203").replace(/\s+/g, "");
    if (String(text).replace(/\s+/g, "").includes(phone) || /\+447846729203/.test(String(text).replace(/\s+/g, ""))) {
      actions.push({ label: "Call", href: phoneHref() });
    }
    return actions;
  }

  function attachActions(bubble, text) {
    const next = bubble.nextElementSibling;
    const existing = next && next.classList.contains("cw-actions") ? next : null;
    const first = log.querySelector(".cw-msg");
    if (bubble === first && !hasUserMessage()) {
      if (existing) existing.remove();
      return;
    }
    const actions = actionsFor(text);
    if (!actions.length) {
      if (existing) existing.remove();
      return;
    }
    const row = existing || document.createElement("div");
    row.className = "cw-actions";
    row.replaceChildren();
    actions.forEach((action) => {
      if (action.quote) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cw-action";
        button.textContent = action.label;
        button.addEventListener("click", () => openForm());
        row.appendChild(button);
        return;
      }
      const link = document.createElement("a");
      link.className = "cw-action";
      link.href = safeHref(action.href, phoneHref());
      link.textContent = action.label;
      row.appendChild(link);
    });
    if (!existing) bubble.after(row);
    log.scrollTop = log.scrollHeight;
  }

  function add(role, text) {
    const p = document.createElement("p");
    p.className = role === "user" ? "cw-msg cw-msg--user" : role === "note" ? "cw-msg cw-msg--note" : "cw-msg cw-msg--bot";
    p.textContent = text;
    log.appendChild(p);
    if (role === "assistant" || role === "note") attachActions(p, text);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function pagePath() {
    const path = location.pathname || "/";
    if (path === "/") return "/";
    return path.endsWith("/") ? path : path + "/";
  }

  function fillSelect(select, values, placeholder) {
    select.replaceChildren();
    if (placeholder) {
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = placeholder;
      select.appendChild(blank);
    }
    (values || []).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function applyConfig(next) {
    config = next;
    title.textContent = next.title || "Ask Lyme";
    label.textContent = next.launcherLabel || "Ask Lyme";
    launch.setAttribute("aria-label", next.launcherLabel || "Ask Lyme");
    input.placeholder = next.placeholder || input.placeholder;
    form.querySelector("button").textContent = next.formSubmit || "Send to Callum";
    formTitle.textContent = next.formTitle || "Get a quote";
    details.textContent = next.quoteLabel || "Get a quote";
    fillSelect(job, next.jobs, "Which job?");
    fillSelect(bestTime, next.times && next.times.length ? next.times : ["Any time", "Morning", "Afternoon", "Evening"]);
    if (next.nudge && next.nudge.text) nudgeOpen.textContent = next.nudge.text;
    renderSuggestions(next.suggestions);
    if (!nudgeArmed) {
      nudgeArmed = true;
      armNudge(next.nudge || { delayMs: 22000, scroll: 0.45 });
    }
    if (!messages.length && next.greeting) {
      messages.push({ role: "assistant", content: next.greeting });
      add("assistant", next.greeting);
    }
  }

  function hasUserMessage() {
    return messages.some((message) => message.role === "user");
  }

  function renderSuggestions(list) {
    chips.replaceChildren();
    if (hasUserMessage()) return;
    (list || []).slice(0, 3).forEach((labelText) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cw-chip";
      button.textContent = labelText;
      button.addEventListener("click", () => ask(labelText));
      chips.appendChild(button);
    });
  }

  function hideNudge() {
    nudge.hidden = true;
  }

  function scrolledFar(amount) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 80) return false;
    return window.scrollY / max >= amount;
  }

  function armNudge(settings) {
    if (seenNudge()) return;
    const delay = Number(settings.delayMs) || 22000;
    const amount = Number(settings.scroll) || 0.45;
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
    };
    const tryShow = () => {
      if (seenNudge() || root.classList.contains("is-open") || !nudgeOpen.textContent) return;
      nudge.hidden = false;
      markNudge();
      stop();
    };
    const onScroll = () => { if (scrolledFar(amount)) tryShow(); };
    timer = setTimeout(tryShow, delay);
    addEventListener("scroll", onScroll, { passive: true });
    if (scrolledFar(amount)) tryShow();
  }

  function openForm() {
    form.hidden = false;
    form.classList.add("is-open");
    details.setAttribute("aria-expanded", "true");
    const field = form.querySelector("input[name=name]");
    if (field) field.focus({ preventScroll: true });
    fitPanel();
  }

  function setOpen(open) {
    root.classList.toggle("is-open", open);
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      input.focus({ preventScroll: true });
      fitPanel();
    } else {
      clearPanelFit();
      launch.focus();
    }
  }

  async function ask(text) {
    const content = text.replace(/\s+/g, " ").trim();
    if (!content || busy) return;
    busy = true;
    send.disabled = true;
    chips.replaceChildren();
    messages.push({ role: "user", content });
    add("user", content);
    input.value = "";
    const bubble = add("assistant", "…");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, page: pagePath() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        bubble.className = "cw-msg cw-msg--note";
        bubble.textContent = data.error || "Sorry, try again in a moment.";
        attachActions(bubble, bubble.textContent);
        messages.pop();
        if (!hasUserMessage()) renderSuggestions(config && config.suggestions);
        return;
      }
      const reader = response.body && response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      if (reader) {
        while (true) {
          const step = await reader.read();
          if (step.done) break;
          acc += decoder.decode(step.value, { stream: true });
          bubble.textContent = acc;
          attachActions(bubble, acc);
          log.scrollTop = log.scrollHeight;
        }
        acc += decoder.decode();
      } else {
        acc = await response.text();
      }
      bubble.textContent = acc || "Sorry, I missed that.";
      attachActions(bubble, bubble.textContent);
      messages.push({ role: "assistant", content: bubble.textContent });
      if (/your name|use the form/i.test(bubble.textContent)) openForm();
    } catch {
      bubble.className = "cw-msg cw-msg--note";
      bubble.textContent = "Sorry, the chat didn't connect. Ring Callum on 07846 729203.";
      attachActions(bubble, bubble.textContent);
      messages.pop();
      if (!hasUserMessage()) renderSuggestions(config && config.suggestions);
    } finally {
      busy = false;
      send.disabled = false;
      input.focus({ preventScroll: true });
      fitPanel();
    }
  }

  launch.addEventListener("click", () => {
    hideNudge();
    markNudge();
    setOpen(true);
  });
  nudgeDismiss.addEventListener("click", (event) => {
    event.stopPropagation();
    hideNudge();
    markNudge();
  });
  nudgeOpen.addEventListener("click", () => {
    hideNudge();
    markNudge();
    setOpen(true);
  });
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) setOpen(false);
  });
  form.addEventListener("focusin", () => fitPanel());
  details.addEventListener("click", () => {
    const open = form.hidden;
    form.hidden = !open;
    form.classList.toggle("is-open", open);
    details.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const field = form.querySelector("input[name=name]");
      if (field) field.focus({ preventScroll: true });
    }
    fitPanel();
  });
  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(input.value);
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    const data = new FormData(form);
    const note = String(data.get("message") || "");
    data.set("message", "From the site chat.\n\n" + note);
    try {
      const response = await fetch("/api/quote", { method: "POST", body: data });
      const landed = new URL(response.url, location.origin);
      if (response.ok && /\/thanks\/?$/.test(landed.pathname)) {
        add("assistant", "That's with Callum. He'll use it to come back to you.");
        form.reset();
        form.hidden = true;
        form.classList.remove("is-open");
        details.setAttribute("aria-expanded", "false");
        fillSelect(job, config && config.jobs, "Which job?");
        fillSelect(bestTime, (config && config.times) || ["Any time", "Morning", "Afternoon", "Evening"]);
      } else {
        add("note", "That didn't send. Ring Callum on " + ((config && config.phone) || "07846 729203") + ".");
      }
    } catch {
      add("note", "That didn't send. Ring Callum on 07846 729203.");
    } finally {
      button.disabled = false;
      fitPanel();
    }
  });

  if (window.visualViewport) {
    visualViewport.addEventListener("resize", fitPanel);
    visualViewport.addEventListener("scroll", fitPanel);
  }
  window.addEventListener("resize", fitPanel);
  input.addEventListener("focus", () => {
    fitPanel();
    setTimeout(fitPanel, 50);
    setTimeout(fitPanel, 300);
    setTimeout(fitPanel, 700);
  });

  fetch("/api/chat")
    .then((response) => (response.ok ? response.json() : null))
    .then((next) => {
      if (!next || next.enabled === false || !next.title) return;
      document.body.appendChild(root);
      root.hidden = false;
      applyConfig(next);
    })
    .catch(() => { /* leave the chat hidden */ });
})();
