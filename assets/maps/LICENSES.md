# Map asset licenses

## world.svg

- Source: [@svg-maps/world](https://www.npmjs.com/package/@svg-maps/world) v1.0.1,
  part of the [svg-maps](https://github.com/VictorCazanave/svg-maps) project by
  Victor Cazanave and contributors.
- License: **CC-BY-4.0** (Creative Commons Attribution 4.0,
  https://creativecommons.org/licenses/by/4.0/). Note: the npm package declares
  CC-BY-4.0, not MIT — attribution is required and given here.
- Modifications: path coordinates converted from relative to absolute,
  precision reduced (tolerance-based point simplification), and sub-pixel
  island rings removed to cut file size (1.2 MB → ~240 KB). Country ISO
  alpha-2 `id` and `name` attributes are preserved unchanged.

## china.svg

- Source: [@svg-maps/china](https://www.npmjs.com/package/@svg-maps/china)
  v2.0.0 ([svg-maps](https://github.com/VictorCazanave/svg-maps) project).
- License: **CC-BY-4.0** (https://creativecommons.org/licenses/by/4.0/).
- Modifications: none — vendored as published.

## usa.svg

- Source: [Blank US Map (states only).svg](https://commons.wikimedia.org/wiki/File:Blank_US_Map_(states_only).svg)
  from Wikimedia Commons.
- License: **CC0 1.0** (public domain dedication). Chosen over
  @svg-maps/usa, whose v2 license is CC-BY-NC-4.0 (NonCommercial) — unsuitable
  for a personal site used in job searching.
- Modifications: replaced the fixed width/height attributes with an
  equivalent viewBox so the map scales responsively.
