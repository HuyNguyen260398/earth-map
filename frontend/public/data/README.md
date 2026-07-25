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

    npx mapshaper <source>/Provinces.geojson -simplify 1% keep-shapes \
      -o precision=0.001 format=geojson public/data/provinces-raw.geojson
    node scripts/prepare-provinces.mjs \
      public/data/provinces-raw.geojson public/data/vietnam-34-provinces.geojson TinhThanh

`prepare-provinces.mjs` normalizes each feature's properties to
`{ name, level: 'province' }` (source name key: `TinhThanh`), applies the
correction and rewind below, and fails if the result is not exactly the 34
official units with unique names.

The 16 MB source simplifies to ~75 KB (34 features, ~126 points each) — roughly
the vertex density of the Natural Earth countries file, which is what the
globe's polygon layer is built for.

### Ring winding

three-globe triangulates polygon caps assuming the winding of the Natural Earth
countries data it ships with: **outer rings clockwise**, holes counter-clockwise.
This source is shapefile-derived and uses the opposite winding, which inverts
every cap into screen-covering triangle fans that wash the whole globe flat
blue. `prepare-provinces.mjs` rewinds every ring to match. If you re-derive this
file by other means, preserve that winding or the globe will render as a blue
sheet.

### Upstream correction applied

The source file mislabels **Đồng Tháp** as a second **Lạng Sơn**, so it ships
with a duplicate name and one official unit missing. The two features are
unambiguous geographically: Lạng Sơn borders China at ~21.9°N, while the
mislabelled feature is centred at ~10.55°N in the Mekong Delta, matching the
new Đồng Tháp (Đồng Tháp + Tiền Giang). The script renames the southern feature
to `Đồng Tháp`; the rule is keyed on centroid latitude, so it stops applying if
the source is ever fixed upstream.

## wards/

- Commune-level boundaries (phường / xã / đặc khu) for all 34 provinces after
  the 2025 reform — 3,321 units total — one merged GeoJSON per province, plus
  `index.json` mapping each province name (as it appears in
  `vietnam-34-provinces.geojson`) to its file. The app loads one province's
  wards on demand when you drill into it.
- Source: https://github.com/thanglequoc/vietnamese-provinces-database
  (`json/geojson/` export, v4.0.0, June 2026), derived from the official
  Vietnam Administrative Units Reference Map.

### Processing

The raw export is ~600 MB (one file per ward). Regenerate with:

    # 1. Download + unzip the export's ward GeoJSON archive, e.g.
    curl -L -o wards.zip https://raw.githubusercontent.com/thanglequoc/\
    vietnamese-provinces-database/master/json/vn_provinces_wards_geojson_<date>.zip
    unzip -q wards.zip -d wards_src    # → wards_src/geojson/<code>_<slug>/wards/*.geojson

    # 2. Merge + simplify per province into public/data/wards/
    node scripts/prepare-wards.mjs wards_src/geojson public/data/wards 6

`prepare-wards.mjs` merges each province's ward files into one FeatureCollection,
normalizes properties to `{ name, level: 'ward' }`, rewinds rings to three-globe's
winding (see above), and topology-preserving-simplifies to `6%` with 0.0001°
precision (so adjacent wards keep shared edges). All 34 provinces total ~8 MB;
raise the last argument to simplify harder. It maps the export's province names
to ours by folding away the "TP." prefix and Vietnamese tone-mark placement
(the export writes e.g. "Thanh Hoá" where we write "Thanh Hóa"), and fails if
any of the 34 official units is unmatched.
