#!/usr/bin/env node
// Photo inbox processor — runs in CI (see .github/workflows/photos.yml)
// and locally via `npm run photos`.
//
// Scans photos-inbox/<tag>/* (jpg/jpeg/png/heic). For each photo:
//   1. date:  "YYYY-MM_" filename prefix → EXIF DateTimeOriginal → mtime
//   2. featured: "-feat" filename suffix (stripped from the public name)
//   3. converts to assets/photos/<YYYY-MM>/<slug>.webp (long edge 1600)
//      + assets/photos/thumbs/<YYYY-MM>/<slug>.webp (long edge 400)
//   4. merges into js/data/photos.js — manual caption/date/featured edits
//      survive by id-merge; re-uploading the same name updates the images
//   5. links the photo id into js/data/footprints.js according to the
//      folder tag: "US"→country, "US-IL"→state, "JP-kyoto"→region/city,
//      "general"→no link. Unresolvable tags warn but still process.
//   6. deletes the processed original (keeps .gitkeep / README.md)

import { readdir, mkdir, readFile, writeFile, stat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import exifReader from "exif-reader";

const INBOX = "photos-inbox";
const OUT_DIR = "assets/photos";
const THUMB_DIR = "assets/photos/thumbs";
const MANIFEST = "js/data/photos.js";
const FOOTPRINTS_FILE = "js/data/footprints.js";
const EXTS = new Set([".jpg", ".jpeg", ".png", ".heic"]);

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
  const marker = `{ name: "${regionName}",`;
  let idx = -1, from = 0;
  while (true) {
    const i = src.indexOf(marker, from);
    if (i === -1) break;
    if (!src.slice(i + marker.length).trimStart().startsWith("lat:")) { idx = i; break; }
    from = i + 1;
  }
  if (idx === -1) return null;
  const head = idx + marker.length;
  const end = Math.min(
    ...[src.indexOf("cities:", head), src.indexOf("}", head)].filter((x) => x !== -1));
  const win = src.slice(head, end);
  if (/photoIds: \[/.test(win)) {
    return src.slice(0, head) + appendIntoArray(win, id) + src.slice(end);
  }
  return src.slice(0, head) + ` photoIds: ["${id}"],` + src.slice(head);
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

// resolve a folder tag against FOOTPRINTS → a link operation or null
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
  let part = mTagged[2];
  if (cc === "US" && US_STATES[part.toUpperCase()]) {
    part = US_STATES[part.toUpperCase()];
  }
  const want = norm(part);
  for (const rg of country.regions || []) {
    if (norm(rg.name) === want) return { type: "region", name: rg.name };
  }
  for (const rg of country.regions || []) {
    for (const c of rg.cities || []) {
      if (norm(c.name) === want) return { type: "city", name: c.name };
    }
  }
  return null;
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
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let processed = 0;
  const usedThisRun = new Set();

  for (const tag of tags) {
    const files = (await readdir(path.join(INBOX, tag)))
      .filter((f) => EXTS.has(path.extname(f).toLowerCase()))
      .sort();

    for (const file of files) {
      const srcFile = path.join(INBOX, tag, file);
      let base = path.basename(file, path.extname(file)).toLowerCase();

      // date prefix wins over EXIF
      let date = "";
      const mDate = /^(\d{4}-\d{2})[_-]/.exec(base);
      if (mDate && +mDate[1].slice(5, 7) >= 1 && +mDate[1].slice(5, 7) <= 12) {
        date = mDate[1];
        base = base.slice(mDate[0].length);
      }

      let featured = false;
      if (base.endsWith("-feat")) {
        featured = true;
        base = base.slice(0, -5);
      }
      base = slugify(base) || "photo";

      if (!date) {
        try {
          const meta = await sharp(srcFile).metadata();
          if (meta.exif) {
            const ex = exifReader(meta.exif);
            const dt = (ex.Photo && ex.Photo.DateTimeOriginal) ||
                       (ex.Image && ex.Image.DateTime);
            if (dt instanceof Date && !Number.isNaN(dt.getTime())) {
              date = dt.toISOString().slice(0, 7);
            }
          }
        } catch { /* unreadable EXIF */ }
      }
      if (!date) {
        date = (await stat(srcFile)).mtime.toISOString().slice(0, 7);
      }

      // id: slug; if a DIFFERENT new photo took it this run, disambiguate
      let id = base;
      if (usedThisRun.has(id)) id = `${base}-${date}`;
      usedThisRun.add(id);

      const outDir = path.join(OUT_DIR, date);
      const thumbDir = path.join(THUMB_DIR, date);
      await mkdir(outDir, { recursive: true });
      await mkdir(thumbDir, { recursive: true });
      const webPath = path.join(outDir, `${base}.webp`);
      const thumbPath = path.join(thumbDir, `${base}.webp`);

      const image = sharp(srcFile, { failOn: "none" }).rotate();
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
        caption: old.caption || prettify(base),
        date: old.date || date,
        featured: old.featured !== undefined ? old.featured : featured,
        w: full.width,
        h: full.height,
      };
      if (!prior.has(id)) order.push(id);
      prior.set(id, entry);

      // map linking
      const link = resolveTag(tag, fp);
      if (!link) {
        console.warn(`warn: tag "${tag}" doesn't match any footprints node — ` +
          `"${id}" added to the masonry only`);
      } else if (link.type !== "none") {
        let next = null;
        if (link.type === "country") next = linkCountry(fpSrc, link.cc, link.name, id);
        else if (link.type === "region") next = linkRegion(fpSrc, link.name, id);
        else next = linkCity(fpSrc, link.name, id);
        if (next) fpSrc = next;
        else console.warn(`warn: couldn't edit footprints.js for "${link.name}" (${id})`);
      }

      await rm(srcFile);
      processed++;
      console.log(`✓ ${tag}/${file} → ${id}  (${full.width}×${full.height}, ${date}` +
        `${featured ? ", featured" : ""})`);
    }
  }

  if (!processed) {
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
//     date: "YYYY-MM",                     // filename prefix → EXIF → mtime
//     featured: true|false,                // true → Misc. page carousel
//     w: 1200, h: 800 }                    // intrinsic px — no layout shift
//
// Manual edits to caption / date / featured are PRESERVED when the same
// photo id is reprocessed. Hand-appending an entry also works.
// ============================================================

const PHOTOS = `;
  const body = JSON.stringify(entries, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, "$1:");
  await writeFile(MANIFEST, header + body + ";\n");
  await writeFile(FOOTPRINTS_FILE, fpSrc);
  console.log(`\nProcessed ${processed} photo(s); manifest now has ${entries.length} entries.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
