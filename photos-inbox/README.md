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

Files the pipeline can't read are moved to `photos-inbox/_failed/` (visible
on GitHub) instead of blocking the batch — the rest still publish.

New tags: create a folder named `<ISO2>` (country) or `<ISO2>-<place>` where
`<place>` matches a region/city name in `js/data/footprints.js` (lowercase,
dashes optional). Unknown tags still process into the masonry — the Action
just logs a warning about the map link.
