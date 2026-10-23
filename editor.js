/* Editor: open the site with ?edit at the end of the address.

   Edits are kept as a draft in this browser and shown live beside the
   panel. "Publish" uploads new images and a fresh content.js straight to
   the GitHub repository using a personal access token, and GitHub Pages
   rebuilds the site within a minute or two. Without a token you can
   download content.js and upload it yourself.

   The token is only ever sent to api.github.com. */
(() => {
  "use strict";

  const site = window.PORTFOLIO_SITE;
  if (!site) return;

  const DRAFT_KEY = "portfolio-editor-draft";
  const GH_KEY = "portfolio-editor-github";
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} },
  };

  // ── data ─────────────────────────────────────────────
  const published = clone(window.PORTFOLIO);
  const draft = store.get(DRAFT_KEY);
  let data = draft && draft.data ? draft.data : clone(published);
  let dirty = !!(draft && !draft.published && JSON.stringify(draft.data) !== JSON.stringify(published));
  normalize(data);

  function normalize(d) {
    d.releases = d.releases || [];
    d.contact = d.contact || {};
    d.contact.links = d.contact.links || [];
    d.history = d.history || [];
    d.lists = d.lists || [];
    d.releases.forEach((r) => {
      r.gallery = (r.gallery || []).map((g) => (typeof g === "string" ? { src: g } : g));
      r.sections = r.sections || [];
    });
  }

  // images chosen in this session, waiting to be uploaded
  const pending = new Map(); // path -> File
  window.PORTFOLIO_PREVIEW_SRC = window.PORTFOLIO_PREVIEW_SRC || {};

  let redrawT;
  function changed() {
    dirty = true;
    store.set(DRAFT_KEY, { data, published: false, at: Date.now() });
    setStatus("Unpublished changes · saved in this browser");
    clearTimeout(redrawT);
    redrawT = setTimeout(() => { site.load(data); site.rerender(); }, 180);
  }

  // ── tiny DOM helper ──────────────────────────────────
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  let uid = 0;
  const btn = (label, onclick, cls = "") => h("button", { type: "button", class: `ed-btn ${cls}`, onclick }, label);

  // ── fields ───────────────────────────────────────────
  function field(obj, key, opt = {}) {
    const id = `ed-f${++uid}`;
    let el;
    if (opt.type === "textarea") el = h("textarea", { id, rows: opt.rows || 4, placeholder: opt.placeholder });
    else if (opt.type === "select") el = h("select", { id }, opt.options.map(([v, t]) => h("option", { value: v }, t)));
    else el = h("input", { id, type: opt.type === "checkbox" ? "checkbox" : opt.type === "number" ? "number" : "text", placeholder: opt.placeholder });

    if (opt.type === "checkbox") el.checked = obj[key] !== false;
    else el.value = opt.get ? opt.get(obj) : obj[key] ?? "";

    el.addEventListener(opt.type === "checkbox" || opt.type === "select" ? "change" : "input", () => {
      let v = opt.type === "checkbox" ? el.checked : el.value;
      if (opt.type === "number") v = v === "" ? 0 : Number(v);
      if (opt.set) opt.set(obj, v);
      else if (v === "" && !opt.keepEmpty) delete obj[key];
      else obj[key] = v;
      if (!opt.silent) changed();
      opt.after && opt.after(v);
    });

    const label = h("label", { class: `ed-field${opt.type === "checkbox" ? " ed-check" : ""}`, for: id });
    if (opt.type === "checkbox") label.append(el, h("span", { class: "ed-label" }, opt.label));
    else label.append(h("span", { class: "ed-label" }, opt.label), el);
    if (opt.hint) label.append(h("span", { class: "ed-hint" }, opt.hint));
    return label;
  }

  const cleanName = (name) => {
    const dot = name.lastIndexOf(".");
    const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
    const ext = (dot > 0 ? name.slice(dot + 1) : "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${base}.${ext}`;
  };

  function imageField(obj, key, label, hint) {
    const wrap = field(obj, key, { label, hint, placeholder: "images/file-name.jpg", after: () => paint() });
    const text = wrap.querySelector("input");
    const thumb = h("span", { class: "ed-thumb", "aria-hidden": "true" });
    const picker = h("input", { type: "file", accept: "image/*", hidden: true });
    picker.addEventListener("change", () => {
      const file = picker.files[0];
      if (!file) return;
      const path = `images/${cleanName(file.name)}`;
      pending.set(path, file);
      window.PORTFOLIO_PREVIEW_SRC[path] = URL.createObjectURL(file);
      obj[key] = path;
      text.value = path;
      paint();
      changed();
      renderPending();
      picker.value = "";
    });
    function paint() {
      const src = obj[key] ? window.PORTFOLIO_PREVIEW_SRC[obj[key]] || obj[key] : "";
      thumb.style.backgroundImage = src ? `url("${src.replace(/"/g, "%22")}")` : "";
      thumb.classList.toggle("is-empty", !src);
    }
    wrap.insertBefore(h("div", { class: "ed-imgrow" }, thumb, btn("Choose image…", () => picker.click())), text.nextSibling);
    text.classList.add("ed-path");
    wrap.append(picker);
    paint();
    return wrap;
  }

  // a list of cards with add / move / remove
  function repeater(arr, { title, fields, make, addLabel }) {
    const box = h("div", { class: "ed-rep" });
    function draw() {
      box.replaceChildren(
        ...arr.map((item, i) =>
          h("div", { class: "ed-card" },
            h("div", { class: "ed-card-head" },
              h("span", { class: "ed-card-title" }, title(item, i)),
              h("span", { class: "ed-card-tools" },
                btn("↑", () => move(i, -1), "ed-icon"),
                btn("↓", () => move(i, 1), "ed-icon"),
                btn("Remove", () => { arr.splice(i, 1); draw(); changed(); }, "ed-quiet"))),
            fields(item, i))),
        btn(addLabel, () => { arr.push(make()); draw(); changed(); }, "ed-add"));
    }
    function move(i, d) {
      const j = i + d;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      draw();
      changed();
    }
    draw();
    return box;
  }

  const group = (title, ...kids) => h("section", { class: "ed-group" }, h("h3", { class: "ed-group-title" }, title), ...kids);

  // ── tabs ─────────────────────────────────────────────
  const tabs = {
    Work() {
      const list = h("div", { class: "ed-works" });
      function draw(openIndex) {
        list.replaceChildren(
          ...data.releases.map((r, i) => {
            const d = h("details", { class: "ed-work", open: i === openIndex });
            const name = h("span", { class: "ed-work-name" }, r.title || "Untitled");
            d.append(
              h("summary", {},
                h("span", { class: "ed-work-num" }, String(i + 1).padStart(2, "0")),
                name,
                h("span", { class: "ed-card-tools" },
                  btn("↑", (e) => { e.preventDefault(); move(i, -1); }, "ed-icon"),
                  btn("↓", (e) => { e.preventDefault(); move(i, 1); }, "ed-icon"))),
              workFields(r, i, (t) => (name.textContent = t || "Untitled")),
              h("div", { class: "ed-danger" }, btn("Delete this piece", (e) => confirmBtn(e.currentTarget, () => {
                data.releases.splice(i, 1);
                draw(-1);
                changed();
                site.goHome("work");
              }), "ed-quiet")));
            d.addEventListener("toggle", () => { if (d.open) site.openWork(i); });
            return d;
          }),
          btn("+ Add a piece", () => {
            data.releases.push({ title: "New piece", artist: "", year: String(new Date().getFullYear()), format: "", role: "", art: "", gallery: [], sections: [], description: "" });
            changed();
            draw(data.releases.length - 1);
            setTimeout(() => site.openWork(data.releases.length - 1), 220);
          }, "ed-add"));
      }
      function move(i, d) {
        const j = i + d;
        if (j < 0 || j >= data.releases.length) return;
        [data.releases[i], data.releases[j]] = [data.releases[j], data.releases[i]];
        changed();
        draw(j);
        setTimeout(() => site.openWork(j), 220);
      }
      draw(-1);
      return [h("p", { class: "ed-intro" }, "Each piece is one thumbnail on the selector and its own project page. Open a piece to edit it; the preview jumps to its page."), list];
    },

    About() {
      return [
        group("Intro",
          field(data, "headline", { label: "Headline under your name", type: "textarea", rows: 2 })),
        group("Bio",
          imageField(data, "portrait", "Portrait", "Portrait shape, about 1200×1500px."),
          field(data, "bio", { label: "Bio", type: "textarea", rows: 10, hint: "Leave a blank line between paragraphs. The first paragraph is shown slightly larger." })),
        group("Personal history",
          repeater(data.history, {
            title: (x) => [x.years, x.title].filter(Boolean).join(" · ") || "Entry",
            make: () => ({ years: "", title: "", place: "" }),
            addLabel: "+ Add to timeline",
            fields: (x) => [
              field(x, "years", { label: "Years", placeholder: "2021 – 2024" }),
              field(x, "title", { label: "Title", placeholder: "Role, degree or milestone" }),
              field(x, "place", { label: "Place", placeholder: "Studio, school or city" }),
              field(x, "detail", { label: "Detail (optional)", type: "textarea", rows: 2 }),
            ],
          }),
          h("p", { class: "ed-hint" }, "Newest first reads best.")),
        group("Lists beside the timeline",
          repeater(data.lists, {
            title: (x) => x.heading || "List",
            make: () => ({ heading: "", items: [] }),
            addLabel: "+ Add a list",
            fields: (x) => [
              field(x, "heading", { label: "Heading", placeholder: "Selected clients" }),
              field(x, "items", {
                label: "Items, one per line", type: "textarea", rows: 5,
                get: (o) => (o.items || []).join("\n"),
                set: (o, v) => (o.items = v.split("\n").map((s) => s.trim()).filter(Boolean)),
              }),
            ],
          })),
      ];
    },

    Contact() {
      const c = data.contact;
      return [
        group("Contact",
          field(c, "email", { label: "Email" }),
          field(c, "location", { label: "Location", placeholder: "City, Country" }),
          field(c, "availability", { label: "Availability", type: "textarea", rows: 2 })),
        group("Links",
          repeater(c.links, {
            title: (x) => x.label || "Link",
            make: () => ({ label: "", url: "https://" }),
            addLabel: "+ Add a link",
            fields: (x) => [field(x, "label", { label: "Label", placeholder: "Instagram" }), field(x, "url", { label: "Address", placeholder: "https://…" })],
          })),
        group("Footer",
          field(data, "colophon", { label: "Footer note", type: "textarea", rows: 2, hint: "The first paragraph appears at the bottom of the page." })),
      ];
    },

    Site() {
      return [
        group("Identity",
          field(data, "designer", { label: "Your name" }),
          field(data, "tagline", { label: "Tagline", placeholder: "Graphic Design · Album Art · Identity" }),
          field(data, "catalogPrefix", { label: "Catalogue prefix", hint: "Pieces without their own catalogue number are numbered automatically, e.g. YN-001." })),
        group("Selector",
          field(data, "autoRotate", { label: "Turn to the next piece every (milliseconds)", type: "number", keepEmpty: true, hint: "3500 = every 3.5 seconds. 0 turns it off." }),
          field(data, "hoverPreview", { label: "Magnified preview when hovering a thumbnail", type: "checkbox" })),
      ];
    },

    Publish: () => publishTab(),
  };

  function workFields(r, i, onTitle) {
    if (!r.link) r.link = {};
    return h("div", { class: "ed-work-body" },
      group("Basics",
        field(r, "title", { label: "Title", after: onTitle }),
        field(r, "artist", { label: "Artist" }),
        h("div", { class: "ed-row" },
          field(r, "year", { label: "Year" }),
          field(r, "format", { label: "Format", placeholder: "LP, EP, Single…" })),
        field(r, "label", { label: "Label" }),
        field(r, "role", { label: "Your role", placeholder: "Art direction, cover, typography" }),
        field(r, "catalog", { label: "Catalogue number (optional)", hint: "Also used in the piece's web address." })),
      group("Images",
        imageField(r, "thumb", "Thumbnail", "Shown on the selector. Square, about 800px. If empty, the large art is used."),
        imageField(r, "art", "Large art", "Shown on the project page. Square, 2000–3000px."),
        field(r, "fit", { label: "Large art fit", type: "select", options: [["cover", "Fill the square"], ["contain", "Show the whole image"]], keepEmpty: true }),
        h("span", { class: "ed-label ed-sublabel" }, "More project images"),
        repeater(r.gallery, {
          title: (g, k) => g.caption || `Image ${k + 1}`,
          make: () => ({ src: "", caption: "" }),
          addLabel: "+ Add an image",
          fields: (g) => [imageField(g, "src", "Image"), field(g, "caption", { label: "Caption" })],
        })),
      group("Write-up",
        field(r, "description", { label: "Opening statement", type: "textarea", rows: 3, hint: "One to three sentences, shown large." }),
        h("span", { class: "ed-label ed-sublabel" }, "Sections"),
        repeater(r.sections, {
          title: (x) => x.heading || "Section",
          make: () => ({ heading: "", text: "" }),
          addLabel: "+ Add a section",
          fields: (x) => [field(x, "heading", { label: "Heading", placeholder: "Brief, Concept, Process…" }), field(x, "text", { label: "Text", type: "textarea", rows: 6 })],
        }),
        field(r, "credits", { label: "Credits", placeholder: "Photography: Name · Print: Name" })),
      group("Link",
        h("div", { class: "ed-row" },
          field(r.link, "label", { label: "Button text", placeholder: "Listen" }),
          field(r.link, "url", { label: "Address", placeholder: "https://…" }))));
  }

  // two-step confirm, since the page can't use confirm()
  function confirmBtn(el, action) {
    if (el.dataset.armed) return action();
    el.dataset.armed = "1";
    const was = el.textContent;
    el.textContent = "Click again to confirm";
    el.classList.add("is-armed");
    setTimeout(() => { delete el.dataset.armed; el.textContent = was; el.classList.remove("is-armed"); }, 4000);
  }

  // ── publishing ───────────────────────────────────────
  function defaultRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const first = location.pathname.split("/").filter(Boolean)[0];
    if (m) return { owner: m[1], repo: first && !first.includes(".") ? first : `${m[1]}.github.io` };
    return { owner: "SyrVetra", repo: "GraphicDesignPortfolio" };
  }
  const gh = Object.assign({ branch: "main", token: "", remember: true }, defaultRepo(), store.get(GH_KEY) || {});
  let pendingBox, logBox;

  function renderPending() {
    if (!pendingBox) return;
    pendingBox.replaceChildren(
      pending.size
        ? h("div", {}, h("span", { class: "ed-label" }, `New images to upload (${pending.size})`),
            h("ul", { class: "ed-files" }, [...pending.entries()].map(([p, f]) => h("li", {}, p, h("span", {}, ` ${(f.size / 1048576).toFixed(1)} MB`)))))
        : h("p", { class: "ed-hint" }, "No new images waiting to upload."));
  }

  function publishTab() {
    pendingBox = h("div", { class: "ed-pending" });
    logBox = h("ol", { class: "ed-log", "aria-live": "polite" });
    renderPending();
    const saveSettings = () => store.set(GH_KEY, gh.remember ? gh : { ...gh, token: "" });
    const ghField = (key, label, opt = {}) => field(gh, key, { ...opt, label, keepEmpty: true, silent: true, after: saveSettings });
    const tokenField = ghField("token", "Access token", {
      hint: "Stays in this browser and is only sent to GitHub.",
    });
    tokenField.querySelector("input").type = "password";
    tokenField.querySelector("input").autocomplete = "off";

    const publishBtn = btn("Publish to website", () => publish(publishBtn), "ed-primary");

    return [
      h("p", { class: "ed-intro" }, dirty ? "You have changes that aren't on the live site yet." : "The live site matches this draft."),
      group("Publish to GitHub",
        pendingBox,
        h("div", { class: "ed-row" }, ghField("owner", "GitHub account"), ghField("repo", "Repository")),
        ghField("branch", "Branch"),
        tokenField,
        ghField("remember", "Remember the token on this device", { type: "checkbox" }),
        publishBtn,
        logBox,
        h("details", { class: "ed-help" },
          h("summary", {}, "How to get an access token"),
          h("ol", {},
            h("li", {}, "Open ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener" }, "GitHub → New fine-grained token"), "."),
            h("li", {}, "Name it (e.g. “Portfolio editor”) and pick an expiry date."),
            h("li", {}, "Repository access: “Only select repositories” → your portfolio repository."),
            h("li", {}, "Permissions → Repository permissions → Contents: “Read and write”."),
            h("li", {}, "Generate the token, copy it and paste it above."))),
      ),
      group("Or publish by hand",
        h("p", { class: "ed-hint" }, "Download content.js, then upload it (and any new images, into the images folder) on github.com with Add file → Upload files."),
        btn("Download content.js", download)),
      group("Start over",
        h("p", { class: "ed-hint" }, "Throw away the draft in this browser and go back to what's on the live site."),
        btn("Discard draft", (e) => confirmBtn(e.currentTarget, () => {
          store.del(DRAFT_KEY);
          data = clone(published);
          normalize(data);
          dirty = false;
          site.load(data);
          site.rerender();
          setStatus("Draft discarded");
          showTab("Publish");
        }), "ed-quiet")),
    ];
  }

  function exportData() {
    const out = clone(data);
    const prune = (o) => {
      if (Array.isArray(o)) return o.forEach(prune);
      if (o && typeof o === "object") {
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (v === "" || (Array.isArray(v) && !v.length) || (v && typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)) delete o[k];
          else prune(v);
        }
      }
    };
    (out.releases || []).forEach((r) => {
      if (r.link && !r.link.url) delete r.link;
      r.gallery = (r.gallery || []).filter((g) => g.src).map((g) => (g.caption ? g : g.src));
      r.sections = (r.sections || []).filter((s) => s.heading || s.text);
    });
    prune(out);
    // keep the top-level lists even when empty, so the field names stay visible
    ["releases", "history", "lists"].forEach((k) => (out[k] = out[k] || []));
    return out;
  }

  function toJS(v, ind = "") {
    const pad = `${ind}  `;
    if (v == null) return "null";
    if (typeof v === "string") {
      return v.includes("\n") ? "`" + v.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`" : JSON.stringify(v);
    }
    if (typeof v !== "object") return String(v);
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      if (v.every((x) => typeof x !== "object") && JSON.stringify(v).length < 72) return `[${v.map((x) => toJS(x)).join(", ")}]`;
      return `[\n${v.map((x) => pad + toJS(x, pad)).join(",\n")},\n${ind}]`;
    }
    const keys = Object.keys(v);
    if (!keys.length) return "{}";
    return `{\n${keys.map((k) => `${pad}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${toJS(v[k], pad)}`).join(",\n")},\n${ind}}`;
  }

  const contentFile = () => `/*
  Portfolio content. Edit it with the site's editor (add ?edit to the end of
  the site's address) or by hand. Field reference: README.md
  Images live in the images/ folder, e.g. art: "images/01-cover.jpg".
*/

window.PORTFOLIO = ${toJS(exportData())};
`;

  function download() {
    const url = URL.createObjectURL(new Blob([contentFile()], { type: "text/javascript" }));
    const a = h("a", { href: url, download: "content.js" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (pending.size) setStatus(`Downloaded. Remember to upload ${pending.size} new image${pending.size > 1 ? "s" : ""} too.`);
  }

  const toBase64Text = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const fileBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Couldn't read the image file."));
    r.readAsDataURL(file);
  });

  async function api(path, opts = {}) {
    let res;
    try {
      res = await fetch(`https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/${path}`, {
        method: opts.method || "GET",
        body: opts.body,
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${gh.token.trim()}`, "X-GitHub-Api-Version": "2022-11-28" },
      });
    } catch (_) {
      throw new Error("Couldn't reach GitHub. Check your internet connection and try again.");
    }
    if (res.status === 404 && opts.allow404) return null;
    if (!res.ok) {
      const msg = {
        401: "GitHub didn't accept the access token. Check it was copied in full and hasn't expired.",
        403: "The token isn't allowed to change files here. Give it Contents: “Read and write” for this repository.",
        404: `Couldn't find ${gh.owner}/${gh.repo}. Check the account and repository names, and that the token has access to this repository.`,
        409: "GitHub reported a conflict (the file changed at the same moment). Press Publish again.",
        422: "GitHub rejected the update. Press Publish again; if it keeps happening, check the branch name.",
      }[res.status];
      throw new Error(msg || `GitHub returned an error (${res.status}). Try again in a moment.`);
    }
    return res.json();
  }

  async function putFile(path, base64, message) {
    const p = path.split("/").map(encodeURIComponent).join("/");
    const cur = await api(`contents/${p}?ref=${encodeURIComponent(gh.branch)}`, { allow404: true });
    await api(`contents/${p}`, {
      method: "PUT",
      body: JSON.stringify({ message, content: base64, branch: gh.branch, ...(cur && cur.sha ? { sha: cur.sha } : {}) }),
    });
  }

  let publishing = false;
  async function publish(button) {
    if (publishing) return;
    logBox.replaceChildren();
    const log = (text, cls = "") => logBox.append(h("li", { class: cls }, text));
    if (!gh.token.trim()) return log("Paste an access token first (see “How to get an access token” below).", "is-error");
    if (!gh.owner || !gh.repo) return log("Fill in the GitHub account and repository.", "is-error");

    publishing = true;
    button.disabled = true;
    button.textContent = "Publishing…";
    try {
      for (const [path, file] of pending) {
        if (file.size > 25 * 1048576) throw new Error(`${path} is ${(file.size / 1048576).toFixed(0)} MB. Export it smaller (under 25 MB, ideally under 2 MB) and choose it again.`);
        log(`Uploading ${path}…`);
        await putFile(path, await fileBase64(file), `Add ${path} (site editor)`);
        pending.delete(path);
        renderPending();
      }
      log("Saving content.js…");
      await putFile("content.js", toBase64Text(contentFile()), "Update portfolio content (site editor)");
      dirty = false;
      store.set(DRAFT_KEY, { data, published: true, at: Date.now() });
      log("Published. The live site updates within a minute or two; refresh it then.", "is-ok");
      setStatus("Published");
    } catch (err) {
      log(err.message, "is-error");
      setStatus("Not published. See the Publish tab.");
    } finally {
      publishing = false;
      button.disabled = false;
      button.textContent = "Publish to website";
    }
  }

  // ── panel ────────────────────────────────────────────
  const body = h("div", { class: "ed-body" });
  const status = h("span", { class: "ed-status", "aria-live": "polite" });
  const tabBar = h("nav", { class: "ed-tabs", role: "tablist" },
    Object.keys(tabs).map((name) => h("button", { type: "button", role: "tab", "data-tab": name, onclick: () => showTab(name) }, name)));
  const showBtn = h("button", { type: "button", class: "ed-show", onclick: () => toggle(true) }, "Edit");
  const panel = h("aside", { class: "ed", "aria-label": "Editor" },
    h("header", { class: "ed-head" },
      h("b", {}, "Editor"),
      status,
      btn("Hide", () => toggle(false), "ed-quiet")),
    tabBar,
    body);

  function setStatus(t) { status.textContent = t; }
  function showTab(name) {
    tabBar.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    body.replaceChildren(...[].concat(tabs[name]()));
    body.scrollTop = 0;
    if (name !== "Publish") pendingBox = null;
    // show the part of the site this tab edits
    const section = { About: "about", Contact: "contact", Site: "top" }[name];
    if (section && current) site.goHome(section === "top" ? "" : section);
    current = name;
  }
  let current = null;
  function toggle(open) {
    panel.hidden = !open;
    showBtn.hidden = open;
    document.body.classList.toggle("editing", open);
  }

  window.addEventListener("beforeunload", (e) => {
    if (pending.size) { e.preventDefault(); e.returnValue = ""; } // chosen images can't be kept as a draft
  });

  document.body.append(panel, showBtn);
  toggle(true);
  showTab("Work");
  setStatus(dirty ? "Restored your unpublished changes" : "Changes save in this browser as you type");
  if (draft && draft.data) { site.load(data); site.rerender(); }
})();
