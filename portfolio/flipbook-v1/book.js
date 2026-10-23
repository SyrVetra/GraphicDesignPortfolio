/* Flip-book engine. Reads window.PORTFOLIO from content.js.
   You shouldn't need to edit this file to add work. */
(() => {
  "use strict";

  const C = window.PORTFOLIO || {};
  const contact = C.contact || {};
  const SINGLE_BELOW = 760; // px: narrower screens show one page at a time

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const paras = (t) =>
    String(t || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const pad = (n) => String(n).padStart(2, "0");

  const releases = (C.releases || []).map((r, i) => {
    const catalog = r.catalog || `${C.catalogPrefix || "CAT"}-${String(i + 1).padStart(3, "0")}`;
    return { ...r, catalog, slug: slugify(r.slug || catalog) };
  });

  // ── pages, in reading order ──────────────────────────
  // Spread mode pairs them as [front, back] leaves, so a release's art
  // always lands on a left page and its details on the facing right page.
  const pages = [{ type: "cover" }, { type: "index" }, { type: "intro" }];
  releases.forEach((r) => {
    r.page = pages.length;
    pages.push({ type: "art", r }, { type: "info", r });
  });
  pages.push({ type: "colophon" }, { type: "contact" }, { type: "back" });

  function slot(src, hint, { fit, alt = "" } = {}) {
    const empty = !src;
    return (
      `<div class="slot${empty ? " is-empty" : ""}"${fit ? ` data-fit="${esc(fit)}"` : ""}>` +
      (empty ? "" : `<img src="${esc(src)}" alt="${esc(alt)}" decoding="async" onerror="this.parentNode.classList.add('is-empty')">`) +
      `<div class="slot-empty"><span>${esc(hint)}</span><code>${esc(src || "add a path in content.js")}</code></div></div>`
    );
  }
  const folio = (pi) => `<footer class="folio"><span>${pad(pi)}</span><span>${esc(C.designer)}</span></footer>`;

  const render = {
    cover: () =>
      C.coverImage
        ? slot(C.coverImage, "Front cover", { alt: C.bookTitle })
        : `<div class="pad">
            <div class="pg-head"><span>${esc(C.edition)}</span><span>${esc(C.designer)}</span></div>
            <h1 class="display cover-title">${esc(C.bookTitle || "Discography")}</h1>
            <div class="cover-foot"><span>${esc(C.tagline)}</span><span class="cover-open">Open →</span></div>
          </div>`,

    index: (pi) => `<div class="pad">
        <div class="pg-head"><span>Contents</span><span>${releases.length} releases</span></div>
        <h2 class="display contents-title">Contents</h2>
        <ol class="toc scrolls">${releases
          .map(
            (r) => `<li><button type="button" data-goto="${r.page}">
              <span>${esc(r.catalog)}</span>
              <span class="toc-name"><b>${esc(r.title)}</b><i>${esc(r.artist)}</i></span>
              <span class="toc-year">${esc(r.year)}</span>
              <span class="toc-pg">${pad(r.page)}</span></button></li>`
          )
          .join("")}</ol>
        ${folio(pi)}
      </div>`,

    intro: (pi) => `<div class="pad">
        <div class="pg-head"><span>Introduction</span><span>${esc(contact.location)}</span></div>
        <div class="intro-top">
          ${C.portrait ? slot(C.portrait, "Portrait / logo", { alt: C.designer }) : ""}
          <h2 class="display intro-name">${esc(C.designer)}</h2>
        </div>
        <div class="prose scrolls">${paras(C.intro)}</div>
        ${folio(pi)}
      </div>`,

    art: (pi, { r }) => `${slot(r.art, "Cover art · square", { fit: r.fit, alt: `${r.title} cover art` })}
      <div class="art-cap"><span>${esc(r.catalog)}</span><span>${pad(pi)}</span></div>`,

    info: (pi, { r }) => {
      const meta = [r.format, r.year].filter(Boolean).map(esc).join(" · ");
      const facts = [["Role", r.role], ["Label", r.label]].filter(([, v]) => v);
      const gallery = (r.gallery || []).slice(0, 4).map((g) => (typeof g === "string" ? { src: g } : g));
      return `<div class="pad">
        <div class="pg-head"><span>${esc(r.catalog)}</span><span>${meta}</span></div>
        <h2 class="display rel-title">${esc(r.title)}</h2>
        ${r.artist ? `<p class="rel-artist">${esc(r.artist)}</p>` : ""}
        ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
        <div class="rel-body scrolls">
          <div class="prose">${paras(r.description)}</div>
          ${r.credits ? `<p class="rel-credits">${esc(r.credits)}</p>` : ""}
        </div>
        ${gallery.length ? `<div class="gallery">${gallery
          .map(
            (g, i) => `<button type="button" data-zoom="${esc(g.src || "")}" data-caption="${esc(g.caption || `${r.title}, image ${i + 2}`)}" aria-label="Enlarge ${esc(g.caption || "image")}">
              ${slot(g.src, g.caption || "Extra image", { alt: g.caption || "" })}</button>`
          )
          .join("")}</div>` : ""}
        <div class="rel-foot">
          ${r.link && r.link.url ? `<a class="rel-link" href="${esc(r.link.url)}" target="_blank" rel="noopener">${esc(r.link.label || "Link")} ↗</a>` : "<span></span>"}
        </div>
        ${folio(pi)}
      </div>`;
    },

    colophon: (pi) => `<div class="pad">
        <div class="pg-head"><span>Colophon</span><span>${esc(C.edition)}</span></div>
        <div class="prose scrolls" style="margin-top:auto">${paras(C.colophon)}</div>
        ${folio(pi)}
      </div>`,

    contact: (pi) => `<div class="pad">
        <div class="pg-head"><span>Contact</span><span>${esc(contact.location)}</span></div>
        <h2 class="display contact-title">Get in touch</h2>
        ${contact.email ? `<p class="contact-email"><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></p>` : ""}
        ${contact.availability ? `<div class="prose">${paras(contact.availability)}</div>` : ""}
        ${(contact.links || []).length ? `<ul class="link-list">${contact.links
          .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`)
          .join("")}</ul>` : ""}
        ${folio(pi)}
      </div>`,

    back: () =>
      C.backCoverImage
        ? slot(C.backCoverImage, "Back cover", { alt: "" })
        : `<div class="pad">
            <h2 class="display back-name">${esc(C.designer)}</h2>
            <div class="pg-head" style="border:0;padding:0"><span>${esc(contact.email)}</span><span>© ${new Date().getFullYear()}</span></div>
          </div>`,
  };

  // ── DOM ──────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const book = $("book"), stage = $("stage");
  const btnPrev = $("prev"), btnNext = $("next"), btnContents = $("contents");
  const lightbox = $("lightbox");
  $("brand").textContent = [C.designer, C.bookTitle].filter(Boolean).join(" — ");
  document.title = [C.bookTitle || "Discography", C.designer].filter(Boolean).join(" · ");

  let mode = null;   // "spread" | "single"
  let leaves = [];
  let current = 0;   // number of leaves turned
  let zTop = 0;
  let timers = [];
  let touched = false;

  const DUR = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--flip-dur")) * 1000 || 900;
  const maxCurrent = () => (mode === "spread" ? leaves.length : leaves.length - 1);
  const pageToCurrent = (p) => (mode === "spread" ? Math.ceil(p / 2) : p);
  const visiblePages = () =>
    mode === "spread" ? [2 * current - 1, 2 * current].filter((p) => p >= 0 && p < pages.length) : [current];

  function makeFace(pi, side) {
    const f = document.createElement("div");
    f.className = `face ${side}`;
    if (pi == null) return f; // blank reverse in single-page mode
    f.classList.add(`page-${pages[pi].type}`);
    f.dataset.page = pi;
    f.innerHTML = render[pages[pi].type](pi, pages[pi]);
    return f;
  }

  function build() {
    book.innerHTML = "";
    book.dataset.mode = mode;
    leaves = [];
    const step = mode === "spread" ? 2 : 1;
    for (let i = 0; i < pages.length; i += step) {
      const leaf = document.createElement("div");
      leaf.className = "leaf";
      leaf.append(makeFace(i, "front"), makeFace(mode === "spread" ? i + 1 : null, "back"));
      book.append(leaf);
      leaves.push(leaf);
    }
    zTop = leaves.length + 10;
    leaves.forEach((l, i) => l.classList.toggle("flipped", i < current));
    restZ();
    update();
  }

  function restZ() {
    leaves.forEach((l, i) => {
      l.classList.toggle("top", i === current - 1 || i === current);
      if (!l.classList.contains("turning")) l.style.zIndex = i < current ? i + 1 : leaves.length - i;
    });
  }

  function update() {
    book.dataset.state = current === 0 ? "closed" : current === leaves.length ? "end" : "open";
    const vis = visiblePages();
    book.querySelectorAll(".face[data-page]").forEach((f) => {
      f.inert = !vis.includes(+f.dataset.page);
    });
    btnPrev.disabled = current === 0;
    btnNext.disabled = current >= maxCurrent();

    const rel = vis.map((p) => pages[p]).find((p) => p.r);
    const names = { cover: "Cover", index: "Contents", intro: "Introduction", colophon: "Contact", contact: "Contact", back: "Back cover" };
    $("status-label").textContent = rel ? `${rel.r.catalog} · ${rel.r.title}` : names[pages[vis[vis.length - 1]].type];
    $("status-count").textContent = `${pad(current + 1)} / ${pad(maxCurrent() + 1)}`;

    try {
      history.replaceState(null, "", rel ? `#${rel.r.slug}` : location.pathname + location.search);
    } catch (_) {}
  }

  function flip(dir) {
    const i = dir > 0 ? current : current - 1;
    const leaf = leaves[i];
    if (!leaf) return;
    leaf.style.zIndex = ++zTop;
    leaf.classList.add("turning");
    current += dir;
    leaf.classList.toggle("flipped", dir > 0);
    clearTimeout(leaf._t);
    leaf._t = setTimeout(() => {
      leaf.classList.remove("turning");
      restZ();
    }, DUR());
    update();
  }

  function goTo(target) {
    target = Math.max(0, Math.min(maxCurrent(), target));
    timers.forEach(clearTimeout);
    timers = [];
    const dir = Math.sign(target - current);
    const n = Math.abs(target - current);
    const gap = n > 1 ? Math.max(70, 500 / n) : 0;
    for (let k = 0; k < n; k++) timers.push(setTimeout(() => flip(dir), k * gap));
  }
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  function layout() {
    const newMode = window.innerWidth < SINGLE_BELOW ? "single" : "spread";
    const r = stage.getBoundingClientRect();
    const availW = r.width, availH = r.height - 8;
    let w, h;
    if (newMode === "spread") {
      w = Math.min(availW / 2, availH, 640);
      h = w; // square pages, like an LP
    } else {
      w = Math.min(availW, 560);
      h = Math.min(availH, w * 1.5);
    }
    document.documentElement.style.setProperty("--page-w", `${Math.floor(w)}px`);
    document.documentElement.style.setProperty("--page-h", `${Math.floor(h)}px`);

    if (newMode !== mode) {
      // keep the reader on the same page when switching layouts
      const p = mode ? visiblePages().pop() : null;
      mode = newMode;
      if (p != null) current = pageToCurrent(p);
      book.classList.add("no-anim");
      build();
      current = Math.min(current, maxCurrent());
      requestAnimationFrame(() => requestAnimationFrame(() => book.classList.remove("no-anim")));
    }
  }

  // ── input ────────────────────────────────────────────
  const interact = () => { touched = true; };
  const lbOpen = () => !lightbox.hidden;

  function openLightbox(src, caption) {
    if (!src) return;
    $("lb-img").src = src;
    $("lb-img").alt = caption || "";
    $("lb-cap").textContent = caption || "";
    lightbox.hidden = false;
    $("lb-close").focus();
  }
  function closeLightbox() { lightbox.hidden = true; }
  $("lb-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

  book.addEventListener("click", (e) => {
    interact();
    const go = e.target.closest("[data-goto]");
    if (go) return goTo(pageToCurrent(+go.dataset.goto));
    const zoom = e.target.closest("[data-zoom]");
    if (zoom) return openLightbox(zoom.dataset.zoom, zoom.dataset.caption);
    if (e.target.closest("a, button, .contact-email")) return;
    const face = e.target.closest(".face");
    if (!face) return;
    if (mode === "spread") face.classList.contains("back") ? prev() : next();
    else e.clientX - face.getBoundingClientRect().left < face.offsetWidth * 0.3 ? prev() : next();
  });
  btnPrev.addEventListener("click", () => { interact(); prev(); });
  btnNext.addEventListener("click", () => { interact(); next(); });
  btnContents.addEventListener("click", () => { interact(); goTo(1); });

  document.addEventListener("keydown", (e) => {
    if (lbOpen()) { if (e.key === "Escape") closeLightbox(); return; }
    if (e.target.closest && e.target.closest("input, textarea")) return;
    const map = { ArrowRight: next, ArrowDown: next, PageDown: next, " ": next, ArrowLeft: prev, ArrowUp: prev, PageUp: prev,
      Home: () => goTo(0), End: () => goTo(maxCurrent()) };
    if (map[e.key]) { e.preventDefault(); interact(); map[e.key](); }
  });

  let wheelAcc = 0, wheelLock = 0;
  window.addEventListener("wheel", (e) => {
    if (lbOpen()) return;
    const scroller = e.target.closest && e.target.closest(".scrolls");
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
      const atTop = scroller.scrollTop <= 0, atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if ((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && !atTop)) return; // let the list scroll first
    }
    interact();
    const now = Date.now();
    if (now < wheelLock) return;
    wheelAcc += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(wheelAcc) > 40) {
      wheelAcc > 0 ? next() : prev();
      wheelAcc = 0;
      wheelLock = now + Math.min(DUR(), 700);
    }
  }, { passive: true });

  let t0 = null;
  book.addEventListener("touchstart", (e) => { t0 = e.touches[0]; interact(); }, { passive: true });
  book.addEventListener("touchend", (e) => {
    if (!t0) return;
    const t = e.changedTouches[0], dx = t.clientX - t0.clientX, dy = t.clientY - t0.clientY;
    t0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 45) return; // a tap: handled by click
    if (Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : prev();
    else if (!e.target.closest(".scrolls")) dy < 0 ? next() : prev();
  }, { passive: true });

  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });

  // ── start ────────────────────────────────────────────
  layout();
  const fromHash = releases.find((r) => `#${r.slug}` === location.hash);
  if (fromHash) {
    book.classList.add("no-anim");
    current = pageToCurrent(fromHash.page);
    build();
    requestAnimationFrame(() => requestAnimationFrame(() => book.classList.remove("no-anim")));
  } else if (C.autoOpen > 0) {
    setTimeout(() => { if (!touched && current === 0) next(); }, C.autoOpen);
  }
})();
