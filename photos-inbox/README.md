# photos-inbox/ — upload photos from anywhere

Drop image files (jpg / jpeg / png / heic — iPhone HEIC works, but files
over **25 MB** still can't be uploaded via the GitHub web UI) into one of the
tag folders below and push (or upload via the GitHub web UI). A GitHub
Action processes the inbox automatically in **~1–2 minutes**: it converts
each photo to web-ready WebP + thumbnail, adds it to the site's album,
links it to the Footprints map, and empties the inbox.

## Where things land

There are exactly **two filename forms** — no hybrids:

| Filename | Result |
|---|---|
| `YYYY-MM_Region-Num.jpg` (e.g. `2023-06_Hainan-01.jpg`) | Masonry only |
| `YYYY-MM_Region-feat.jpg` (e.g. `2023-06_Hainan-feat.jpg`) | Carousel **+** masonry |

Both yield date = `YYYY-MM` and caption = `Region` (shown as
"Region · YYYY-MM" in the lightbox). Other notes:

- The **folder tag** (e.g. `CN-hainan/`, `US-IL/`, `SG/`) links the photo to
  that map country/region/city's popover album; `general/` = masonry only.
- Dates are **manual only** — the filename prefix, or editing the `date`
  field in `js/data/photos.js` afterwards. No date prefix = undated: the
  photo sinks below all dated ones and its lightbox caption shows just the
  region.
- Only `-feat` photos enter the featured carousel on the Misc. page.
  Numbered photos landing in the album masonry (and their map popover) but
  **not** the carousel is expected behavior, not a bug.

## Uploading from your phone

1. Open **github.com** in your mobile browser (request "desktop site" if the
   upload button is missing) and navigate to this folder.
2. Open the tag folder you want (e.g. `US-IL`).
3. **Add file → Upload files**, pick photos from your camera roll, commit.
4. Wait ~1–2 minutes for the Action, then check the site.

## Tag folders — three tiers

| Tier | Example | Where photos land |
|---|---|---|
| Country tag | `JP/` | Country album — the country popover |
| State/province tag | `US-IL/`, `CN-hainan/` | State album — the state/province popover shows these **plus** all of its cities' photos |
| City tag | `US-IL-chicago/` | City album — that city dot's popover shows **exactly** these |

Available folders:

- `general/` — no map link
- United States (state): `US-WA` `US-OR` `US-CA` `US-WY` `US-MT` `US-ID`
  `US-UT` `US-CO` `US-NV` `US-NY` `US-FL` `US-MA` `US-CT` `US-IN` `US-TX`
  `US-IL` `US-DC`
- United States (city): `US-WA-seattle` `US-OR-portland`
  `US-CA-san-francisco` `US-CA-los-angeles` `US-CA-san-jose`
  `US-CA-san-diego` `US-NV-las-vegas` `US-NY-new-york-city` `US-FL-orlando`
  `US-FL-tampa` `US-MA-boston` `US-IN-indianapolis` `US-TX-dallas`
  `US-IL-chicago` `US-IL-champaign`
- China: `CN-shanghai` `CN-jiangsu` `CN-zhejiang` `CN-beijing`
  `CN-heilongjiang` `CN-shandong` `CN-shaanxi` `CN-sichuan` `CN-hainan`
  `CN-hongkong` `CN-macau`
- `SG/` · `ID-bali/` · `MX-tijuana/` · `AE-dubai/`
- Japan: `JP` `JP-tokyo` `JP-kyoto` `JP-osaka` `JP-nara` (Japan is an
  `albumLevel: "country"` country, so all of these merge into one album)

After the Action finishes, the site redeploys automatically; allow ~2 minutes
and hard-refresh (Cmd/Ctrl+Shift+R) if your browser caches the old page.

Files the pipeline can't read are moved to `photos-inbox/_failed/` (visible
on GitHub) instead of blocking the batch — the rest still publish.

New tags: create a folder named `<ISO2>` (country), `<ISO2>-<region>`
(state/province — US uses postal codes), or `<ISO2>-<region>-<city-slug>`
where the city slug matches a city name under that region in
`js/data/footprints.js` (lowercase, dashes optional). A city segment that
doesn't resolve attaches the photo at the region level (with a warning)
instead of losing it; fully unknown tags still process into the masonry —
the Action just logs a warning about the map link.
