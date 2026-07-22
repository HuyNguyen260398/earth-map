# Map data provenance

## countries.geojson

- Natural Earth 1:110m Admin 0 — Countries (public domain).
- Downloaded from the globe.gl example datasets mirror
  (`vasturiano/globe.gl` → `example/datasets/ne_110m_admin_0_countries.geojson`).
- 177 features. The app reads `properties.ADMIN` (name) and `properties.ISO_A3`
  (Vietnam is `VNM`).

## vietnam-34-provinces.geojson

- Boundaries of Vietnam's 34 provinces/municipalities after the 1 July 2025
  administrative merger, including the Hoàng Sa (Paracel) and Trường Sa
  (Spratly) archipelagos.
- Source: https://github.com/nguyenduy1133/Free-GIS-Data
  ("Vietnam Administrative Divisions (Post-2025)" / `Provinces.geojson`).
- Provided free of charge for public use; attribution: **Nguyen Duy Liem**.

### Processing

Regenerate with:

    npx mapshaper <source>/Provinces.geojson -simplify 8% keep-shapes \
      -o precision=0.0001 format=geojson public/data/provinces-raw.geojson
    node scripts/prepare-provinces.mjs \
      public/data/provinces-raw.geojson public/data/vietnam-34-provinces.geojson TinhThanh

`prepare-provinces.mjs` normalizes each feature's properties to
`{ name, level: 'province' }` (source name key: `TinhThanh`), applies the
correction below, and fails if the result is not exactly the 34 official units
with unique names.

### Upstream correction applied

The source file mislabels **Đồng Tháp** as a second **Lạng Sơn**, so it ships
with a duplicate name and one official unit missing. The two features are
unambiguous geographically: Lạng Sơn borders China at ~21.9°N, while the
mislabelled feature is centred at ~10.55°N in the Mekong Delta, matching the
new Đồng Tháp (Đồng Tháp + Tiền Giang). The script renames the southern feature
to `Đồng Tháp`; the rule is keyed on centroid latitude, so it stops applying if
the source is ever fixed upstream.
