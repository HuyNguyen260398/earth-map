import { describe, expect, it } from 'vitest';
import type { Feature, Geometry } from 'geojson';
import {
  NEAR_POLYGON_ALTITUDE,
  POLYGON_ALTITUDE,
  polygonAltitudeFor,
  polygonCapColor,
  polygonStrokeColor,
  type PolygonStyleContext,
} from './styles';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] };

function feature(name: string): Feature {
  return { type: 'Feature', geometry, properties: { name } };
}

const country = feature('Vietnam');
const province = feature('Hà Nội');

function ctx(overrides: Partial<PolygonStyleContext> = {}): PolygonStyleContext {
  return { band: 'detail', hovered: null, selected: null, ...overrides };
}

describe('polygonAltitudeFor', () => {
  it('hugs the surface at the drill-down bands to stay aligned with the imagery', () => {
    expect(polygonAltitudeFor('detail')).toBe(NEAR_POLYGON_ALTITUDE);
    expect(polygonAltitudeFor('ward')).toBe(NEAR_POLYGON_ALTITUDE);
  });

  it('keeps the higher lift up high where z-fighting, not parallax, is the risk', () => {
    expect(polygonAltitudeFor('globe')).toBe(POLYGON_ALTITUDE);
    expect(polygonAltitudeFor('countries')).toBe(POLYGON_ALTITUDE);
  });

  it('makes the close-up lift much smaller (parallax scales with altitude)', () => {
    expect(NEAR_POLYGON_ALTITUDE).toBeLessThan(POLYGON_ALTITUDE / 5);
  });
});

describe('polygonStrokeColor', () => {
  it('hides the focus country stroke at the detail band (glow path draws it)', () => {
    expect(polygonStrokeColor(country, ctx({ selected: country }))).toBeNull();
  });

  it('gives subdivisions the plain detail stroke', () => {
    const stroke = polygonStrokeColor(province, ctx({ selected: country }));
    expect(stroke).not.toBeNull();
    expect(stroke).toBe(polygonStrokeColor(feature('Đà Nẵng'), ctx({ selected: country })));
  });

  it('keeps the country stroke visible outside the detail band', () => {
    expect(polygonStrokeColor(country, ctx({ band: 'countries', selected: country }))).not.toBeNull();
  });

  it('prefers the hover stroke over hiding the focus country', () => {
    expect(polygonStrokeColor(country, ctx({ selected: country, hovered: country }))).not.toBeNull();
  });

  it('applies the same rules one level down in the ward band', () => {
    // Focus province hidden; a ward gets the plain subdivision stroke.
    expect(polygonStrokeColor(province, ctx({ band: 'ward', selected: province }))).toBeNull();
    expect(polygonStrokeColor(feature('Ba Đình'), ctx({ band: 'ward', selected: province }))).not.toBeNull();
  });
});

describe('polygonCapColor', () => {
  it('drops the cap of the selected country so it stays out of hover raycasting', () => {
    expect(polygonCapColor(country, ctx({ selected: country }))).toBeNull();
  });

  it('keeps subdivisions capped (transparent but hoverable)', () => {
    expect(polygonCapColor(province, ctx({ selected: country }))).not.toBeNull();
  });

  it('caps the hovered feature with the hover fill', () => {
    const hoverFill = polygonCapColor(province, ctx({ selected: country, hovered: province }));
    expect(hoverFill).not.toBeNull();
    expect(hoverFill).not.toBe(polygonCapColor(province, ctx({ selected: country })));
  });
});
