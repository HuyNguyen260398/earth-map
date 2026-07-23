import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { buildPolygons, featureAt, featureName, isVietnam } from './layers';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] };

function country(admin: string, iso: string): Feature {
  return { type: 'Feature', geometry, properties: { ADMIN: admin, ISO_A3: iso } };
}

function province(name: string): Feature {
  return { type: 'Feature', geometry, properties: { name, level: 'province' } };
}

const vietnam = country('Vietnam', 'VNM');
const thailand = country('Thailand', 'THA');

const countries: FeatureCollection = {
  type: 'FeatureCollection',
  features: [vietnam, thailand, country('France', 'FRA')],
};

const provinces: FeatureCollection = {
  type: 'FeatureCollection',
  features: [province('Hà Nội'), province('Đà Nẵng')],
};

describe('buildPolygons', () => {
  it('returns no polygons at globe band', () => {
    expect(buildPolygons('globe', countries, provinces, null)).toEqual([]);
  });

  it('returns all countries at countries band', () => {
    expect(buildPolygons('countries', countries, provinces, null)).toHaveLength(3);
  });

  it('shows the selected country provinces plus its border overlay at detail band', () => {
    expect(buildPolygons('detail', countries, provinces, vietnam)).toEqual([...provinces.features, vietnam]);
  });

  it('appends the country overlay last so subdivisions win click resolution', () => {
    const result = buildPolygons('detail', countries, provinces, vietnam);
    expect(result[result.length - 1]).toBe(vietnam);
    expect(result.slice(0, -1)).toEqual(provinces.features);
  });

  it('drops every other country at detail band', () => {
    expect(buildPolygons('detail', countries, provinces, thailand)).toEqual([thailand]);
  });

  it('falls back to the country outline while its provinces load', () => {
    expect(buildPolygons('detail', countries, null, vietnam)).toEqual([vietnam]);
  });

  it('returns empty when countries not yet loaded', () => {
    expect(buildPolygons('countries', null, provinces, null)).toEqual([]);
  });

  it('shows all countries at detail band when nothing is selected', () => {
    expect(buildPolygons('detail', countries, provinces, null)).toHaveLength(3);
  });
});

describe('featureAt', () => {
  const east: Feature = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[10, 0], [14, 0], [14, 4], [10, 4], [10, 0]]] },
    properties: { ADMIN: 'East', ISO_A3: 'EST' },
  };

  it('finds the feature covering the point', () => {
    expect(featureAt([vietnam, east], 2, 2)).toBe(vietnam);
    expect(featureAt([vietnam, east], 2, 12)).toBe(east);
  });

  it('returns null where no feature covers the point', () => {
    expect(featureAt([vietnam, east], 2, 8)).toBeNull();
    expect(featureAt([], 2, 2)).toBeNull();
  });
});

describe('isVietnam', () => {
  it('matches on ISO_A3', () => {
    expect(isVietnam(vietnam)).toBe(true);
    expect(isVietnam(thailand)).toBe(false);
    expect(isVietnam(null)).toBe(false);
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
