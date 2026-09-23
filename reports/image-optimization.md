# Image optimization report

Generated: 2026-09-23T16:28:23.914Z

## Summary

- Original PNG/JPG/JPEG inventory: **38.80 MiB** (40 files).
- Already-optimized passthrough WebP in the baseline: **177.6 KiB** (3 files).
- Public production raster after optimization: **4.83 MiB** (50 files, including responsive/format alternatives).
- Disk saving versus the complete production raster baseline: **87.6%**.
- Used-source-only saving: **87.2%** (37.68 MiB → 4.83 MiB).

## Frame sequence

- 30 WebP frames; numbering and order preserved; 2012×1132 → 1440×810.
- Existing first-screen frames were **not re-encoded** during this run: 28.42 MiB → 4.54 MiB (84.0% smaller).
- Serial Sharp decode benchmark: 583 ms total / 19.4 ms average per frame.
- Visual validation: 43.02 dB PSNR; per-frame RGB MAE 1.175–1.222. Consistent dimensions and the narrow error range reduce flicker risk.

## Usage and format decisions

- `assets-source/particle-human-reference.png` — src/animation/particles.js (canvas sampling source); WebP retained: this image is decoded into a runtime canvas; the AVIF candidate was smaller but materially slower to decode.
- `assets-source/programme/first-frame.png` — src/components/Programme.jsx (responsive <img srcset>); AVIF omitted: aggregate saving was below 15%.
- `assets-source/programme/new-light.png` — src/components/Programme.jsx (responsive <img srcset>); AVIF omitted: aggregate saving was below 15%.
- `assets-source/programme/public-talk.png` — src/components/Programme.jsx (responsive <img srcset>); AVIF omitted: aggregate saving was below 15%.
- `assets-source/programme/big-data.png` — src/components/Programme.jsx (responsive <img srcset>); AVIF omitted: aggregate saving was below 15%.
- `assets-source/programme/campaign.png` — src/components/Programme.jsx (responsive <img srcset>); AVIF omitted: aggregate saving was below 15%.
- `assets-source/programme/light-on-mobile.png` — src/components/Programme.jsx (mobile-only responsive <picture>); AVIF omitted: aggregate saving was below 15%.
- `assets-source/registration/light-ribbon.png` — src/styles/site.css (.registration__ribbon); AVIF retained: aggregate variants are 46.3% smaller than WebP.
- `assets-source/main-mts-particle.png` — Unused: no production reference; original retained in assets-source.
- `assets-source/programme/light-on.png` — Unused: the programme uses light-on-icon.svg; original PNG retained and SVG left untouched.
- `public/assets/inline-9537aceeaf6a.webp` — src/components/StageOverlay.jsx (loader); already optimized WebP retained byte-for-byte.
- `public/assets/projector-realistic.webp` — src/components/Hero.jsx and src/styles/site.css; already optimized WebP retained byte-for-byte.
- `public/assets/projector-downward.webp` — src/components/StageOverlay.jsx; already optimized WebP retained byte-for-byte.
- `work/**` PNG/WebP files are design/QA captures with no production references; they remain untouched and are excluded from delivery totals.

## Resized

- `assets-source/particle-human-reference.png`: 1906×1842 → 800×773
- `assets-source/programme/first-frame.png`: 500×500 → 96×96, 192×192
- `assets-source/programme/new-light.png`: 1024×1024 → 96×96, 192×192
- `assets-source/programme/public-talk.png`: 1024×1024 → 96×96, 192×192
- `assets-source/programme/big-data.png`: 1024×1024 → 96×96, 192×192
- `assets-source/programme/campaign.png`: 1024×1024 → 96×96, 192×192
- `assets-source/programme/light-on-mobile.png`: 1254×1254 → 96×96, 192×192
- `assets-source/registration/light-ribbon.png`: 1710×794 → 700×325, 1400×650
- `assets-source/receiver-frames/*.png`: 2012×1132 → 1440×810

## WebP outputs

