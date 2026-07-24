import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import { union, type Polygon as PcPolygon } from 'polygon-clipping';
import { POLYGON_ALTITUDE } from './styles';

// A vertex on a border path in the order globe.gl's path layer reads it:
// [lat, lng, altitude]. (GeoJSON is [lng, lat] — we swap when building these.)
export type BorderPoint = [number, number, number];

export interface BorderPath {
  points: BorderPoint[];
  color: string;
  stroke: number; // fat-line width, in screen pixels
}

// The highlighted national border is a stack of translucent fat lines: a wide,
// faint halo under a bright, near-opaque core. Overlapping them fakes a soft
// glow cheaply, without a scene-wide bloom pass that would light up every other
// line too. Each layer sits at its own altitude so the coplanar lines don't
// z-fight — widest and faintest lowest, brightest core on top.
interface GlowLayer {
  color: string;
  stroke: number;
  lift: number; // added to the base border altitude
}

// Just clear of the subdivision strokes (which sit at POLYGON_ALTITUDE) so the
// glow reads as floating a hair above the surface rather than fighting them.
const BORDER_ALTITUDE = POLYGON_ALTITUDE + 0.001;

const GLOW_LAYERS: GlowLayer[] = [
  { color: 'rgba(120, 200, 255, 0.10)', stroke: 9, lift: 0 },
  { color: 'rgba(170, 224, 255, 0.24)', stroke: 5.5, lift: 0.0004 },
  { color: 'rgba(210, 240, 255, 0.55)', stroke: 3, lift: 0.0008 },
  { color: 'rgba(245, 251, 255, 0.95)', stroke: 1.5, lift: 0.0012 },
];

// Natural Earth country outlines are coarse (Vietnam is 44 vertices), so their
// corners look sharp. Three passes of corner-cutting round them convincingly
// without dissolving real geography.
const SMOOTH_ITERATIONS = 3;

// Skip islets far smaller than the country's main landmass so the map isn't
// peppered with tiny glowing specks; keep anything at least this fraction of the
// largest ring's bounding-box area (so island nations keep their major islands).
const MIN_RING_AREA_FRACTION = 0.02;

// Fallback for countries we carry no subdivisions for: the only outline we have
// is the coarse national one from the countries file, so its sharp corners get
// rounded with Chaikin smoothing before glowing.
export function buildBorderPaths(country: Feature | null): BorderPath[] {
  return glowPaths(significantRings(outerRings(country?.geometry ?? null)), true);
}

// Preferred border for a shape we carry subdivisions for: trace the
// subdivisions' own outer edge (provinces dissolved into a country, wards
// dissolved into a province) so the highlight sits exactly on the subdivision
// lines rather than floating off a coarse outline. Subdivision data is
// high-resolution, so the dissolved edge is already smooth — corner cutting is
// skipped here (it would pull the glow off the subdivision lines).
export function buildDissolvedBorderPaths(subdivisions: FeatureCollection | null): BorderPath[] {
  return glowPaths(significantRings(dissolveOuterRings(subdivisions)), false);
}

// Stack the glow layers over each supplied ring. `smooth` rounds coarse corners;
// leave it off when the ring must stay pinned to real geometry.
function glowPaths(rings: Position[][], smooth: boolean): BorderPath[] {
  const paths: BorderPath[] = [];
  for (const ring of rings) {
    const shaped = smooth ? smoothClosedRing(ring, SMOOTH_ITERATIONS) : ring;
    for (const layer of GLOW_LAYERS) {
      paths.push({
        points: shaped.map(([lng, lat]) => [lat, lng, BORDER_ALTITUDE + layer.lift]),
        color: layer.color,
        stroke: layer.stroke,
      });
    }
  }
  return paths;
}

// Merge every subdivision into one shape and return its outer rings — the parent
// border implied by them. Union is robust to the source data being only
// partially noded (shared edges that don't line up vertex-for-vertex), which
// plain edge-cancellation is not. Memoized: each set loads once.
const dissolveCache = new WeakMap<FeatureCollection, Position[][]>();

function dissolveOuterRings(fc: FeatureCollection | null): Position[][] {
  if (!fc?.features.length) return [];
  const cached = dissolveCache.get(fc);
  if (cached) return cached;

  const polygons = fc.features.flatMap(featurePolygons) as unknown as PcPolygon[];
  if (!polygons.length) return [];
  const dissolved = union(polygons[0], ...polygons.slice(1));
  // Outer ring per merged polygon; holes (interior boundaries) aren't the border.
  const rings = dissolved.map((poly) => poly[0] as unknown as Position[]).filter(Boolean);

  dissolveCache.set(fc, rings);
  return rings;
}

// Every feature polygon as its own polygon-clipping input, so a MultiPolygon
// contributes each of its parts.
function featurePolygons(f: Feature): Position[][][] {
  const g = f.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  return [];
}

// Exterior rings only — holes and the subdivision lines inside stay untouched.
function outerRings(geometry: Geometry | null): Position[][] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates.slice(0, 1);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((poly) => poly[0]).filter(Boolean);
  return [];
}

function significantRings(rings: Position[][]): Position[][] {
  if (rings.length <= 1) return rings;
  const areas = rings.map(ringBoxArea);
  const threshold = Math.max(...areas) * MIN_RING_AREA_FRACTION;
  return rings.filter((_, i) => areas[i] >= threshold);
}

// Bounding-box area in squared degrees — a cheap stand-in for real area, enough
// to rank a mainland against islets.
function ringBoxArea(ring: Position[]): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

// Chaikin's corner-cutting: each pass replaces every vertex with two points a
// quarter of the way along its neighbouring edges, pulling sharp corners toward
// a B-spline. The ring is closed, so the last→first edge is cut too and the
// result stays closed.
export function smoothClosedRing(ring: Position[], iterations: number): Position[] {
  // GeoJSON rings repeat the first point as the last; drop it so the closing
  // edge isn't cut twice, then re-close at the end.
  let pts = dropClosingPoint(ring);
  if (pts.length < 3) return ring;
  for (let i = 0; i < iterations; i++) pts = chaikinPass(pts);
  return [...pts, pts[0]];
}

function chaikinPass(pts: Position[]): Position[] {
  const out: Position[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    out.push([ax + 0.25 * (bx - ax), ay + 0.25 * (by - ay)]);
    out.push([ax + 0.75 * (bx - ax), ay + 0.75 * (by - ay)]);
  }
  return out;
}

function dropClosingPoint(ring: Position[]): Position[] {
  if (ring.length < 2) return ring.slice();
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring.slice();
}
