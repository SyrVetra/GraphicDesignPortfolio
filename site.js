/* Site engine: rotating selector + one page per project.
   Reads window.PORTFOLIO from content.js. You shouldn't need to edit
   this file to add work.

   Pages (each has its own link):
     yoursite.com/           home: intro, rotating selector, bio & history, contact
     yoursite.com/#about     home, scrolled to a section (#work, #about, #contact)
     yoursite.com/#yn-001    a project page */
(() => {
  "use strict";

  const C = window.PORTFOLIO || {};
  const contact = C.contact || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const paras = (t) =>
    String(t || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const mod = (n, m) => ((n % m) + m) % m;
  const $ = (id) => document.getElementById(id);

  const works = (C.releases || []).map((r, i) => {
    const catalog = r.catalog || `${C.catalogPrefix || "CAT"}-${String(i + 1).padStart(3, "0")}`;
    return { ...r, i, catalog, slug: slugify(r.slug || catalog) };
  });
  const N = works.length;

  function slot(src, hint, { fit, alt = "" } = {}) {
    const empty = !src;
    return (
      `<div class="slot${empty ? " is-empty" : ""}"${fit ? ` data-fit="${esc(fit)}"` : ""}>` +
      (empty ? "" : `<img src="${esc(src)}" alt="${esc(alt)}" decoding="async" draggable="false" onerror="this.parentNode.classList.add('is-empty')">`) +
      `<div class="slot-empty"><span>${esc(hint)}</span><code>${esc(src || "add a path in content.js")}</code></div></div>`
    );
  }
  const metaLine = (w) => [w.catalog, w.format, w.year].filter(Boolean).map(esc).join(" · ");

  const app = $("app");
  $("brand").textContent = C.designer || "";

  // ── routing ──────────────────────────────────────────
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (SECTIONS.includes(h)) return { view: "home", section: h };
    if (h === "info") return { view: "home", section: "about" };
    const w = works.find((x) => x.slug === h);
    return w ? { view: "work", w } : { view: "home" };
  }
  const SECTIONS = ["work", "about", "contact"];

  function scrollToSection(id, smooth) {
    const el = id && $(id);
    if (el) el.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "auto", block: "start" });
    else window.scrollTo({ top: 0, behavior: smooth && !reduced ? "smooth" : "auto" });
  }

  function setNav(id) {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.dataset.nav === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
    });
  }

  let lastView = null;
  let wantTop = false; // set when the visitor clicks a link to the top of the home page
  let lastWork = null;

  function render() {
    const r = route();
    stopAuto();
    hidePeek();
    if (r.view === "home") {
      renderHome();
      // back from a project: land on the selector; otherwise on the requested section
      scrollToSection(r.section || (lastView === "work" && !wantTop ? "work" : null), false);
    } else {
      renderWork(r.w);
      setNav("work");
      window.scrollTo(0, 0);
    }
    document.title = r.view === "work" ? `${r.w.title} · ${C.designer || ""}` : [C.designer, C.tagline].filter(Boolean).join(" · ") || "Portfolio";
    lastView = r.view;
    wantTop = false;
    if (r.w) lastWork = r.w;
  }

  // Swap pages, morphing the clicked thumbnail into the large image
  // where the browser supports View Transitions.
  function transition(update, fromEl) {
    if (!document.startViewTransition || reduced) return update();
    if (fromEl) fromEl.style.viewTransitionName = "hero";
    const t = document.startViewTransition(update);
    t.finished.finally(() => {
      document.querySelectorAll(".ring-item .slot").forEach((e) => (e.style.viewTransitionName = ""));
    });
  }

  function navigate(hash, fromEl) {
    if (`#${hash}` === location.hash || (!hash && !location.hash)) return;
    wantTop = !hash;
    transition(() => {
      history.pushState(null, "", hash ? `#${hash}` : location.pathname + location.search);
      render();
    }, fromEl);
  }
  window.addEventListener("popstate", () => transition(render));

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const href = a.getAttribute("href");
    const id = href.slice(1);
    if ((!id || SECTIONS.includes(id)) && route().view === "home") {
      // already on the home page: just scroll
      scrollToSection(id, true);
      try { history.replaceState(null, "", id ? href : location.pathname + location.search); } catch (_) {}
      return;
    }
    navigate(href.slice(1), a.querySelector(".slot") || document.querySelector(`.ring-item[href="${CSS.escape(href)}"] .slot`));
  });

  // ── home: rotating selector ──────────────────────────
  let pos = 0;   // unbounded index of the front item, so the ring never spins back
  let ring, stageEl, items, info, ticks;
  let step = 0, radius = 0;
  let autoTimer = null, idleUntil = 0;

  function renderHome() {
    if (lastWork && N) pos = pos - mod(pos, N) + lastWork.i; // come back facing the piece you left

    app.innerHTML = `<div class="home">
      ${introSection()}
      <section class="selector" id="work" aria-label="Selected work">
        <header class="sec-head label"><span>Selected work</span><span>${N} project${N === 1 ? "" : "s"}</span></header>
        ${N ? selectorMarkup() : `<p class="label empty-note">Add releases in content.js to fill the selector.</p>`}
      </section>
      ${aboutSection()}
      ${contactSection()}
    </div>`;

    watchSections();
    if (!N) { ring = null; return; }
    initSelector();
  }

  function selectorMarkup() {
    return `<div class="ring-stage" id="ring-stage" aria-roledescription="carousel" aria-label="Selected work">
        <div class="ring" id="ring">${works
          .map((w) => `<a class="ring-item" href="#${w.slug}" draggable="false" data-i="${w.i}" data-peek="${w.i}" aria-label="${esc(w.title)}">
            ${slot(w.thumb || w.art, "Thumbnail", { fit: w.fit, alt: `${w.title} cover` })}</a>`)
          .join("")}</div>
      </div>
      <div class="sel-info" id="sel-info" aria-live="polite"></div>
      <div class="dial">
        <button type="button" class="pill round" id="sel-prev" aria-label="Previous piece">←</button>
        <div class="ticks" id="ticks">${works
          .map((w) => `<button type="button" class="tick" data-i="${w.i}" aria-label="${esc(w.title)}"></button>`)
          .join("")}</div>
        <button type="button" class="pill round" id="sel-next" aria-label="Next piece">→</button>
      </div>`;
  }

  function initSelector() {
    stageEl = $("ring-stage");
    ring = $("ring");
    info = $("sel-info");
    items = [...ring.children];
    ticks = [...$("ticks").children];

    $("sel-prev").onclick = () => { hold(); spin(pos - 1); };
    $("sel-next").onclick = () => { hold(); spin(pos + 1); };
    ticks.forEach((t) => (t.onclick = () => { hold(); spin(nearest(+t.dataset.i)); }));
    bindDrag();

    ring.style.transition = "none";
    layoutRing();
    spin(pos);
    ring.offsetWidth; // apply without animating, then restore the transition
    ring.style.transition = "";

    if (lastView === "work" && lastWork) {
      // morph back from the project page
      const s = items[lastWork.i].querySelector(".slot");
      if (s && document.startViewTransition && !reduced) s.style.viewTransitionName = "hero";
    }
    startAuto();
  }

  function layoutRing() {
    const w = ring.offsetWidth;
    step = 360 / N;
    radius = N < 3 ? w * 0.9 : Math.max(w * 0.9, (w / 2 / Math.tan(Math.PI / N)) * 1.3);
    items.forEach((el, i) => (el.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`));
  }

  function setAngle(deg) {
    ring.style.transform = `translateZ(${-radius}px) rotateY(${deg}deg)`;
    items.forEach((el, i) => {
      const rel = mod(i * step + deg + 180, 360) - 180; // 0 = facing the viewer
      const f = Math.max(0, Math.cos((rel * Math.PI) / 180));
      el.style.opacity = (0.25 + 0.75 * f).toFixed(3);
      el.style.filter = `saturate(${(0.4 + 0.6 * f).toFixed(2)})`;
    });
  }

  // nearest unbounded position that shows item i in front
  const nearest = (i) => pos + (mod(i - pos + N / 2, N) - N / 2 | 0);

  function spin(p) {
    pos = Math.round(p);
    setAngle(-pos * step);
    const cur = mod(pos, N);
    items.forEach((el, i) => {
      el.classList.toggle("is-front", i === cur);
      el.tabIndex = i === cur ? 0 : -1;
    });
    ticks.forEach((t, i) => t.setAttribute("aria-current", String(i === cur)));
    const w = works[cur];
    info.innerHTML = `<span class="label sel-meta">${metaLine(w)}</span>
      <h2 class="display sel-title">${esc(w.title)}</h2>
      ${w.artist ? `<p class="sel-artist">${esc(w.artist)}</p>` : ""}
      <a class="pill solid" href="#${w.slug}">View project →</a>`;
  }

  function bindDrag() {
    let x0 = 0, a0 = 0, moved = false, down = false;
    stageEl.addEventListener("pointerdown", (e) => {
      down = true; moved = false; x0 = e.clientX; a0 = -pos * step;
      hold();
    });
    window.addEventListener("pointermove", (e) => {
      if (!down || !ring) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) { moved = true; stageEl.classList.add("dragging"); stageEl.setPointerCapture?.(e.pointerId); }
      setAngle(a0 + (dx / ring.offsetWidth) * step * 1.1);
    });
    const up = (e) => {
      if (!down) return;
      down = false;
      if (!moved) return;
      stageEl.classList.remove("dragging");
      const dx = e.clientX - x0;
      spin(pos - Math.round((dx / ring.offsetWidth) * 1.1));
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    // a click after a drag does nothing; a click on a side item turns it to the front
    stageEl.addEventListener("click", (e) => {
      const item = e.target.closest(".ring-item");
      if (!item) return;
      if (moved || +item.dataset.i !== mod(pos, N)) {
        e.preventDefault();
        e.stopPropagation();
        if (!moved) spin(nearest(+item.dataset.i));
        moved = false;
      }
    }, true);

    let acc = 0, lock = 0;
    stageEl.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical: let the page scroll
      const d = e.deltaX;
      e.preventDefault();
      hold();
      const now = Date.now();
      if (now < lock) return;
      acc += d;
      if (Math.abs(acc) > 30) { spin(pos + Math.sign(acc)); acc = 0; lock = now + 320; }
    }, { passive: false });
  }

  function hold() { idleUntil = Date.now() + 8000; }
  function startAuto() {
    const ms = C.autoRotate ?? 3500;
    if (!ms || reduced || N < 2) return;
    autoTimer = setInterval(() => {
      if (Date.now() < idleUntil || document.hidden || !ring || !ring.isConnected) return;
      if (stageEl.matches(":hover") || stageEl.contains(document.activeElement)) return;
      const box = stageEl.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return; // scrolled out of view
      spin(pos + 1);
    }, ms);
  }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; }

  // ── project page ─────────────────────────────────────
  function renderWork(w) {
    const prev = works[mod(w.i - 1, N)], next = works[mod(w.i + 1, N)];
    const facts = [["Role", w.role], ["Label", w.label], ["Year", w.year], ["Format", w.format]].filter(([, v]) => v);
    const gallery = (w.gallery || []).map((g) => (typeof g === "string" ? { src: g } : g));

    const sections = (w.sections || []).filter((x) => x && (x.heading || x.text));
    const about = [["Artist", w.artist], ["Role", w.role], ["Label", w.label], ["Format", w.format], ["Year", w.year]].filter(([, v]) => v);

    app.innerHTML = `<article class="work">
      <nav class="crumbs label"><a href="#work">← All work</a><span>${String(w.i + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}</span></nav>
      <figure class="hero" data-zoom="${esc(w.art || "")}" data-caption="${esc(w.title)}">
        ${slot(w.art, "Full-size art · square", { fit: w.fit, alt: `${w.title} cover art` })}
      </figure>
      <section class="write-up" aria-label="About this project">
        <header class="wu-head">
          <span class="label wu-cat">${esc(w.catalog)}</span>
          <h1 class="display wu-title">${esc(w.title)}</h1>
          ${about.length ? `<dl class="wu-facts">${about.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${w.link && w.link.url ? `<a class="wu-link" href="${esc(w.link.url)}" target="_blank" rel="noopener">${esc(w.link.label || "Link")} ↗</a>` : ""}
        </header>
        <div class="wu-body">
          ${w.description ? `<div class="wu-lead">${paras(w.description)}</div>` : ""}
          ${sections
            .map((x) => `<section class="wu-sec">
              ${x.heading ? `<h2 class="label">${esc(x.heading)}</h2>` : ""}
              <div class="wu-text">${paras(x.text)}</div></section>`)
            .join("")}
          ${!w.description && !sections.length ? `<p class="wu-empty">Add a description for this piece in content.js.</p>` : ""}
          ${w.credits ? `<p class="wu-credits">${esc(w.credits)}</p>` : ""}
        </div>
      </section>
      ${gallery.length ? `<section class="work-gallery">
        <h2 class="label">More from this project</h2>
        <div class="gallery-grid">${gallery
          .map((g) => `<figure data-zoom="${esc(g.src || "")}" data-caption="${esc(g.caption || w.title)}">
            ${slot(g.src, g.caption || "Project image", { fit: "natural", alt: g.caption || "" })}
            ${g.caption ? `<figcaption class="label">${esc(g.caption)}</figcaption>` : ""}</figure>`)
          .join("")}</div></section>` : ""}
      ${N > 1 ? `<nav class="pager" aria-label="More projects">
        <a href="#${prev.slug}" data-peek="${prev.i}"><span class="label">← Previous</span><b>${esc(prev.title)}</b></a>
        <a href="#${next.slug}" data-peek="${next.i}"><span class="label">Next →</span><b>${esc(next.title)}</b></a>
      </nav>` : ""}
    </article>`;

    const hero = app.querySelector(".hero .slot");
    if (document.startViewTransition && !reduced) hero.style.viewTransitionName = "hero";
  }

  // ── home sections ────────────────────────────────
  function introSection() {
    return `<section class="intro" id="top">
      ${C.tagline ? `<span class="label">${esc(C.tagline)}</span>` : ""}
      <h1 class="display intro-name">${esc(C.designer)}</h1>
      ${C.headline ? `<p class="intro-line">${esc(C.headline)}</p>` : ""}
    </section>`;
  }

  function aboutSection() {
    const hist = C.history || [];
    const lists = C.lists || [];
    return `<section class="about" id="about" aria-label="About">
      <header class="sec-head label"><span>About</span><span>${esc(contact.location)}</span></header>
      <div class="about-grid">
        ${C.portrait !== undefined ? `<div class="portrait" data-zoom="${esc(C.portrait || "")}" data-caption="${esc(C.designer)}">
          ${slot(C.portrait, "Portrait · 4:5", { alt: C.designer })}</div>` : ""}
        <div class="bio">
          <h2 class="display about-title">Bio</h2>
          <div class="prose">${paras(C.bio || C.intro)}</div>
        </div>
      </div>
      ${hist.length || lists.length ? `<div class="history-grid">
        ${hist.length ? `<div class="history">
          <h3 class="label">Personal history</h3>
          <ol class="timeline">${hist
            .map((h) => `<li>
              <span class="tl-years label">${esc(h.years || h.year)}</span>
              <div class="tl-body">
                <b>${esc(h.title)}</b>${h.place ? `<span class="tl-place">${esc(h.place)}</span>` : ""}
                ${h.detail ? `<p>${esc(h.detail)}</p>` : ""}
              </div></li>`)
            .join("")}</ol>
        </div>` : ""}
        ${lists.length ? `<aside class="lists">${lists
          .map((l) => `<div><h3 class="label">${esc(l.heading)}</h3><ul>${(l.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`)
          .join("")}</aside>` : ""}
      </div>` : ""}
    </section>`;
  }

  function contactSection() {
    return `<section class="contact" id="contact" aria-label="Contact">
      <header class="sec-head label"><span>Contact</span><span>${esc(contact.location)}</span></header>
      <h2 class="display contact-title">Get in touch</h2>
      ${contact.email ? `<p class="email"><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></p>` : ""}
      ${contact.availability ? `<div class="prose">${paras(contact.availability)}</div>` : ""}
      ${(contact.links || []).length ? `<ul class="links">${contact.links
        .map((l) => `<li><a class="pill" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`)
        .join("")}</ul>` : ""}
      <footer class="site-foot label"><span>© ${new Date().getFullYear()} ${esc(C.designer)}</span>
        ${C.colophon ? `<span>${esc(String(C.colophon).split(/\n\s*\n/)[0])}</span>` : ""}</footer>
    </section>`;
  }

  // highlight the nav link for the section in view
  let sectionObserver;
  function watchSections() {
    sectionObserver?.disconnect();
    setNav(null);
    if (!("IntersectionObserver" in window)) return;
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setNav(en.target.id === "top" ? null : en.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["top", ...SECTIONS].forEach((id) => $(id) && sectionObserver.observe($(id)));
  }

  // ── hover preview ────────────────────────────────────
  // Hovering a thumbnail (or a Previous/Next link) dims the site and
  // magnifies the art into a card in the centre of the screen, cycling
  // through the project's images. Mouse only: touch screens keep tap-to-open.
  // Neither layer takes the mouse, so a click still opens the project.
  const dim = document.createElement("div");
  dim.className = "peek-dim";
  const peek = document.createElement("div");
  peek.className = "peek";
  dim.hidden = peek.hidden = true;
  peek.setAttribute("aria-hidden", "true");
  document.body.append(dim, peek);
  let peekFor = null, peekShowT = null, peekHideT = null, peekCycleT = null, peekPending = null;

  function peekImages(w) {
    const extra = (w.gallery || []).map((g) => (typeof g === "string" ? g : g.src)).filter(Boolean);
    return [w.art || w.thumb || "", ...extra.filter((src) => src !== w.art)];
  }

  function showPeek(w, fromEl) {
    const first = !peekFor;
    peekFor = w;
    clearInterval(peekCycleT);
    const imgs = peekImages(w);
    peek.innerHTML = `<div class="peek-media">${imgs
        .map((src, k) => `<div class="peek-frame${k ? "" : " on"}">${slot(src, k ? "Project image" : "Large art", { fit: k ? "contain" : w.fit })}</div>`)
        .join("")}
        ${imgs.length > 1 ? `<div class="peek-dots">${imgs.map((_, k) => `<span${k ? "" : ' class="on"'}></span>`).join("")}</div>` : ""}
      </div>
      <div class="peek-text">
        <div class="peek-title">
          <span class="label">${metaLine(w)}</span>
          <b>${esc(w.title)}</b>
          ${w.artist ? `<i>${esc(w.artist)}</i>` : ""}
        </div>
        <div class="peek-side">
          ${w.role ? `<span class="peek-role">${esc(w.role)}</span>` : ""}
          <span class="label peek-hint">Click to open project</span>
        </div>
      </div>`;
    dim.hidden = peek.hidden = false;
    requestAnimationFrame(() => { dim.classList.add("show"); peek.classList.add("show"); });

    // magnify: grow the card out of the hovered thumbnail
    if (first && fromEl && !reduced && peek.animate) {
      const r = fromEl.getBoundingClientRect();
      const media = peek.querySelector(".peek-media");
      const p = peek.getBoundingClientRect(), m = media.getBoundingClientRect();
      const scale = Math.min(1, r.width / m.width);
      const dx = r.left + r.width / 2 - (p.left + p.width / 2);
      const dy = r.top + r.height / 2 - (m.top + m.height / 2) + (m.top + m.height / 2 - (p.top + p.height / 2)) * (1 - scale);
      peek.animate(
        [{ transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.4 },
         { transform: "translate(-50%, -50%)", opacity: 1 }],
        { duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    }

    if (imgs.length > 1) {
      let k = 0;
      peekCycleT = setInterval(() => {
        k = (k + 1) % imgs.length;
        peek.querySelectorAll(".peek-frame").forEach((f, j) => f.classList.toggle("on", j === k));
        peek.querySelectorAll(".peek-dots span").forEach((d, j) => d.classList.toggle("on", j === k));
      }, 1400);
    }
  }

  function hidePeek() {
    clearTimeout(peekShowT);
    clearTimeout(peekHideT);
    clearInterval(peekCycleT);
    peekShowT = peekHideT = peekPending = null;
    peekFor = null;
    dim.classList.remove("show");
    peek.classList.remove("show");
    peek.getAnimations?.().forEach((a) => a.cancel());
    dim.hidden = peek.hidden = true;
  }

  if (C.hoverPreview !== false && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target.closest && e.target.closest("[data-peek]");
      const dragging = stageEl && stageEl.classList.contains("dragging");
      if (!t || dragging || e.buttons) {
        clearTimeout(peekShowT);
        peekShowT = peekPending = null;
        // short grace period so moving between thumbnails doesn't flicker
        if (peekFor && !peekHideT) peekHideT = setTimeout(hidePeek, 120);
        return;
      }
      clearTimeout(peekHideT);
      peekHideT = null;
      const w = works[+t.dataset.peek];
      if (peekFor === w || (peekShowT && t === peekPending)) return;
      clearTimeout(peekShowT);
      if (peekFor) { showPeek(w); peekShowT = null; return; } // already open: swap
      const fromEl = t.querySelector(".slot") || t;
      peekPending = t;
      peekShowT = setTimeout(() => { peekShowT = peekPending = null; showPeek(w, fromEl); }, 320);
    });
    document.addEventListener("pointerdown", hidePeek);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hidePeek(); });
    window.addEventListener("scroll", hidePeek, { passive: true });
    document.addEventListener("mouseleave", hidePeek);
  }

  // ── lightbox, keys, resize ───────────────────────────
  const lightbox = $("lightbox");
  function openLightbox(src, caption) {
    if (!src) return;
    $("lb-img").src = src;
    $("lb-img").alt = caption || "";
    $("lb-cap").textContent = caption || "";
    lightbox.hidden = false;
    $("lb-close").focus();
  }
  const closeLightbox = () => (lightbox.hidden = true);
  $("lb-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  app.addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]");
    if (z && !z.querySelector(".slot.is-empty")) openLightbox(z.dataset.zoom, z.dataset.caption);
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.hidden) { if (e.key === "Escape") closeLightbox(); return; }
    if (e.target.closest && e.target.closest("input, textarea")) return;
    const r = route();
    if (r.view === "home" && N && ring) {
      const box = stageEl.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return;
      if (e.key === "ArrowRight") { hold(); spin(pos + 1); }
      else if (e.key === "ArrowLeft") { hold(); spin(pos - 1); }
      else if (e.key === "Enter" && !e.target.closest("a, button")) navigate(works[mod(pos, N)].slug, items[mod(pos, N)].querySelector(".slot"));
    } else if (r.view === "work") {
      if (e.key === "ArrowRight") navigate(works[mod(r.w.i + 1, N)].slug);
      else if (e.key === "ArrowLeft") navigate(works[mod(r.w.i - 1, N)].slug);
      else if (e.key === "Escape") navigate("work");
    }
  });

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (ring && ring.isConnected) { layoutRing(); spin(pos); } }, 120);
  });

  render();
})();
