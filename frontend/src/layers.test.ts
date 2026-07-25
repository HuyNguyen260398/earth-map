import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { buildPolygons, featureAt, featureName, hoverFeatureAt, isVietnam, type PolygonInputs } from './layers';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] };

function country(admin: string, iso: string): Feature {
  return { type: 'Feature', geometry, properties: { ADMIN: admin, ISO_A3: iso } };
}

function province(name: string): Feature {
  return { type: 'Feature', geometry, properties: { name, level: 'province' } };
}

function ward(name: string): Feature {
  return { type: 'Feature', geometry, properties: { name, level: 'ward' } };
}

const vietnam = country('Vietnam', 'VNM');
const thailand = country('Thailand', 'THA');
const haNoi = province('Hà Nội');

const countries: FeatureCollection = {
  type: 'FeatureCollection',
  features: [vietnam, thailand, country('France', 'FRA')],
};

const provinces: FeatureCollection = {
  type: 'FeatureCollection',
  features: [haNoi, province('Đà Nẵng')],
};

const wards: FeatureCollection = {
  type: 'FeatureCollection',
  features: [ward('Ba Đình'), ward('Hoàn Kiếm')],
};

function inputs(over: Partial<PolygonInputs> = {}): PolygonInputs {
  return { band: 'globe', countries, provinces, wards, country: null, province: null, ...over };
}

describe('buildPolygons', () => {
  it('returns no polygons at globe band', () => {
    expect(buildPolygons(inputs({ band: 'globe' }))).toEqual([]);
  });

  it('returns all countries at countries band', () => {
    expect(buildPolygons(inputs({ band: 'countries' }))).toHaveLength(3);
  });

  it('shows the selected country provinces plus its border overlay at detail band', () => {
    expect(buildPolygons(inputs({ band: 'detail', country: vietnam }))).toEqual([...provinces.features, vietnam]);
  });

  it('appends the country overlay last so subdivisions win click resolution', () => {
    const result = buildPolygons(inputs({ band: 'detail', country: vietnam }));
    expect(result[result.length - 1]).toBe(vietnam);
    expect(result.slice(0, -1)).toEqual(provinces.features);
  });

  it('drops every other country at detail band', () => {
    expect(buildPolygons(inputs({ band: 'detail', country: thailand }))).toEqual([thailand]);
  });

  it('falls back to the country outline while its provinces load', () => {
    expect(buildPolygons(inputs({ band: 'detail', provinces: null, country: vietnam }))).toEqual([vietnam]);
  });

  it('shows the province wards plus its border overlay at ward band', () => {
    expect(buildPolygons(inputs({ band: 'ward', country: vietnam, province: haNoi }))).toEqual([
      ...wards.features,
      haNoi,
    ]);
  });

  it('falls back to the province outline while its wards load', () => {
    expect(buildPolygons(inputs({ band: 'ward', wards: null, country: vietnam, province: haNoi }))).toEqual([haNoi]);
  });

  it('returns empty when countries not yet loaded', () => {
    expect(buildPolygons(inputs({ band: 'countries', countries: null }))).toEqual([]);
  });

  it('shows all countries at detail band when nothing is selected', () => {
    expect(buildPolygons(inputs({ band: 'detail', country: null }))).toHaveLength(3);
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

describe('hoverFeatureAt', () => {
  // At the drill-down bands the focus shape is an invisible overlay laid last
  // over its subdivisions (see buildPolygons). Hover must pick out the
  // subdivision under the pointer but never the overlay itself — otherwise the
  // whole focus shape would light up in the gaps between subdivisions.
  const focus = province('Focus'); // stands in for the country/province overlay
  const sub = ward('Sub'); // a subdivision drawn over the focus

  it('resolves the subdivision under the point, not the focus overlay', () => {
    // sub is listed first (subdivisions win), focus overlay last
    expect(hoverFeatureAt([sub, focus], 2, 2, focus)).toBe(sub);
  });

  it('returns null when the point only falls on the focus overlay', () => {
    // east is outside the [0,4] square, so only the focus overlay covers (2,2)
    expect(hoverFeatureAt([focus], 2, 2, focus)).toBeNull();
  });

  it('highlights the feature when there is no focus (e.g. the countries band)', () => {
    expect(hoverFeatureAt([vietnam, haNoi], 2, 2, null)).toBe(vietnam);
  });

  it('returns null where no feature covers the point', () => {
    expect(hoverFeatureAt([focus], 2, 8, focus)).toBeNull();
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
