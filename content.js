/*
  ─────────────────────────────────────────────────────────────
  CONTENT FILE: this is the only file you need to edit.
  ─────────────────────────────────────────────────────────────
  • Put your graphics in the /images folder.
  • Point each "art", "gallery", "coverImage", etc. at the file,
    e.g.  art: "images/01-cover.jpg"
  • Any slot left as "" (or pointing at a missing file) shows a
    dashed placeholder telling you which image belongs there.
  • Everything below is EXAMPLE text. Replace it with your own.
*/

window.PORTFOLIO = {
  designer: "Your Name",
  tagline: "Graphic Design · Album Art · Identity",
  bookTitle: "Discography",
  edition: "Vol. 1 · 2019–2026",

  // Prefix for auto-generated catalogue numbers (YN-001, YN-002...).
  // You can also set "catalog" on each release yourself.
  catalogPrefix: "YN",

  // Front / back cover. Leave "" for the typographic cover,
  // or give a path to use your own full-page cover graphic.
  coverImage: "",
  backCoverImage: "",

  // Portrait (or logo) shown beside your bio. Portrait shape, ~1200×1500px.
  portrait: "images/portrait.jpg",

  // One or two sentences at the very top of the home page.
  headline: "I design record sleeves, single artwork and visual identities for musicians and independent labels.",

  // ── BIO & PERSONAL HISTORY (the "About" section of the home page) ──
  // Separate paragraphs with a blank line.
  bio: `Write your story here: where you grew up, how you found your way into design, and what drew you to music in particular.

A second paragraph might cover how you work: your process, the tools and materials you love, and the kind of artists you most like to collaborate with.

A third can say what you're doing now and what you'd like to make next.`,

  // Your timeline, newest first. Add as many entries as you like.
  // "detail" is optional.
  history: [
    { years: "2024 – now", title: "Independent designer", place: "City, Country",
      detail: "Sleeves, campaigns and identities for independent artists and labels." },
    { years: "2021 – 2024", title: "In-house designer", place: "Label or Studio Name",
      detail: "What you worked on and what you learned." },
    { years: "2019", title: "First record sleeve", place: "Artist Name",
      detail: "The project that started it all." },
    { years: "2016 – 2019", title: "BA Graphic Design", place: "School Name" },
  ],

  // Optional short lists shown beside the timeline. Delete any you don't want.
  lists: [
    { heading: "Selected clients", items: ["Label Name", "Artist Name", "Festival Name", "Venue Name"] },
    { heading: "Services", items: ["Album & single artwork", "Art direction", "Logotypes", "Tour & gig posters"] },
  ],

  // The home-page selector turns to the next piece every this many
  // milliseconds until a visitor touches it. Set to 0 to turn it off.
  autoRotate: 3500,

  // Show a larger preview card when the mouse hovers a thumbnail
  // (computers only; phones and tablets tap straight through). false = off.
  hoverPreview: true,

  // (Used by the flip-book version in /flipbook-v1 only.)
  autoOpen: 1600,

  intro: `I design record sleeves, single artwork and visual identities for musicians and independent labels.

This book collects the releases I've worked on, from first sketches to the printed sleeve. Each spread shows the front cover on the left and the story behind it on the right.`,

  colophon: `Set in Archivo, Newsreader and IBM Plex Mono.

All artwork © the respective artists and labels. Shown here for portfolio purposes.`,

  contact: {
    email: "hello@yourname.com",
    location: "City, Country",
    availability: "Taking commissions for spring 2027.",
    links: [
      { label: "Instagram", url: "https://instagram.com/yourhandle" },
      { label: "Behance", url: "https://behance.net/yourhandle" },
    ],
  },

  /*
    RELEASES: one entry = one thumbnail on the rotating selector
    AND its own project page (yoursite.com/#yn-001).

      thumb       small image shown on the selector (square, ~800px).
                  Leave it out to reuse "art".
      art         the large-format image on the project page
                  (square works best, 2000–3000px).

    Fields (all optional except title):
      title, artist, year, format ("LP", "EP", "7\"", "Single", "Digital"),
      label, role (what you did), description,
      fit         "cover" (fill the square, default) or "contain" (show whole image)
      gallery     more large images for the project page: ["images/a.jpg", ...] or
                  [{ src: "images/a.jpg", caption: "Back sleeve" }, ...]
      description the opening statement on the project page, shown large.
                  One to three sentences works best.
      sections    optional longer write-up under the description, as
                  [{ heading: "Brief", text: "..." }, ...]. Use any headings
                  you like (Brief, Concept, Process, Print, Outcome...).
                  Separate paragraphs with a blank line.
      credits     e.g. "Photography: Name · Print: Name"
      link        { label: "Listen", url: "https://..." }
      catalog     your own catalogue number (otherwise auto-generated)
  */
  releases: [
    {
      title: "Release Title One",
      artist: "Artist Name",
      year: 2026,
      format: "LP",
      label: "Label Name",
      role: "Art direction, cover illustration, typography",
      thumb: "images/01-thumb.jpg",
      art: "images/01-cover.jpg",
      gallery: [
        { src: "images/01-back.jpg", caption: "Back sleeve" },
        { src: "images/01-label.jpg", caption: "Centre label" },
        { src: "images/01-insert.jpg", caption: "Lyric insert" },
      ],
      description: `One or two sentences that sum up the piece: what the record is and the idea behind the sleeve.`,
      sections: [
        { heading: "Brief", text: `What the artist or label asked for, and what the record sounds like.` },
        { heading: "Concept", text: `The idea you landed on and why it fits the music.

Add as many paragraphs as you need.` },
        { heading: "Process", text: `Sketches, techniques, typefaces, paper stock or print finishes.` },
      ],
      credits: "Photography: Name Surname · Print: Printer Name",
      link: { label: "Listen", url: "https://example.com" },
    },
    {
      title: "Release Title Two",
      artist: "Artist Name",
      year: 2025,
      format: "EP",
      label: "Label Name",
      role: "Cover design, logotype",
      art: "images/02-cover.jpg",
      gallery: ["images/02-detail.jpg", "images/02-poster.jpg"],
      description: `Describe the concept in two or three sentences. Mention anything a visitor can't see from the image alone, such as a custom typeface or a spot-colour print.`,
    },
    {
      title: "Release Title Three",
      artist: "Artist Name",
      year: 2024,
      format: "Single",
      role: "Single artwork, motion loop for streaming",
      art: "images/03-cover.jpg",
      description: `Single artwork series: explain how this cover fits the album campaign.`,
    },
    {
      title: "Release Title Four",
      artist: "Artist Name",
      year: 2023,
      format: "7\"",
      label: "Label Name",
      role: "Sleeve, centre labels, tour poster",
      art: "images/04-cover.jpg",
      gallery: ["images/04-poster.jpg"],
      description: `Notes on the project.`,
    },
    {
      title: "Release Title Five",
      artist: "Artist Name",
      year: 2021,
      format: "Digital",
      role: "Cover artwork",
      art: "images/05-cover.jpg",
      fit: "contain",
      description: `Notes on the project.`,
    },
  ],
};
