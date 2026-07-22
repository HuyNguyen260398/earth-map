import type { Feature } from 'geojson';
import { nextBand, type ZoomBand } from './zoomLevels';

export interface NavState {
  band: ZoomBand;
  selected: Feature | null;
}

export type NavEvent =
  | { type: 'feature-click'; feature: Feature }
  | { type: 'globe-click'; lat: number; lng: number }
  | { type: 'outside-click' }
  | { type: 'zoom'; altitude: number };

export const INITIAL_NAV_STATE: NavState = { band: 'globe', selected: null };

// The navigation ladder: globe → countries → one country's subdivisions.
// Clicks drive it (the camera follows); scrolling only ever steps back out.
// Returns the same object when nothing changes, so callers can skip work.
export function navigate(state: NavState, event: NavEvent): NavState {
  switch (event.type) {
    case 'globe-click':
      // Bare earth under the cursor. From the far view that means "take me in";
      // in the detail view it means "not this country", so back out one level.
      // At the country map it's just ocean — ignore it.
      if (state.band === 'globe') return { band: 'countries', selected: null };
      if (state.band === 'detail') return { band: 'countries', selected: null };
      return state;

    case 'feature-click':
      if (state.band === 'countries') return { band: 'detail', selected: event.feature };
      return state;

    case 'outside-click':
      // Empty space beside the globe always steps back out.
      if (state.band === 'detail') return { band: 'countries', selected: null };
      if (state.band === 'countries') return { band: 'globe', selected: null };
      return state;

    case 'zoom': {
      const band = nextBand(state.band, event.altitude);
      // nextBand never enters 'detail', so any change here leaves it.
      return band === state.band ? state : { band, selected: null };
    }
  }
}
