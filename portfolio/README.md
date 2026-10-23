# Portfolio site: rotating selector

A static website (plain HTML/CSS/JS, no build step).

- **Home** (`yoursite.com/`): one scrolling page with four sections:
  1. **Intro**: your name and a one-line headline.
  2. **Selected work** (`#work`): a rotating ring of thumbnails. It turns by itself until
     someone touches it. Drag it, swipe sideways, use the arrow keys or the dial to rotate it.
     Click a side thumbnail to bring it to the front, and click the front one (or "View
     project") to open it.
     On a computer, hovering a thumbnail dims the site and magnifies the art into the
     centre of the screen, cycling through the project's images (turn off with
     `hoverPreview: false`).
  3. **About** (`#about`): portrait, bio, a personal-history timeline, and optional
     lists such as clients and services.
  4. **Contact** (`#contact`): email, availability and links.
- **Project pages** (`yoursite.com/#yn-001`): each piece has its own page and link:
  the art at large format, then a quiet reading area for your write-up (title and
  key facts on the left, your explanation on the right), more project images, and
  links to the previous and next projects. In Chrome, Edge and Safari the thumbnail grows into the
  large image as the page opens. Click any image to view it full screen. "← All work"
  returns to the selector.

```
portfolio/
├── index.html     page shell (rarely needs editing)
├── content.js     ← ALL your text and image paths live here
├── styles.css     colours, fonts, sizes (tokens at the top)
├── site.js        selector + page engine
├── images/        ← put your graphics here
└── flipbook-v1/   the earlier flip-book version (uses the same content.js)
```

## Adding your work

1. Copy your graphics into `images/`.
2. Open `content.js` and, for each release, set
   `thumb: "images/01-thumb.jpg"` (the small selector image) and
   `art: "images/01-cover.jpg"` (the large image on its project page).
   If you leave out `thumb`, the selector uses `art`. Extra images for the project page go in `gallery`.
3. Write about each piece. `description` is the short opening statement shown
   large on its project page. For a longer write-up, add `sections`: a list of
   `{ heading, text }` blocks such as Brief, Concept and Process. The first release
   in `content.js` shows an example.
4. Add, remove or reorder entries in `releases`. The selector and pages update by themselves.

## Writing your bio

In `content.js`:
- `headline`: the sentence under your name at the top of the page.
- `portrait`: path to your photo (portrait shape, ~1200×1500px).
- `bio`: your story. Leave a blank line between paragraphs. The first paragraph is
  set slightly larger.
- `history`: your timeline, newest first. Each entry has `years`, `title`, `place`
  and an optional `detail`.
- `lists`: short lists beside the timeline (clients, services, awards…). Delete it
  if you don't want them.

Any image slot with no file (or a wrong path) shows a dashed box naming the file it
expects, so you can see what's missing.

**Image sizes:** thumbnails ~800×800px; large art 2000–3000px square (export as
JPG/WebP). For non-square art, set `fit: "contain"` on that release. Gallery images
can be any shape.

## Changing the look

Edit the tokens at the top of `styles.css`: `--accent` is the highlight colour,
`--bg` the background, `--item` the selector thumbnail size. Fonts load from Google Fonts in
`index.html`; swap the families there and in the `--f-*` tokens.

## Previewing and publishing

Open `index.html` in a browser to preview locally. To publish, upload the whole
folder to any static host: Netlify Drop (drag the folder in), GitHub Pages,
Vercel, Cloudflare Pages, or your own web server.
