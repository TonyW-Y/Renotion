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

Each set lives in `public/assets/textures/<folder>/` as `color.jpg`, `normal.jpg` (OpenGL), `rough.jpg` and `thumb.jpg`, downscaled to 1K (carpets 512 px; normal/roughness maps of later sets 512 px) and re-encoded as JPEG to keep the repo small.

| Name                     | Folder               | Original asset           | Source URL                                       | License |
| ------------------------ | -------------------- | ------------------------ | ------------------------------------------------ | ------- |
| Oak hardwood             | `oak-hardwood`       | Wood Floor               | https://polyhaven.com/a/wood_floor               | CC0     |
| Herringbone oak          | `herringbone-oak`    | Herringbone Parquet      | https://polyhaven.com/a/herringbone_parquet      | CC0     |
| Walnut planks            | `walnut-planks`      | Dark Wooden Planks       | https://polyhaven.com/a/dark_wooden_planks       | CC0     |
| Natural laminate         | `laminate-natural`   | Laminate Floor 02        | https://polyhaven.com/a/laminate_floor_02        | CC0     |
| Honey laminate           | `laminate-honey`     | Laminate Floor 03        | https://polyhaven.com/a/laminate_floor_03        | CC0     |
| Porcelain tile           | `porcelain-tile`     | Floor Tiles 06           | https://polyhaven.com/a/floor_tiles_06           | CC0     |
| Marble                   | `marble`             | Marble 01                | https://polyhaven.com/a/marble_01                | CC0     |
| Ceramic tile             | `ceramic-tile`       | Interior Tiles           | https://polyhaven.com/a/interior_tiles           | CC0     |
| White plaster            | `white-plaster`      | White Plaster 02         | https://polyhaven.com/a/white_plaster_02         | CC0     |
| Polished concrete        | `polished-concrete`  | Painted Concrete         | https://polyhaven.com/a/painted_concrete         | CC0     |
| Sand carpet              | `carpet-sand`        | Carpet 016               | https://ambientcg.com/view?id=Carpet016          | CC0     |
| Navy carpet              | `carpet-navy`        | Carpet 012               | https://ambientcg.com/view?id=Carpet012          | CC0     |
| Grey oak planks          | `grey-oak-planks`    | Wood Planks Grey         | https://polyhaven.com/a/wood_planks_grey         | CC0     |
| Whitewashed planks       | `whitewashed-planks` | White Planks Clean       | https://polyhaven.com/a/white_planks_clean       | CC0     |
| Diagonal parquet         | `diagonal-parquet`   | Diagonal Parquet         | https://polyhaven.com/a/diagonal_parquet         | CC0     |
| Mahogany planks          | `mahogany-planks`    | Plank Flooring 04        | https://polyhaven.com/a/plank_flooring_04        | CC0     |
| Rustic pine planks       | `rustic-planks`      | Wooden Floor 02          | https://polyhaven.com/a/wooden_floor_02          | CC0     |
| Slate tile               | `slate-tile`         | Patterned Slate Tiles    | https://polyhaven.com/a/patterned_slate_tiles    | CC0     |
| Marble mosaic            | `mosaic-tile`        | Marble Mosaic Tiles      | https://polyhaven.com/a/marble_mosaic_tiles      | CC0     |
| Terrazzo                 | `terrazzo`           | Terrazzo Tiles           | https://polyhaven.com/a/terrazzo_tiles           | CC0     |
| Granite tile             | `granite-tile`       | Granite Tile             | https://polyhaven.com/a/granite_tile             | CC0     |
| Terracotta tile          | `terracotta-tile`    | Terracotta Floor Tiles   | https://polyhaven.com/a/terracotta_floor_tiles   | CC0     |
| Checkerboard tile        | `checker-tile`       | Checkered Pavement Tiles | https://polyhaven.com/a/checkered_pavement_tiles | CC0     |
| Red brick veneer (wall)  | `red-brick`          | Red Brick 03             | https://polyhaven.com/a/red_brick_03             | CC0     |
| Whitewashed brick (wall) | `whitewashed-brick`  | Whitewashed Brick        | https://polyhaven.com/a/whitewashed_brick        | CC0     |
| Stacked stone (wall)     | `stacked-stone`      | Stacked Stone Wall       | https://polyhaven.com/a/stacked_stone_wall       | CC0     |
| Limestone block (wall)   | `limestone-block`    | Stone Tile Wall          | https://polyhaven.com/a/stone_tile_wall          | CC0     |
| Painted shiplap (wall)   | `painted-shiplap`    | Blue Painted Planks      | https://polyhaven.com/a/blue_painted_planks      | CC0     |
| Wood panelling (wall)    | `wood-panelling`     | Wooden Panels            | https://polyhaven.com/a/wooden_panels            | CC0     |
| Subway tile (wall)       | `subway-tile`        | Long White Tiles         | https://polyhaven.com/a/long_white_tiles         | CC0     |
| Concrete panel (wall)    | `concrete-wall`      | Concrete Wall 008        | https://polyhaven.com/a/concrete_wall_008        | CC0     |
| Textured stucco (wall)   | `stucco`             | White Stucco 02          | https://polyhaven.com/a/white_stucco_02          | CC0     |

## 3D models

_None yet. Added in Phase 4._

| Name | Source URL | License |
| ---- | ---------- | ------- |

## HDRIs

| Name                                        | File                                                             | Source URL                                                   | License |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| Kloofendal 48d Partly Cloudy (Pure Sky), 1K | `public/assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr` | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0     |