- `public/assets/inline-9537aceeaf6a.webp` — 24.0 KiB
- `public/assets/particle-human-reference.webp` — 67.2 KiB
- `public/assets/programme/big-data-96.webp` — 2.3 KiB
- `public/assets/programme/big-data.webp` — 5.8 KiB
- `public/assets/programme/campaign-96.webp` — 1.1 KiB
- `public/assets/programme/campaign.webp` — 2.8 KiB
- `public/assets/programme/first-frame-96.webp` — 1.5 KiB
- `public/assets/programme/first-frame.webp` — 3.7 KiB
- `public/assets/programme/light-on-mobile-96.webp` — 636 B
- `public/assets/programme/light-on-mobile.webp` — 1.3 KiB
- `public/assets/programme/new-light-96.webp` — 1.4 KiB
- `public/assets/programme/new-light.webp` — 3.6 KiB
- `public/assets/programme/public-talk-96.webp` — 1.9 KiB
- `public/assets/programme/public-talk.webp` — 4.7 KiB
- `public/assets/projector-downward.webp` — 53.1 KiB
- `public/assets/projector-realistic.webp` — 100.5 KiB
- `public/assets/receiver-frames/01.webp` — 153.8 KiB
- `public/assets/receiver-frames/02.webp` — 155.3 KiB
- `public/assets/receiver-frames/03.webp` — 155.4 KiB
- `public/assets/receiver-frames/04.webp` — 151.0 KiB
- `public/assets/receiver-frames/05.webp` — 151.7 KiB
- `public/assets/receiver-frames/06.webp` — 155.7 KiB
- `public/assets/receiver-frames/07.webp` — 156.3 KiB
- `public/assets/receiver-frames/08.webp` — 151.9 KiB
- `public/assets/receiver-frames/09.webp` — 156.1 KiB
- `public/assets/receiver-frames/10.webp` — 156.1 KiB
- `public/assets/receiver-frames/11.webp` — 151.8 KiB
- `public/assets/receiver-frames/12.webp` — 152.2 KiB
- `public/assets/receiver-frames/13.webp` — 151.0 KiB
- `public/assets/receiver-frames/14.webp` — 155.4 KiB
- `public/assets/receiver-frames/15.webp` — 155.2 KiB
- `public/assets/receiver-frames/16.webp` — 151.9 KiB
- `public/assets/receiver-frames/17.webp` — 156.4 KiB
- `public/assets/receiver-frames/18.webp` — 155.9 KiB
- `public/assets/receiver-frames/19.webp` — 156.2 KiB
- `public/assets/receiver-frames/20.webp` — 156.1 KiB
- `public/assets/receiver-frames/21.webp` — 156.4 KiB
- `public/assets/receiver-frames/22.webp` — 155.6 KiB
- `public/assets/receiver-frames/23.webp` — 155.9 KiB
- `public/assets/receiver-frames/24.webp` — 156.1 KiB
- `public/assets/receiver-frames/25.webp` — 155.9 KiB
- `public/assets/receiver-frames/26.webp` — 156.3 KiB
- `public/assets/receiver-frames/27.webp` — 156.3 KiB
- `public/assets/receiver-frames/28.webp` — 156.8 KiB
- `public/assets/receiver-frames/29.webp` — 155.5 KiB
- `public/assets/receiver-frames/30.webp` — 156.1 KiB
- `public/assets/registration/light-ribbon-700.webp` — 3.7 KiB
- `public/assets/registration/light-ribbon.webp` — 8.9 KiB

## AVIF outputs

- `public/assets/registration/light-ribbon-700.avif` — 2.3 KiB
- `public/assets/registration/light-ribbon.avif` — 4.5 KiB

## Left in original format

- `assets-source/main-mts-particle.png` — retained as an unused source only.
- `assets-source/programme/light-on.png` — retained as an unused source only.

## Heaviest remaining files

- `public/assets/receiver-frames/28.webp` — 156.8 KiB
- `public/assets/receiver-frames/17.webp` — 156.4 KiB
- `public/assets/receiver-frames/21.webp` — 156.4 KiB
- `public/assets/receiver-frames/27.webp` — 156.3 KiB
- `public/assets/receiver-frames/07.webp` — 156.3 KiB
- `public/assets/receiver-frames/26.webp` — 156.3 KiB
- `public/assets/receiver-frames/19.webp` — 156.2 KiB
- `public/assets/receiver-frames/10.webp` — 156.1 KiB
- `public/assets/receiver-frames/09.webp` — 156.1 KiB
- `public/assets/receiver-frames/20.webp` — 156.1 KiB
