import type { Feature } from 'geojson';
import { nextBand, type ZoomBand } from './zoomLevels';

export interface NavState {
  band: ZoomBand;
  // The country in focus at the detail band and below. Stays set while drilling
  // into a province so backing out returns to that country's province map.
  selected: Feature | null;
  // The province in focus at the ward band.
  province: Feature | null;
}

export type NavEvent =
  | { type: 'feature-click'; feature: Feature }
  | { type: 'globe-click'; lat: number; lng: number }
  | { type: 'outside-click' }
  | { type: 'zoom'; altitude: number };

export const INITIAL_NAV_STATE: NavState = { band: 'globe', selected: null, province: null };

function isProvince(f: Feature): boolean {
  return f.properties?.level === 'province';
}

// The navigation ladder: globe → countries → a country's provinces → a
// province's wards. Clicks drive it (the camera follows); scrolling only ever
// steps back out. Returns the same object when nothing changes, so callers can
// skip work.
export function navigate(state: NavState, event: NavEvent): NavState {
  switch (event.type) {
    case 'globe-click':
      // Bare earth under the cursor. From the far view that means "take me in";
      // deeper in it means "not this shape", so back out one level. At the
      // country map it's just ocean — ignore it.
      if (state.band === 'globe') return { band: 'countries', selected: null, province: null };
      if (state.band === 'ward') return { band: 'detail', selected: state.selected, province: null };
      if (state.band === 'detail') return { band: 'countries', selected: null, province: null };
      return state;

    case 'feature-click':
      if (state.band === 'countries') return { band: 'detail', selected: event.feature, province: null };
      // A province drilled into shows its wards; the country stays in focus so
      // backing out returns here. Non-province clicks (the invisible focus
      // overlay) change nothing.
      if (state.band === 'detail' && isProvince(event.feature)) {
        return { band: 'ward', selected: state.selected, province: event.feature };
      }
      return state;

    case 'outside-click':
      // Empty space beside the globe always steps back out one level.
      if (state.band === 'ward') return { band: 'detail', selected: state.selected, province: null };
      if (state.band === 'detail') return { band: 'countries', selected: null, province: null };
      if (state.band === 'countries') return { band: 'globe', selected: null, province: null };
      return state;

    case 'zoom': {
      const band = nextBand(state.band, event.altitude);
      if (band === state.band) return state;
      // Zoom only steps outward. Landing in detail (from ward) keeps the
      // country; anything shallower drops both selections.
      return {
        band,
        selected: band === 'detail' ? state.selected : null,
        province: null,
      };
    }
  }
}
