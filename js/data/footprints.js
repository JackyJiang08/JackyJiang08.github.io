// ============================================================
// Footprints data — countries, regions, and cities visited.
//
// Schema:
//   "XX": { name, visited, zoomBox?, date?, photoIds?, regions?: [
//     { name, slug?, date?, photoIds?, cities?: [
//       { name, lat, lng, date?, photoIds? } ] } ] }
//
// Country-level date/photoIds feed the COUNTRY popover (countries without
// an admin-1 detail layer — e.g. JP, SG). For CN/US they are ignored:
// their popovers live at region/city level.
//
// Filling in details later:
//   - date: "YYYY-MM" (e.g. "2024-07") on a region or a city — dates
//     appear in the click popover, never in hover tooltips.
//   - photoIds: ids from js/data/photos.js (e.g. ["travel-kyoto-01"]) —
//     the popover shows a "View photos →" thumbnail row opening the
//     shared lightbox. Empty/absent fields degrade gracefully: a region
//     with no date and no photos shows "Details coming soon."
//   - slug: only needed if the region name doesn't slugify to the
//     Natural Earth admin-1 path id (a console.warn flags mismatches).
//   - zoomBox: named zoom override (see ZOOM_BOXES in js/footprints.js)
//     for countries whose raw bounding box is unusable — e.g. the US
//     spans the antimeridian via Alaska, so it uses "conus".
//   - cities need lat/lng to get a labeled dot at deep zoom; positions
//     are never guessed.
//   - countAsState: false — the region is colored/clickable like a state
//     but excluded from the "States" stat ring (e.g. DC).
// ============================================================

const FOOTPRINTS = {
  CN: { name: "China", visited: true, regions: [
    { name: "Shanghai" }, { name: "Jiangsu" }, { name: "Zhejiang" }, { name: "Beijing", photoIds: ["2024-06-beijing-01", "2024-06-beijing-02"] },
    { name: "Heilongjiang" }, { name: "Shandong" }, { name: "Shaanxi" }, { name: "Sichuan" },
    { name: "Hainan", photoIds: ["2023-06-hainan-01", "2023-06-hainan-02", "2023-06-hainan-03", "2023-06-hainan-04", "2023-06-hainan-05", "2023-06-hainan-06", "2023-06-hainan-07", "2023-06-hainan-08", "2023-06-hainan-feat"] }, { name: "Fujian" }, { name: "Hong Kong" }, { name: "Macau" },
  ] },
  US: { name: "United States", visited: true,
    zoomBox: "conus",
    regions: [
    { name: "Washington", cities: [ { name: "Seattle", lat: 47.61, lng: -122.33 } ] },
    { name: "Oregon", cities: [ { name: "Portland", lat: 45.52, lng: -122.68 } ] },
    { name: "California", cities: [
      { name: "San Francisco", lat: 37.77, lng: -122.42 },
      { name: "Los Angeles", lat: 34.05, lng: -118.24 },
      { name: "San Jose", lat: 37.34, lng: -121.89 },
      { name: "San Diego", lat: 32.72, lng: -117.16 } ] },
    { name: "Wyoming" }, { name: "Montana" }, { name: "Idaho" },
    { name: "Utah" }, { name: "Colorado" },
    { name: "Nevada", cities: [ { name: "Las Vegas", lat: 36.17, lng: -115.14 } ] },
    { name: "New York", photoIds: ["2023-12-new-york-city-01", "2023-12-new-york-city-02", "2023-12-new-york-city-03", "2023-12-new-york-city-04", "2023-12-new-york-city-05", "2023-12-new-york-city-06", "2023-12-new-york-city-07", "2023-12-new-york-city-08", "2023-12-new-york-city-09"], cities: [ { name: "New York City", lat: 40.71, lng: -74.01 } ] },
    { name: "District of Columbia", photoIds: ["2023-12-washington-dc-01", "2023-12-washington-dc-02", "2023-12-washington-dc-03", "2023-12-washington-dc-04"], countAsState: false,
      cities: [ { name: "Washington, D.C.", lat: 38.91, lng: -77.04 } ] },
    { name: "Florida", cities: [
      { name: "Orlando", lat: 28.54, lng: -81.38 },
      { name: "Tampa", lat: 27.95, lng: -82.46 } ] },
    { name: "Massachusetts", cities: [ { name: "Boston", lat: 42.36, lng: -71.06 } ] },
    { name: "Connecticut" },
    { name: "Indiana", photoIds: ["2024-04-indianapolis-01", "2024-04-indianapolis-02", "2024-04-indianapolis-03"], cities: [ { name: "Indianapolis", lat: 39.77, lng: -86.16 } ] },
    { name: "Texas", cities: [ { name: "Dallas", lat: 32.78, lng: -96.80 } ] },
    { name: "Illinois", photoIds: ["2024-03-chicago-01", "2024-03-chicago-02", "2024-03-chicago-03", "2024-03-chicago-04", "2024-03-chicago-05", "2024-03-chicago-06", "2024-03-chicago-07", "2024-03-chicago-feat"], cities: [
      { name: "Champaign", lat: 40.12, lng: -88.24 },
      { name: "Chicago", lat: 41.88, lng: -87.63 } ] },
  ] },
  SG: { name: "Singapore", visited: true, regions: [
    { name: "Singapore", cities: [ { name: "Singapore", lat: 1.35, lng: 103.82 } ] } ] },
  ID: { name: "Indonesia", visited: true, regions: [
    { name: "Bali", cities: [ { name: "Bali", lat: -8.65, lng: 115.22 } ] } ] },
  MX: { name: "Mexico", visited: true, regions: [
    { name: "Tijuana", cities: [ { name: "Tijuana", lat: 32.51, lng: -117.04 } ] } ] },
  AE: { name: "United Arab Emirates", visited: true, regions: [
    { name: "Dubai", cities: [ { name: "Dubai", lat: 25.20, lng: 55.27 } ] } ] },
  JP: { name: "Japan", visited: true, regions: [
    { name: "Tokyo", photoIds: ["2024-08-tokyo-01", "2024-08-tokyo-02", "2024-08-kamakura-01"], cities: [ { name: "Tokyo", lat: 35.68, lng: 139.69 } ] },
    { name: "Kyoto", photoIds: ["2024-08-kyoto-01"], cities: [ { name: "Kyoto", lat: 35.01, lng: 135.77 } ] },
    { name: "Osaka", photoIds: ["2024-08-osaka-01"], cities: [ { name: "Osaka", lat: 34.69, lng: 135.50 } ] },
    { name: "Nara", photoIds: ["2024-08-nara-01"], cities: [ { name: "Nara", lat: 34.69, lng: 135.80 } ] },
  ] },
};
