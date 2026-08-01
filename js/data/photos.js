// ============================================================
// Photography manifest.
//
// To add a photo:
//   1. Drop the image file into assets/photos/<category>/
//      (create a new category folder if needed).
//   2. Append one object here:
//        { id: "unique-slug",           // referenced by Footprints entries
//          src: "assets/photos/<category>/<file>.jpg",
//          category: "Astro" | "Travel" | ... (any label),
//          caption: "shown under the photo and used as alt text",
//          date: "YYYY-MM",
//          w: 1200, h: 800 }            // intrinsic px — prevents layout shift
// The grid, category filter chips, lightbox, and the Albums
// counter all update automatically — no other file needs editing.
// ============================================================

const PHOTOS = [
  {
    id: "milky-way-01",
    src: "assets/photos/astro/milky-way-01.jpg",
    category: "Astro",
    caption: "Placeholder — Milky Way over central Illinois",
    date: "2025-08",
    w: 1200,
    h: 800,
  },
  {
    id: "dusk-01",
    src: "assets/photos/travel/dusk-01.jpg",
    category: "Travel",
    caption: "Placeholder — dusk on the road",
    date: "2025-06",
    w: 900,
    h: 1200,
  },
  {
    id: "quad-01",
    src: "assets/photos/campus/quad-01.jpg",
    category: "Campus",
    caption: "Placeholder — the UIUC Main Quad",
    date: "2025-04",
    w: 1200,
    h: 900,
  },
];
