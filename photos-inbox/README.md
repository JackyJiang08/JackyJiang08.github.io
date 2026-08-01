# photos-inbox/ — upload photos from anywhere

Drop image files (jpg / jpeg / png / heic, **≤ 25 MB each**) into one of the
tag folders below and push (or upload via the GitHub web UI). A GitHub
Action processes the inbox automatically in **~1–2 minutes**: it converts
each photo to web-ready WebP + thumbnail, adds it to the site's album,
links it to the Footprints map, and empties the inbox.

## Where things land

| You do | Result |
|---|---|
| Upload into **any** tag folder | Photo joins the album masonry (always) |
| Filename ends in **`-feat`** (e.g. `kyoto-sunset-feat.jpg`) | Also joins the Misc. page carousel (suffix stripped from public name) |
| Folder tag = country/region/city (e.g. `US-IL/`, `JP-kyoto/`, `SG/`) | Photo is linked to that place's album in the Footprints map popover |
| Folder = `general/` | Masonry only — no map link |
| Filename starts with **`YYYY-MM_`** (e.g. `2024-07_beach.jpg`) | Sets the photo's date — this prefix IS the date input (stripped from the public name) |

Dates are **manual only**: the filename prefix at upload, or editing the
`date` field in `js/data/photos.js` afterwards. There is no automatic
detection. Undated photos simply sort after all dated ones (the album is
newest-first), and their captions omit the date. Both conventions combine:
`2025-08_kyoto-sunset-feat.jpg` → dated August 2025 **and** featured.

## Uploading from your phone

1. Open **github.com** in your mobile browser (request "desktop site" if the
   upload button is missing) and navigate to this folder.
2. Open the tag folder you want (e.g. `US-IL`).
3. **Add file → Upload files**, pick photos from your camera roll, commit.
4. Wait ~1–2 minutes for the Action, then check the site.

## Tag folders

- `general/` — no map link
- United States: `US-WA` `US-OR` `US-CA` `US-WY` `US-MT` `US-ID` `US-UT`
  `US-CO` `US-NV` `US-NY` `US-FL` `US-MA` `US-CT` `US-IN` `US-TX` `US-IL` `US-DC`
- China: `CN-shanghai` `CN-jiangsu` `CN-zhejiang` `CN-beijing`
  `CN-heilongjiang` `CN-shandong` `CN-shaanxi` `CN-sichuan` `CN-hainan`
  `CN-hongkong` `CN-macau`
- `SG/` · `ID-bali/` · `MX-tijuana/` · `AE-dubai/`
- Japan: `JP` `JP-tokyo` `JP-kyoto` `JP-osaka` `JP-nara`

New tags: create a folder named `<ISO2>` (country) or `<ISO2>-<place>` where
`<place>` matches a region/city name in `js/data/footprints.js` (lowercase,
dashes optional). Unknown tags still process into the masonry — the Action
just logs a warning about the map link.
