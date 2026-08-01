# photos-original/

Source photos live here and are **never committed** (this folder is
git-ignored except for this README). The build pipeline converts them into
the committed web assets under `assets/photos/`.

## Usage

1. Create a category folder and drop originals into it:
   `photos-original/<Category>/<name>.jpg` (also jpeg/png/heic).
   Name a file with a `-feat` suffix (e.g. `kyoto-sunset-feat.jpg`) to put it
   in the Misc. page carousel — the suffix is stripped from the public name.
2. `npm install` (once — installs sharp + exif-reader).
3. `npm run photos` — generates 1600px WebPs + 400px thumbnails and
   regenerates `js/data/photos.js` (dates auto-filled from EXIF; your manual
   caption/date/featured edits survive by id-merge).
4. Review the new entries, then commit the generated files.
