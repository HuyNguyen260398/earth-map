import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { buildPolygons, featureName } from './layers';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };

function country(admin: string, iso: string): Feature {
  return { type: 'Feature', geometry, properties: { ADMIN: admin, ISO_A3: iso } };
}

function province(name: string): Feature {
  return { type: 'Feature', geometry, properties: { name, level: 'province' } };
}

const countries: FeatureCollection = {
  type: 'FeatureCollection',
  features: [country('Vietnam', 'VNM'), country('Thailand', 'THA'), country('France', 'FRA')],
};

const provinces: FeatureCollection = {
  type: 'FeatureCollection',
  features: [province('Hà Nội'), province('Đà Nẵng')],
};

describe('buildPolygons', () => {
  it('returns no polygons at globe band', () => {
    expect(buildPolygons('globe', countries, provinces)).toEqual([]);
  });

  it('returns all countries at countries band', () => {
    expect(buildPolygons('countries', countries, provinces)).toHaveLength(3);
  });

  it('replaces Vietnam with its provinces at detail band', () => {
    const result = buildPolygons('detail', countries, provinces);
    expect(result).toHaveLength(4); // 2 non-VN countries + 2 provinces
    expect(result.some((f) => f.properties?.ISO_A3 === 'VNM')).toBe(false);
    expect(result.filter((f) => f.properties?.level === 'province')).toHaveLength(2);
  });

  it('returns empty when countries not yet loaded', () => {
    expect(buildPolygons('countries', null, provinces)).toEqual([]);
  });

  it('falls back to countries at detail band when provinces not yet loaded', () => {
    expect(buildPolygons('detail', countries, null)).toHaveLength(3);
  });
});

describe('featureName', () => {
  it('reads province name property', () => {
    expect(featureName(province('Hà Nội'))).toBe('Hà Nội');
  });

  it('reads country ADMIN property', () => {
    expect(featureName(country('Vietnam', 'VNM'))).toBe('Vietnam');
  });

  it('returns Unknown for missing properties', () => {
    expect(featureName({ type: 'Feature', geometry, properties: {} })).toBe('Unknown');
  });
});
