# R2Shot logo assets

The original animal is retained byte-for-byte. This Refined pass adds a dolphin wake background, fine grain, and shallow contact shadows. No image model was called, and the animal was not cropped, moved, recolored, or redrawn.

## Asset roles

| Surface | Asset | Treatment |
| --- | --- | --- |
| README header | `assets/brand/icon-rounded.png` at 128 px | Selected presentation |
| Toolbar / extension manager | `public/icons/icon{16,48,128}.png` | Transparent original |
| Popup header | `public/icons/logo32.png` at 24 CSS px | Transparent original |
| Settings header | `public/icons/logo64.png` at 40 CSS px | Transparent original |
| Development build | `logo-dev.png` and `public/icons/dev/` | Existing red development tint; never a production asset |

Root `logo.png` is the canonical 920 × 920 transparent source. `icon.png` and `icon-rounded.png` in this directory are separate square and rounded presentations at the same native dimensions. Small app and browser marks must keep their alpha and must not receive the presentation background, a drop shadow, or an extra CSS crop.

## Reproduce and verify

Run from the repository root:

```sh
uv run --with pillow --with numpy bash scripts/generate-icons.sh
```

The background recipe, exact original, palette samples, every size, and frozen finishing layers are archived in `nocoo/hexly.ai` under `artwork/logo-family/r2shot/2026-09-07-01/finishing/01`. 1024 and 2048 px exports are explicitly labeled upscales; they do not replace this native master. [source.json](source.json) records the source revision and all master SHA-256 values.

- [Individual logo review](https://hexly.ai/logos/r2shot)
- [Local static study](https://index.dev.hexly.ai/artwork/logo-family/r2shot/2026-09-07-01/review.html)
- [Shared logo usage SOP](https://github.com/nocoo/hexly.ai/blob/main/docs/07-logo-usage-sop.md)

Before/after deliberately shares the same foreground. Check the background presentation at large sizes and the transparent foreground at 24/16 px on both light and dark. A source push does not submit a Chrome Web Store release or create a version tag.
