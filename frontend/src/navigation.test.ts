import { describe, expect, it } from 'vitest';
import type { Feature, Geometry } from 'geojson';
import { INITIAL_NAV_STATE, navigate, type NavState } from './navigation';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
const vietnam: Feature = { type: 'Feature', geometry, properties: { ADMIN: 'Vietnam', ISO_A3: 'VNM' } };

const countriesView: NavState = { band: 'countries', selected: null };
const detailView: NavState = { band: 'detail', selected: vietnam };

describe('navigate', () => {
  it('dives from the far view to the country map when the earth is clicked', () => {
    expect(navigate(INITIAL_NAV_STATE, { type: 'globe-click', lat: 16, lng: 106 })).toEqual(countriesView);
  });

  it('ignores ocean clicks on the country map', () => {
    expect(navigate(countriesView, { type: 'globe-click', lat: 0, lng: 0 })).toBe(countriesView);
  });

  it('selects a country to enter the detail view', () => {
    expect(navigate(countriesView, { type: 'feature-click', feature: vietnam })).toEqual(detailView);
  });

  it('backs out of the detail view when the earth outside the country is clicked', () => {
    expect(navigate(detailView, { type: 'globe-click', lat: 0, lng: 0 })).toEqual(countriesView);
  });

  it('keeps the selection when a subdivision is clicked', () => {
    expect(navigate(detailView, { type: 'feature-click', feature: vietnam })).toBe(detailView);
  });

  it('steps back one level per click on empty space', () => {
    expect(navigate(detailView, { type: 'outside-click' })).toEqual(countriesView);
    expect(navigate(countriesView, { type: 'outside-click' })).toEqual(INITIAL_NAV_STATE);
    expect(navigate(INITIAL_NAV_STATE, { type: 'outside-click' })).toBe(INITIAL_NAV_STATE);
  });

  it('drops the selection when zooming out of the detail view', () => {
    expect(navigate(detailView, { type: 'zoom', altitude: 1.0 })).toEqual(countriesView);
  });

  it('leaves state alone while zooming within a band', () => {
    expect(navigate(detailView, { type: 'zoom', altitude: 0.3 })).toBe(detailView);
    expect(navigate(countriesView, { type: 'zoom', altitude: 0.3 })).toBe(countriesView);
  });
});
