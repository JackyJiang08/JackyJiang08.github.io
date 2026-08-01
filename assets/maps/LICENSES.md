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
