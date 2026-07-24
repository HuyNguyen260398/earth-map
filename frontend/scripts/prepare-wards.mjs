// Builds one merged, simplified ward GeoJSON per Vietnamese province from the
// thanglequoc/vietnamese-provinces-database export (post-2025 reform, 34
// provinces / 3,321 wards), plus an index.json mapping province name → file.
//
// The raw export is ~600 MB, so wards are heavily simplified (topology-aware, so
// shared borders stay matched) and their coordinates rounded — plenty for the
// zoom level wards are viewed at, and small enough to commit.
//
// Usage: node scripts/prepare-wards.mjs <extracted-geojson-dir> <out-dir> [simplifyPct]
//   <extracted-geojson-dir>: the `geojson/` folder from the export zip
//   <out-dir>: e.g. public/data/wards
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import mapshaper from 'mapshaper';

// The 34 first-level units after the 2025 merger, matching the provinces file.
const OFFICIAL_NAMES = [
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Nội',
  'Hà Tĩnh', 'Hải Phòng', 'Huế', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ',
  'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'TP. Hồ Chí Minh', 'Tuyên Quang', 'Vĩnh Long',
];

// Match export names to ours despite two differences: a "city/province" prefix
// (only "TP. Hồ Chí Minh" carries one for us) and Vietnamese tone-mark placement
// (the export writes "Thanh Hoá", we write "Thanh Hóa"). Folding to prefix-free
// ASCII collapses both; the folded names stay unique among the 34.
const foldName = (s) =>
  s
    .replace(/^(TP\.\s*|Thành phố\s+|Tỉnh\s+)/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();
const OUR_BY_KEY = new Map(OFFICIAL_NAMES.map((n) => [foldName(n), n]));

// three-globe triangulates caps assuming outer rings clockwise, holes the other
// way — the same normalization the provinces file needs.
function signedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return area / 2;
}

function rewind(geometry) {
  const fixPoly = (poly) =>
    poly.map((ring, i) => {
      const wantClockwise = i === 0;
      const isClockwise = signedArea(ring) < 0;
      return isClockwise === wantClockwise ? ring : [...ring].reverse();
    });
  return geometry.type === 'MultiPolygon'
    ? { ...geometry, coordinates: geometry.coordinates.map(fixPoly) }
    : { ...geometry, coordinates: fixPoly(geometry.coordinates) };
}

async function simplify(fc, pct) {
  const cmd =
    `-i in.json -simplify ${pct}% keep-shapes -clean ` +
    `-o out.json format=geojson precision=0.0001`;
  const out = await mapshaper.applyCommands(cmd, { 'in.json': JSON.stringify(fc) });
  const buf = out['out.json'];
  return JSON.parse(typeof buf === 'string' ? buf : Buffer.from(buf).toString('utf8'));
}

function readWardFeatures(wardsDir) {
  return readdirSync(wardsDir)
    .filter((f) => f.endsWith('.geojson'))
    .map((f) => {
      const fc = JSON.parse(readFileSync(join(wardsDir, f), 'utf8'));
      const feature = fc.features[0];
      if (!feature) throw new Error(`Empty ward file: ${f}`);
      const name = feature.properties?.name;
      if (!name) throw new Error(`Ward missing name: ${f}`);
      return { type: 'Feature', geometry: feature.geometry, properties: { name, level: 'ward' } };
    });
}

async function main() {
  const [inDir, outDir, pctArg] = process.argv.slice(2);
  if (!inDir || !outDir) {
    console.error('Usage: node scripts/prepare-wards.mjs <extracted-geojson-dir> <out-dir> [simplifyPct]');
    process.exit(1);
  }
  const pct = pctArg ?? '6';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const provinceDirs = readdirSync(inDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const manifest = {};
  let totalBytes = 0;

  for (const folder of provinceDirs) {
    const combined = JSON.parse(readFileSync(join(inDir, folder, `${folder}.geojson`), 'utf8'));
    const provinceName = combined.features[0]?.properties?.name;
    const ourName = OUR_BY_KEY.get(foldName(provinceName ?? ''));
    if (!ourName) throw new Error(`Unmapped province "${provinceName}" (folder ${folder})`);

    const features = readWardFeatures(join(inDir, folder, 'wards'));
    const simplified = await simplify({ type: 'FeatureCollection', features }, pct);
    simplified.features = simplified.features.map((f) => ({ ...f, geometry: rewind(f.geometry) }));

    const file = `${folder}.geojson`;
    const json = JSON.stringify(simplified);
    writeFileSync(join(outDir, file), json);
    totalBytes += Buffer.byteLength(json);
    manifest[ourName] = file;
    console.log(`  ${ourName}: ${features.length} wards → ${file} (${(json.length / 1024).toFixed(0)} KB)`);
  }

  // Validate coverage against the official 34.
  const covered = Object.keys(manifest);
  const missing = OFFICIAL_NAMES.filter((n) => !covered.includes(n));
  if (covered.length !== 34 || missing.length) {
    console.error(`Validation failed: ${covered.length} provinces; missing: ${missing.join(', ') || 'none'}`);
    process.exit(1);
  }

  writeFileSync(join(outDir, 'index.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${covered.length} province ward files + index.json to ${outDir}`);
  console.log(`Total ward data: ${(totalBytes / 1024 / 1024).toFixed(1)} MB (simplify ${pct}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
