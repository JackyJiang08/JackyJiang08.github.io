// ============================================================
// Photography manifest.
//
// To add a photo:
//   1. Drop the image file into assets/photos/<category>/
//      (create a new category folder if needed).
//   2. Append one object here:
//        { src: "assets/photos/<category>/<file>.jpg",
//          category: "Astro" | "Travel" | ... (any label),
//          caption: "shown under the photo and used as alt text",
//          date: "YYYY-MM" }
// The grid, category filter chips, and lightbox all update
// automatically — no other file needs editing.
// ============================================================

const PHOTOS = [
  {
    src: "assets/photos/astro/milky-way-01.jpg",
    category: "Astro",
    caption: "Placeholder — Milky Way over central Illinois",
    date: "2025-08",
  },
  {
    src: "assets/photos/travel/dusk-01.jpg",
    category: "Travel",
    caption: "Placeholder — dusk on the road",
    date: "2025-06",
  },
  {
    src: "assets/photos/campus/quad-01.jpg",
    category: "Campus",
    caption: "Placeholder — the UIUC Main Quad",
    date: "2025-04",
  },
];
