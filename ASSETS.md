# Assets

Every third-party asset in this repository is listed here with its source and license.
Only **CC0** sources are allowed (Poly Haven, ambientCG, Kenney, Quaternius). An asset may not be
committed without an entry in this file.

## Fonts

| Asset                   | Source                                                                             | License     |
| ----------------------- | ---------------------------------------------------------------------------------- | ----------- |
| Inter Variable          | [@fontsource-variable/inter](https://fontsource.org/fonts/inter)                   | SIL OFL 1.1 |
| JetBrains Mono Variable | [@fontsource-variable/jetbrains-mono](https://fontsource.org/fonts/jetbrains-mono) | SIL OFL 1.1 |

Fonts are installed as npm packages and self-hosted at build time (no requests to external font
servers). They are open-source fonts under the OFL, not CC0, which is fine for fonts.

## Icons

| Asset        | Source                           | License |
| ------------ | -------------------------------- | ------- |
| Lucide icons | [lucide.dev](https://lucide.dev) | ISC     |

## Textures

Each set lives in `public/assets/textures/<folder>/` as `color.jpg`, `normal.jpg` (OpenGL), `rough.jpg` and `thumb.jpg`, downscaled to 1K (carpets 512 px) and re-encoded as JPEG to keep the repo small.

| Name              | Folder              | Original asset      | Source URL                                  | License |
| ----------------- | ------------------- | ------------------- | ------------------------------------------- | ------- |
| Oak hardwood      | `oak-hardwood`      | Wood Floor          | https://polyhaven.com/a/wood_floor          | CC0     |
| Herringbone oak   | `herringbone-oak`   | Herringbone Parquet | https://polyhaven.com/a/herringbone_parquet | CC0     |
| Walnut planks     | `walnut-planks`     | Dark Wooden Planks  | https://polyhaven.com/a/dark_wooden_planks  | CC0     |
| Natural laminate  | `laminate-natural`  | Laminate Floor 02   | https://polyhaven.com/a/laminate_floor_02   | CC0     |
| Honey laminate    | `laminate-honey`    | Laminate Floor 03   | https://polyhaven.com/a/laminate_floor_03   | CC0     |
| Porcelain tile    | `porcelain-tile`    | Floor Tiles 06      | https://polyhaven.com/a/floor_tiles_06      | CC0     |
| Marble            | `marble`            | Marble 01           | https://polyhaven.com/a/marble_01           | CC0     |
| Ceramic tile      | `ceramic-tile`      | Interior Tiles      | https://polyhaven.com/a/interior_tiles      | CC0     |
| White plaster     | `white-plaster`     | White Plaster 02    | https://polyhaven.com/a/white_plaster_02    | CC0     |
| Polished concrete | `polished-concrete` | Painted Concrete    | https://polyhaven.com/a/painted_concrete    | CC0     |
| Sand carpet       | `carpet-sand`       | Carpet 016          | https://ambientcg.com/view?id=Carpet016     | CC0     |
| Navy carpet       | `carpet-navy`       | Carpet 012          | https://ambientcg.com/view?id=Carpet012     | CC0     |

## 3D models

_None yet. Added in Phase 4._

| Name | Source URL | License |
| ---- | ---------- | ------- |

## HDRIs

| Name                                        | File                                                             | Source URL                                                   | License |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| Kloofendal 48d Partly Cloudy (Pure Sky), 1K | `public/assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr` | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0     |
