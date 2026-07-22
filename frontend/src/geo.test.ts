import { describe, expect, it } from 'vitest';
import type { Geometry } from 'geojson';
import { boundsAltitude, geometryBounds, geometryCentroid, geometryContains } from './geo';

const square: Geometry = {
  type: 'Polygon',
  coordinates: [[[100, 10], [110, 10], [110, 20], [100, 20], [100, 10]]],
};

const multi: Geometry = {
  type: 'MultiPolygon',
  coordinates: [
    [[[0, 0], [2, 0], [2, 2], [0, 0]]],
    [[[8, 8], [10, 8], [10, 10], [8, 8]]],
  ],
};

describe('geometryBounds', () => {
  it('returns the bounding box of a polygon', () => {
    expect(geometryBounds(square)).toEqual({ minLng: 100, maxLng: 110, minLat: 10, maxLat: 20 });
  });

  it('spans all parts of a MultiPolygon', () => {
    expect(geometryBounds(multi)).toEqual({ minLng: 0, maxLng: 10, minLat: 0, maxLat: 10 });
  });
});

describe('geometryCentroid', () => {
  it('returns the bbox center of a polygon', () => {
    expect(geometryCentroid(square)).toEqual({ lat: 15, lng: 105 });
  });

  it('spans all parts of a MultiPolygon', () => {
    expect(geometryCentroid(multi)).toEqual({ lat: 5, lng: 5 });
  });
});

describe('geometryContains', () => {
  it('tests a point against a polygon', () => {
    expect(geometryContains(square, 15, 105)).toBe(true);
    expect(geometryContains(square, 15, 99)).toBe(false);
    expect(geometryContains(square, 25, 105)).toBe(false);
  });

  it('excludes holes', () => {
    const donut: Geometry = {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
      ],
    };
    expect(geometryContains(donut, 2, 2)).toBe(true);
    expect(geometryContains(donut, 5, 5)).toBe(false);
  });

  it('matches any part of a MultiPolygon', () => {
    expect(geometryContains(multi, 0.5, 1)).toBe(true);
    expect(geometryContains(multi, 8.5, 9)).toBe(true);
    expect(geometryContains(multi, 5, 5)).toBe(false);
  });

  it('returns false for non-area geometries', () => {
    expect(geometryContains({ type: 'Point', coordinates: [0, 0] }, 0, 0)).toBe(false);
  });
});

describe('boundsAltitude', () => {
  it('scales with the size of the country', () => {
    const small = boundsAltitude(geometryBounds(square), 0.12, 0.55);
    const large = boundsAltitude({ minLat: -20, maxLat: 20, minLng: 0, maxLng: 10 }, 0.12, 0.55);
    expect(small).toBeLessThan(large);
  });

  it('clamps to the given range', () => {
    const speck = { minLat: 1, maxLat: 1.05, minLng: 1, maxLng: 1.05 };
    const continent = { minLat: -60, maxLat: 60, minLng: -60, maxLng: 60 };
    expect(boundsAltitude(speck, 0.12, 0.55)).toBe(0.12);
    expect(boundsAltitude(continent, 0.12, 0.55)).toBe(0.55);
  });

  it('keeps a Vietnam-sized country inside the range', () => {
    const vietnam = { minLat: 8.5, maxLat: 23.4, minLng: 102.1, maxLng: 109.5 };
    const altitude = boundsAltitude(vietnam, 0.12, 0.55);
    expect(altitude).toBeGreaterThan(0.12);
    expect(altitude).toBeLessThan(0.55);
  });
});
