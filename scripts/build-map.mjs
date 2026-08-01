#!/usr/bin/env node
// Composite map builder.
//
// Projects Natural Earth data (public domain, vendored in data/maps-src/)
// with ONE shared projection (geoNaturalEarth1) and writes
// assets/maps/world-composite.svg:
//   <g id="countries">   one path per country,  id="c-{ISO2}"
//   <g id="admin1-CN" hidden="hidden">  one path per province, id="r-CN-{name-slug}"
//   <g id="admin1-US" hidden="hidden">  one path per state,    id="r-US-{name-slug}"
// Because every layer shares the projection, admin-1 borders align with the
// world layer pixel-perfectly at any zoom.
//
// The projection's scale/translate are stamped on the <svg> as data
// attributes so the runtime (js/footprints.js) can project lat/lng city
// dots with the identical Natural Earth 1 formula.
//
// Usage: npm run map

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { geoNaturalEarth1, geoPath } from "d3-geo";

const WIDTH = 1000;

function slug(name) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Round to 2 decimals and thin sub-pixel points. Operates on geoPath's
// OUTPUT string so d3's antimeridian clipping is preserved.
function simplifyPath(d, tol) {
  const out = [];
  const re = /([MLZ])([^MLZ]*)/gi;
  let m;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1].toUpperCase();
    if (cmd === "Z") { out.push("Z"); continue; }
    const nums = (m[2].match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) || []).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (cmd === "L" && out.length) {
        const last = out[out.length - 1];
        if (last.px !== undefined &&
            Math.hypot(x - last.px, y - last.py) < tol) continue;
      }
      out.push({ cmd: i === 0 ? cmd : "L", px: x, py: y });
    }
  }
  let s = "";
  for (const t of out) {
    if (t === "Z") { s += "Z"; continue; }
    s += t.cmd + (Math.round(t.px * 100) / 100) + " " + (Math.round(t.py * 100) / 100);
  }
  return s;
}

async function main() {
  const [a0, cn, us] = await Promise.all([
    readFile("data/maps-src/admin0-countries-50m.json", "utf8").then(JSON.parse),
    readFile("data/maps-src/admin1-cn-10m.json", "utf8").then(JSON.parse),
    readFile("data/maps-src/admin1-us-50m.json", "utf8").then(JSON.parse),
  ]);

  const projection = geoNaturalEarth1();
  projection.fitWidth(WIDTH, { type: "Sphere" });
  const path = geoPath(projection);

  const [[x0, y0], [x1, y1]] = path.bounds({ type: "Sphere" });
  const vbW = Math.ceil(x1 - x0);
  const vbH = Math.ceil(y1 - y0);

  const countries = a0.features
    .filter((f) => f.properties.iso_a2 && f.properties.iso_a2 !== "-99")
    .map((f) => {
      const d = simplifyPath(path(f.geometry), 0.4);
      return `<path id="c-${f.properties.iso_a2}" name="${esc(f.properties.name)}" d="${d}"/>`;
    });

  function admin1(fc, cc) {
    return fc.features.map((f) => {
      const d = simplifyPath(path(f.geometry), 0.25);
      return `<path id="r-${cc}-${slug(f.properties.name)}" name="${esc(f.properties.name)}" d="${d}"/>`;
    });
  }

  // Natural Earth treats Hong Kong and Macau as separate admin-0
  // territories, so they are absent from the CN admin-1 dataset. Append
  // their admin-0 polygons into the CN detail layer (the runtime hides
  // their country-level paths whenever the detail layer is active).
  function cnExtras() {
    return [["HK", "Hong Kong", "hong-kong"], ["MO", "Macau", "macau"]]
      .map(([iso, label, s]) => {
        const f = a0.features.find((x) => x.properties.iso_a2 === iso);
        if (!f) return "";
        const d = simplifyPath(path(f.geometry), 0.25);
        return `<path id="r-CN-${s}" name="${label}" d="${d}"/>`;
      })
      .filter(Boolean);
  }

  const k = projection.scale();
  const [tx, ty] = projection.translate();

  // sanity: the runtime replicates the Natural Earth 1 polynomial; verify
  // the closed-form matches d3's output for a few probe points
  function rawNE1(lambda, phi) {
    const p2 = phi * phi, p4 = p2 * p2;
    return [
      lambda * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
      phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
    ];
  }
  let maxErr = 0;
  for (const [lat, lng] of [[31.23, 121.47], [40.06, -89.2], [-33.9, 151.2], [64.1, -21.9]]) {
    const [dx, dy] = projection([lng, lat]);
    const [rx, ry] = rawNE1(lng * Math.PI / 180, lat * Math.PI / 180);
    const mx = tx + k * rx, my = ty - k * ry;
    maxErr = Math.max(maxErr, Math.hypot(dx - mx, dy - my));
  }
  console.log(`projection replication max error: ${maxErr.toExponential(2)} px`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" aria-label="World map" shape-rendering="geometricPrecision"
  data-proj-k="${k}" data-proj-tx="${tx}" data-proj-ty="${ty}">
<g id="countries">
${countries.join("\n")}
</g>
<g id="admin1-CN" hidden="hidden">
${admin1(cn, "CN").join("\n")}
${cnExtras().join("\n")}
</g>
<g id="admin1-US" hidden="hidden">
${admin1(us, "US").join("\n")}
</g>
</svg>
`;

  await mkdir("assets/maps", { recursive: true });
  await writeFile("assets/maps/world-composite.svg", svg);
  console.log(`world-composite.svg: ${(svg.length / 1024).toFixed(0)} KB, viewBox 0 0 ${vbW} ${vbH}`);
  console.log(`countries: ${countries.length}, CN admin1: ${cn.features.length}, US admin1: ${us.features.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
