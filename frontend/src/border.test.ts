import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Position } from 'geojson';
import { buildBorderPaths, buildProvinceBorderPaths, smoothClosedRing } from './border';

// A closed unit square (first point repeated as last, as GeoJSON rings are).
const square: Position[] = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];

function polygonCountry(ring: Position[]): Feature {
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
}

describe('smoothClosedRing', () => {
  it('rounds corners by inserting points and stays closed', () => {
    const smoothed = smoothClosedRing(square, 2);
    // Two corner-cutting passes quadruple the (unclosed) vertex count.
    expect(smoothed.length).toBe(4 * 4 + 1);
    expect(smoothed[0]).toEqual(smoothed[smoothed.length - 1]);
    // The sharp original corner (4,0) is cut away — no vertex sits on it anymore.
    expect(smoothed.some(([x, y]) => x === 4 && y === 0)).toBe(false);
  });

  it('keeps every smoothed point inside the original bounding box', () => {
    for (const [x, y] of smoothClosedRing(square, 3)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(4);
    }
  });

  it('leaves degenerate rings untouched', () => {
    const tiny: Position[] = [[0, 0], [1, 1]];
    expect(smoothClosedRing(tiny, 3)).toBe(tiny);
  });
});

describe('buildBorderPaths', () => {
  it('returns no paths without a country', () => {
    expect(buildBorderPaths(null)).toEqual([]);
    expect(buildBorderPaths({ type: 'Feature', geometry: null, properties: {} } as unknown as Feature)).toEqual([]);
  });

  it('emits one path per glow layer, as [lat, lng, alt] points', () => {
    const paths = buildBorderPaths(polygonCountry(square));
    expect(paths.length).toBeGreaterThan(1);
    // Distinct strokes/colors → the layers really are stacked, not duplicated.
    expect(new Set(paths.map((p) => p.stroke)).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.stroke).toBeGreaterThan(0);
      expect(path.color).toMatch(/^rgba/);
      // GeoJSON [lng, lat] is swapped to [lat, lng] and an altitude is appended.
      expect(path.points[0]).toHaveLength(3);
    }
  });

  it('drops islets far smaller than the main landmass', () => {
    const big = square;
    const speck: Position[] = [[100, 100], [100.05, 100], [100.05, 100.05], [100, 100.05], [100, 100]];
    const multi: Feature = {
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: [[big], [speck]] },
      properties: {},
    };
    const paths = buildBorderPaths(multi);
    // Only the big ring survives, so the speck's coordinates never appear.
    const touchesSpeck = paths.some((p) => p.points.some(([lat, lng]) => lng >= 100 && lat >= 100));
    expect(touchesSpeck).toBe(false);
  });

  it('keeps comparably-sized rings of an island nation (via country outline)', () => {
    const west = square;
    const east: Position[] = [[10, 0], [14, 0], [14, 4], [10, 4], [10, 0]];
    const multi: Feature = {
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: [[west], [east]] },
      properties: {},
    };
    const layers = buildBorderPaths(polygonCountry(square)).length;
    expect(buildBorderPaths(multi).length).toBe(layers * 2);
  });
});

describe('buildProvinceBorderPaths', () => {
  const LAYERS = buildBorderPaths(polygonCountry(square)).length;

  function province(ring: Position[]): Feature {
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
  }

  function collection(...features: Feature[]): FeatureCollection {
    return { type: 'FeatureCollection', features };
  }

  // Two unit squares sharing the edge x=2, so the dissolve is one 0..4 × 0..2 box.
  const west: Position[] = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
  const east: Position[] = [[2, 0], [4, 0], [4, 2], [2, 2], [2, 0]];

  it('returns no paths without provinces', () => {
    expect(buildProvinceBorderPaths(null)).toEqual([]);
    expect(buildProvinceBorderPaths(collection())).toEqual([]);
  });

  it('dissolves adjacent provinces into a single outer border', () => {
    const paths = buildProvinceBorderPaths(collection(province(west), province(east)));
    // One merged shape → one ring → one stack of glow layers (not two).
    expect(paths.length).toBe(LAYERS);
    // The border spans the union, and the shared internal edge is gone.
    const lats = paths[0].points.map((p) => p[0]);
    const lngs = paths[0].points.map((p) => p[1]);
    expect(Math.min(...lngs)).toBeCloseTo(0);
    expect(Math.max(...lngs)).toBeCloseTo(4);
    expect(Math.min(...lats)).toBeCloseTo(0);
    expect(Math.max(...lats)).toBeCloseTo(2);
  });

  it('traces the province edge without corner-cutting (stays a tight box)', () => {
    const paths = buildProvinceBorderPaths(collection(province(west), province(east)));
    // A rectangle is ~5 points; smoothing would balloon this into dozens.
    expect(paths[0].points.length).toBeLessThanOrEqual(8);
  });

  it('keeps disjoint provinces as separate border loops', () => {
    const far: Position[] = [[100, 100], [104, 100], [104, 102], [100, 102], [100, 100]];
    const paths = buildProvinceBorderPaths(collection(province(west), province(far)));
    expect(paths.length).toBe(LAYERS * 2);
  });
});
