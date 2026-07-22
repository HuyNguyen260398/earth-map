// Normalizes a raw provinces GeoJSON so every feature has properties
// exactly { name, level: 'province' }, and validates the result against the
// official list of Vietnam's 34 administrative units (1 July 2025 reform).
// Usage: node scripts/prepare-provinces.mjs <in.geojson> <out.geojson> <NAME_KEY>
import { readFileSync, writeFileSync } from 'node:fs';

// The 34 first-level units after the 2025 merger: 6 municipalities + 28 provinces.
const OFFICIAL_NAMES = [
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Nội',
  'Hà Tĩnh', 'Hải Phòng', 'Huế', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ',
  'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'TP. Hồ Chí Minh', 'Tuyên Quang', 'Vĩnh Long',
];

// Upstream (Free-GIS-Data, Post-2025 Provinces.geojson) mislabels the Mekong
// Delta unit as a second "Lạng Sơn"; Đồng Tháp is absent as a result. Lạng Sơn
// borders China at ~21.9°N, so the feature centred at ~10.5°N is Đồng Tháp.
const CORRECTIONS = [
  {
    when: (name, centroidLat) => name === 'Lạng Sơn' && centroidLat < 15,
    to: 'Đồng Tháp',
    reason: 'southern-hemisphere-of-Vietnam feature mislabelled as Lạng Sơn',
  },
];

function centroidLat(geometry) {
  let min = Infinity;
  let max = -Infinity;
  const visit = (coords) => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      min = Math.min(min, coords[1]);
      max = Math.max(max, coords[1]);
    } else if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };
  visit(geometry?.coordinates ?? []);
  return (min + max) / 2;
}

const [inFile, outFile, nameKey] = process.argv.slice(2);
if (!inFile || !outFile || !nameKey) {
  console.error('Usage: node scripts/prepare-provinces.mjs <in.geojson> <out.geojson> <NAME_KEY>');
  process.exit(1);
}

const fc = JSON.parse(readFileSync(inFile, 'utf8'));

const features = fc.features.map((f) => {
  const raw = f.properties?.[nameKey];
  if (!raw) throw new Error(`Feature missing name key "${nameKey}": ${JSON.stringify(f.properties)}`);

  let name = raw;
  const lat = centroidLat(f.geometry);
  for (const c of CORRECTIONS) {
    if (c.when(raw, lat)) {
      console.log(`  correction: "${raw}" -> "${c.to}" (${c.reason}, centroid lat ${lat.toFixed(2)})`);
      name = c.to;
      break;
    }
  }

  return { type: 'Feature', geometry: f.geometry, properties: { name, level: 'province' } };
});

// Validate: exactly 34, unique, and exactly the official set.
const names = features.map((f) => f.properties.name);
const problems = [];
if (features.length !== 34) problems.push(`expected 34 features, got ${features.length}`);

const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
if (duplicates.length) problems.push(`duplicate names: ${[...new Set(duplicates)].join(', ')}`);

const missing = OFFICIAL_NAMES.filter((n) => !names.includes(n));
if (missing.length) problems.push(`missing official units: ${missing.join(', ')}`);

const unexpected = names.filter((n) => !OFFICIAL_NAMES.includes(n));
if (unexpected.length) problems.push(`unexpected units: ${unexpected.join(', ')}`);

if (problems.length) {
  console.error('Validation failed:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

writeFileSync(outFile, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`Wrote ${features.length} validated features to ${outFile}`);
console.log([...names].sort((a, b) => a.localeCompare(b, 'vi')).join(', '));
