// ============================================================
// Footprints data — countries and places visited.
//
// Keys are ISO alpha-2 country codes (match the map's path ids).
// To add a place:
//   - new country:  "FR": { name: "France", visited: true, regions: [...] }
//   - new region:   append { name, date: "YYYY-MM", photoIds: [] } to the
//     country's regions array. Regions are provinces for CN, states for
//     US, cities for other countries. photoIds reference `id` values in
//     js/data/photos.js (photo strips get wired in a later prompt).
//   - mark a country you passed through without stories as
//     { name, visited: false } to keep it findable but unhighlighted.
// The map coloring and the "N countries" entry-card counter update
// automatically. Placeholder data — real entries arrive next round.
// ============================================================

const FOOTPRINTS = {
  CN: {
    name: "China",
    visited: true,
    regions: [
      { name: "Shanghai", date: "2023-06", photoIds: ["shanghai-01"] },
    ],
  },
  US: {
    name: "United States",
    visited: true,
    regions: [
      { name: "Illinois", date: "2023-08", photoIds: [] },
    ],
  },
  JP: {
    name: "Japan",
    visited: false,
  },
};
