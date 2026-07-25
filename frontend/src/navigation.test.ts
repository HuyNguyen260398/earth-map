import { describe, expect, it } from 'vitest';
import type { Feature, Geometry } from 'geojson';
import { INITIAL_NAV_STATE, navigate, type NavState } from './navigation';

const geometry: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
const vietnam: Feature = { type: 'Feature', geometry, properties: { ADMIN: 'Vietnam', ISO_A3: 'VNM' } };
const haNoi: Feature = { type: 'Feature', geometry, properties: { name: 'Hà Nội', level: 'province' } };
const baDinh: Feature = { type: 'Feature', geometry, properties: { name: 'Ba Đình', level: 'ward' } };

const countriesView: NavState = { band: 'countries', selected: null, province: null };
const detailView: NavState = { band: 'detail', selected: vietnam, province: null };
const wardView: NavState = { band: 'ward', selected: vietnam, province: haNoi };

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

  it('drills into a province to enter the ward view, keeping the country', () => {
    expect(navigate(detailView, { type: 'feature-click', feature: haNoi })).toEqual(wardView);
  });

  it('ignores clicks on the non-province focus overlay in the detail view', () => {
    expect(navigate(detailView, { type: 'feature-click', feature: vietnam })).toBe(detailView);
  });

  it('keeps the selection when a ward is clicked', () => {
    expect(navigate(wardView, { type: 'feature-click', feature: baDinh })).toBe(wardView);
  });

  it('backs out of the detail view when the earth outside the country is clicked', () => {
    expect(navigate(detailView, { type: 'globe-click', lat: 0, lng: 0 })).toEqual(countriesView);
  });

  it('backs out of the ward view to the province map when the earth is clicked', () => {
    expect(navigate(wardView, { type: 'globe-click', lat: 0, lng: 0 })).toEqual(detailView);
  });

  it('steps back one level per click on empty space', () => {
    expect(navigate(wardView, { type: 'outside-click' })).toEqual(detailView);
    expect(navigate(detailView, { type: 'outside-click' })).toEqual(countriesView);
    expect(navigate(countriesView, { type: 'outside-click' })).toEqual(INITIAL_NAV_STATE);
    expect(navigate(INITIAL_NAV_STATE, { type: 'outside-click' })).toBe(INITIAL_NAV_STATE);
  });

  it('drops the selection when zooming out of the detail view', () => {
    expect(navigate(detailView, { type: 'zoom', altitude: 1.0 })).toEqual(countriesView);
  });

  it('steps ward → detail when zooming out, keeping the country', () => {
    expect(navigate(wardView, { type: 'zoom', altitude: 0.4 })).toEqual(detailView);
  });

  it('leaves state alone while zooming within a band', () => {
    expect(navigate(detailView, { type: 'zoom', altitude: 0.3 })).toBe(detailView);
    expect(navigate(wardView, { type: 'zoom', altitude: 0.1 })).toBe(wardView);
    expect(navigate(countriesView, { type: 'zoom', altitude: 0.3 })).toBe(countriesView);
  });
});
