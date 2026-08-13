#!/usr/bin/env node
// Photo inbox processor — runs in CI (see .github/workflows/photos.yml)
// and locally via `npm run photos`.
//
// Scans photos-inbox/<tag>/* (jpg/jpeg/png/heic). For each photo:
//   1. date:  ONLY the "YYYY-MM_" filename prefix (or a later manual
//      edit in photos.js) — no EXIF, no mtime; undated photos sort last
//   2. featured: "-feat" filename suffix (stripped from the public name)
//   3. converts to assets/photos/<YYYY-MM>/<slug>.webp (long edge 1600)
//      + assets/photos/thumbs/<YYYY-MM>/<slug>.webp (long edge 400)
//   4. merges into js/data/photos.js — manual caption/date/featured edits
//      survive by id-merge; re-uploading the same name updates the images
//   5. links the photo id into js/data/footprints.js according to the
//      folder tag: "US"→country, "US-IL"→state, "JP-kyoto"→region/city,
//      "general"→no link. Unresolvable tags warn but still process.
//   6. deletes the processed original (keeps .gitkeep / README.md)

import { readdir, mkdir, readFile, writeFile, rm, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const INBOX = "photos-inbox";
const OUT_DIR = "assets/photos";
const THUMB_DIR = "assets/photos/thumbs";
const MANIFEST = "js/data/photos.js";
const FOOTPRINTS_FILE = "js/data/footprints.js";
const EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function norm(s) {
  return slugify(s).replace(/-/g, "");
}

function prettify(name) {
  return name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

// ---- filename parsing ---------------------------------------------------
// Canonical forms (see photos-inbox/README.md):
//   YYYY-MM_Region-Num.jpg   → masonry only        (id keeps the number)
//   YYYY-MM_Region-feat.jpg  → carousel + masonry  (id = date+region+"-feat",
//                                                   never collides with -Num)
// Both yield date = YYYY-MM and caption = "Region" (original casing).
// Strip order: date prefix → "-feat" → trailing "-<digits>".
function parseName(filename) {
  let raw = filename.replace(/\.[^.]+$/, "");

  let date = "";
  const mDate = /^(\d{4})-(\d{2})[_-]/.exec(raw);
  if (mDate) {
    const yr = +mDate[1], mo = +mDate[2];
    if (yr >= 2000 && yr <= 2099 && mo >= 1 && mo <= 12) {
      date = `${mDate[1]}-${mDate[2]}`;
      raw = raw.slice(mDate[0].length);
    } else {
      console.warn(`warn: "${filename}" has an invalid date prefix ` +
        `("${mDate[0]}"); treating it as part of the name`);
    }
  }

  let featured = false;
  if (/-feat$/i.test(raw)) {
    featured = true;
    raw = raw.replace(/-feat$/i, "");
  }

  let num = "";
  const mNum = /-(\d+)$/.exec(raw);
  if (mNum) {
    num = mNum[1];
    raw = raw.slice(0, -mNum[0].length);
  }

  const caption = prettify(raw) || "photo";
  const slug = slugify(raw) || "photo";
  let id;
  if (featured) id = (date ? date + "-" : "") + slug + "-feat";
  else if (num) id = (date ? date + "-" : "") + slug + "-" + num;
  else id = slug;

  return { date, featured, caption, id };
}

// unit-style checks: fail LOUDLY if parsing of the canonical forms regresses
(function selfTest() {
  const a = parseName("2023-06_Hainan-01.jpg");
  const b = parseName("2023-06_Hainan-feat.jpg");
  const c = parseName("2023-12_New York City-01.jpg");
  const d = parseName("2023-12_New York City-feat.jpg");
  const ok =
    a.date === "2023-06" && a.caption === "Hainan" &&
    a.id === "2023-06-hainan-01" && a.featured === false &&
    b.date === "2023-06" && b.caption === "Hainan" &&
    b.id === "2023-06-hainan-feat" && b.featured === true &&
    c.date === "2023-12" && c.caption === "New York City" &&
    c.id === "2023-12-new-york-city-01" && c.featured === false &&
    d.date === "2023-12" && d.caption === "New York City" &&
    d.id === "2023-12-new-york-city-feat" && d.featured === true &&
    a.id !== b.id && c.id !== d.id;
  if (!ok) {
    console.error("FATAL: filename parser self-test failed", { a, b, c, d });
    process.exit(1);
  }
})();

async function readManifest() {
  const map = new Map();
  let order = [];
  if (existsSync(MANIFEST)) {
    const src = await readFile(MANIFEST, "utf8");
    try {
      const photos = new Function(`${src}; return PHOTOS;`)();
      for (const p of photos) {
        if (p.id) {
          map.set(p.id, p);
          order.push(p.id);
        }
      }
    } catch {
      console.warn("warn: could not parse existing manifest");
    }
  }
  return { map, order };
}

async function readFootprints() {
  const src = await readFile(FOOTPRINTS_FILE, "utf8");
  const data = new Function(`${src}; return FOOTPRINTS;`)();
  return { src, data };
}

// ---- footprints.js textual surgery (preserves comments/formatting) -------
function appendIntoArray(win, id) {
  return win.replace(/photoIds: \[([^\]]*)\]/, (m, inner) => {
    if (inner.includes(`"${id}"`)) return m;
    const items = inner.trim();
    return `photoIds: [${items ? items.replace(/,\s*$/, "") + ", " : ""}"${id}"]`;
  });
}

function linkCountry(src, cc, countryName, id) {
  const marker = `${cc}: { name: "${countryName}", visited: true,`;
  const i = src.indexOf(marker);
  if (i === -1) return null;
  const head = i + marker.length;
  const end = Math.min(
    ...[src.indexOf("regions:", head), src.indexOf("}", head)].filter((x) => x !== -1));
  const win = src.slice(head, end);
  if (/photoIds: \[/.test(win)) {
    return src.slice(0, head) + appendIntoArray(win, id) + src.slice(end);
  }
  return src.slice(0, head) + ` photoIds: ["${id}"],` + src.slice(head);
}

function linkRegion(src, regionName, id) {
  // form A: `{ name: "X", ...` (has more properties)
  const marker = `{ name: "${regionName}",`;
  let idx = -1, from = 0;
  while (true) {
    const i = src.indexOf(marker, from);
    if (i === -1) break;
    if (!src.slice(i + marker.length).trimStart().startsWith("lat:")) { idx = i; break; }
    from = i + 1;
  }
  if (idx !== -1) {
    const head = idx + marker.length;
    const end = Math.min(
      ...[src.indexOf("cities:", head), src.indexOf("}", head)].filter((x) => x !== -1));
    const win = src.slice(head, end);
    if (/photoIds: \[/.test(win)) {
      return src.slice(0, head) + appendIntoArray(win, id) + src.slice(end);
    }
    return src.slice(0, head) + ` photoIds: ["${id}"],` + src.slice(head);
  }
  // form B: bare `{ name: "X" }` (no other properties yet)
  const bare = `{ name: "${regionName}" }`;
  const j = src.indexOf(bare);
  if (j === -1) return null;
  return src.slice(0, j) +
    `{ name: "${regionName}", photoIds: ["${id}"] }` +
    src.slice(j + bare.length);
}

function linkCity(src, cityName, id) {
  const marker = `{ name: "${cityName}", lat:`;
  const i = src.indexOf(marker);
  if (i === -1) return null;
  const end = src.indexOf("}", i);
  const win = src.slice(i, end);
  if (/photoIds: \[/.test(win)) {
    return src.slice(0, i) + appendIntoArray(win, id) + src.slice(end);
  }
  return src.slice(0, end) + `, photoIds: ["${id}"] ` + src.slice(end);
}

// resolve a folder tag against FOOTPRINTS → a link operation or null.
// Three tiers: COUNTRY (JP), COUNTRY-REGION (US-IL, CN-hainan), and
// COUNTRY-REGION-CITY (US-IL-chicago) — the city slug is scoped to its
// region. A valid region with an unresolvable city segment falls back to
// the region link (result carries .cityMiss) so a typo never loses photos.
function resolveTag(tag, fp) {
  if (tag === "general") return { type: "none" };
  const mCountry = /^([A-Z]{2})$/.exec(tag);
  if (mCountry && fp.data[mCountry[1]]) {
    const cc = mCountry[1];
    return { type: "country", cc, name: fp.data[cc].name };
  }
  const mTagged = /^([A-Z]{2})-(.+)$/.exec(tag);
  if (!mTagged || !fp.data[mTagged[1]]) return null;
  const cc = mTagged[1];
  const country = fp.data[cc];
  const expand = (p) =>
    cc === "US" && US_STATES[p.toUpperCase()] ? US_STATES[p.toUpperCase()] : p;
  const rest = mTagged[2];

  // two-level: the whole rest names a region (or, legacy, a city anywhere)
  const want = norm(expand(rest));
  for (const rg of country.regions || []) {
    if (norm(rg.name) === want) {
      return { type: "region", name: rg.name, cities: rg.cities || [] };
    }
  }
  for (const rg of country.regions || []) {
    for (const c of rg.cities || []) {
      if (norm(c.name) === want) return { type: "city", name: c.name };
    }
  }

  // three-level: first segment = region code/slug, remainder = city slug
  const dash = rest.indexOf("-");
  if (dash !== -1) {
    const wantR = norm(expand(rest.slice(0, dash)));
    const cityPart = rest.slice(dash + 1);
    for (const rg of country.regions || []) {
      if (norm(rg.name) !== wantR) continue;
      const wantC = norm(cityPart);
      for (const c of rg.cities || []) {
        if (norm(c.name) === wantC) return { type: "city", name: c.name };
      }
      return { type: "region", name: rg.name, cityMiss: cityPart };
    }
  }
  return null;
}

// A file whose parsed Region word names a KNOWN city inside the tagged
// state/province is auto-routed to that city node (e.g. "2024-03_Chicago-09.jpg"
// uploaded to US-IL/ lands on Chicago, not Illinois). No match → state level.
function autoRouteToCity(link, caption) {
  if (!link || link.type !== "region" || link.cityMiss || !link.cities) return null;
  const want = norm(caption);
  for (const c of link.cities) {
    if (norm(c.name) === want) return { type: "city", name: c.name };
  }
  return null;
}

// GitHub Pages serves js/data/*.js with ~10-minute cache headers, so a
// deploy can look stale in browsers that hold the old data files. Bumping
// the ?v= query on the <script> tags makes every page refetch them.
const HTML_PAGES = ["index.html", "misc.html", "album.html"];

async function bumpDataVersion() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
  const re = /(js\/data\/(?:photos|footprints|highlights)\.js)\?v=[0-9TZ]+/g;
  for (const page of HTML_PAGES) {
    if (!existsSync(page)) continue;
    const html = await readFile(page, "utf8");
    const next = html.replace(re, `$1?v=${stamp}`);
    if (next !== html) await writeFile(page, next);
  }
}

async function main() {
  if (!existsSync(INBOX)) {
    console.error(`No ${INBOX}/ directory found.`);
    process.exit(1);
  }

  const { map: prior, order } = await readManifest();
  const fpState = await readFootprints();
  let fpSrc = fpState.src;
  const fp = { data: fpState.data };

  const tags = (await readdir(INBOX, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_")) // skip _failed/
    .map((d) => d.name)
    .sort();

  let processed = 0;
  let skipped = 0;
  const cityFallbacks = []; // three-level tags whose city segment missed
  const usedThisRun = new Set();

  for (const tag of tags) {
    const files = (await readdir(path.join(INBOX, tag)))
      .filter((f) => EXTS.has(path.extname(f).toLowerCase()))
      .sort();

    for (const file of files) {
      const srcFile = path.join(INBOX, tag, file);
      try {
      const parsed = parseName(path.basename(file));
      const date = parsed.date;
      const featured = parsed.featured;

      // if a DIFFERENT new photo took this id in the same run, disambiguate
      let id = parsed.id;
      if (usedThisRun.has(id)) id = `${id}-${date || "x"}`;
      usedThisRun.add(id);

      const bucket = date || "undated";
      const outDir = path.join(OUT_DIR, bucket);
      const thumbDir = path.join(THUMB_DIR, bucket);
      await mkdir(outDir, { recursive: true });
      await mkdir(thumbDir, { recursive: true });
      const webPath = path.join(outDir, `${id}.webp`);
      const thumbPath = path.join(thumbDir, `${id}.webp`);

      // sharp's prebuilt libvips cannot decode HEIC/HEIF — convert to a
      // JPEG buffer first; a conversion failure flows into the skip path
      let input = srcFile;
      const ext = path.extname(file).toLowerCase();
      if (ext === ".heic" || ext === ".heif") {
        const { default: heicConvert } = await import("heic-convert");
        const rawBytes = await readFile(srcFile);
        input = Buffer.from(await heicConvert({
          buffer: rawBytes, format: "JPEG", quality: 0.9,
        }));
      }

      const image = sharp(input, { failOn: "none" }).rotate();
      const full = await image.clone()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 }).toFile(webPath);
      await image.clone()
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 }).toFile(thumbPath);

      const old = prior.get(id) || {};
      const entry = {
        id,
        src: webPath.split(path.sep).join("/"),
        thumb: thumbPath.split(path.sep).join("/"),
        caption: old.caption || parsed.caption,
        date: old.date || date,
        featured: old.featured !== undefined ? old.featured : featured,
        w: full.width,
        h: full.height,
      };
      if (!prior.has(id)) order.push(id);
      prior.set(id, entry);

      // map linking
      let link = resolveTag(tag, fp);
      const routed = autoRouteToCity(link, parsed.caption);
      if (routed) {
        console.log(`auto-routed to city ${routed.name}: ${tag}/${file}`);
        link = routed;
      }
      if (!link) {
        console.warn(`warn: tag "${tag}" doesn't match any footprints node — ` +
          `"${id}" added to the masonry only`);
      } else if (link.type !== "none") {
        if (link.cityMiss) {
          console.warn(`warn: tag "${tag}": no city "${link.cityMiss}" under ` +
            `${link.name} — "${id}" attached at the region level instead`);
          cityFallbacks.push(`${tag}/${file} → ${link.name}`);
        }
        let next = null;
        if (link.type === "country") next = linkCountry(fpSrc, link.cc, link.name, id);
        else if (link.type === "region") next = linkRegion(fpSrc, link.name, id);
        else next = linkCity(fpSrc, link.name, id);
        if (next) fpSrc = next;
        else console.warn(`warn: couldn't edit footprints.js for "${link.name}" (${id})`);
      }

      await rm(srcFile);
      processed++;
      console.log(`✓ ${tag}/${file} → ${id}  (${full.width}×${full.height}, ${date || "undated"}` +
        `${featured ? ", featured" : ""})`);
      } catch (err) {
        // one bad file must never sink the batch: quarantine and move on
        skipped++;
        console.error(`SKIP ${tag}/${file}: ${(err && err.message) || err}`);
        const failDir = path.join(INBOX, "_failed", tag);
        await mkdir(failDir, { recursive: true });
        await rename(srcFile, path.join(failDir, file)).catch(function () {});
      }
    }
  }

  if (!processed && !skipped) {
    console.log("Inbox empty — nothing to do.");
    return;
  }

  // write the manifest (existing entries preserved, order kept, new appended)
  const entries = order.map((id) => prior.get(id)).filter(Boolean);
  const header = `// ============================================================
// Photography manifest — GENERATED by the photo inbox pipeline
// (scripts/process-inbox.mjs; runs in CI on photos-inbox/ pushes and
// locally via \`npm run photos\`). See photos-inbox/README.md.
//
// Entry shape:
//   { id: "slug",                          // stable key for merging &
//                                          //   Footprints photoIds refs
//     src: "assets/photos/<YYYY-MM>/<n>.webp",         // long edge 1600
//     thumb: "assets/photos/thumbs/<YYYY-MM>/<n>.webp", // long edge 400
//     caption: "…",                        // alt text + lightbox caption
//     date: "YYYY-MM" or "",               // MANUAL: filename prefix or
//                                          //   hand-edit; "" sorts last
//     featured: true|false,                // true → Misc. page carousel
//     w: 1200, h: 800 }                    // intrinsic px — no layout shift
//
// Manual edits to caption / date / featured are PRESERVED when the same
// photo id is reprocessed. Hand-appending an entry also works.
// ============================================================

const PHOTOS = `;
  const body = JSON.stringify(entries, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, "$1:");
  if (processed) {
    await writeFile(MANIFEST, header + body + ";\n");
    await writeFile(FOOTPRINTS_FILE, fpSrc);
    await bumpDataVersion();
  }
  console.log(`\nprocessed ${processed}, skipped ${skipped}` +
    (skipped ? " (see photos-inbox/_failed/)" : ""));
  if (cityFallbacks.length) {
    console.log(`note: ${cityFallbacks.length} photo(s) attached at region ` +
      `level (unresolved city segment):\n  - ${cityFallbacks.join("\n  - ")}`);
  }
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `skipped=${skipped}\n`, { flag: "a" });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
