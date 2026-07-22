export type ZoomBand = 'globe' | 'countries' | 'detail';

// Camera altitude thresholds in globe-radius units (default view ≈ 2.5).
// Enter/exit differ (hysteresis) so the view doesn't flicker at a boundary.
export const COUNTRIES_ENTER = 1.8;
export const COUNTRIES_EXIT = 2.0;
export const DETAIL_EXIT = 0.8;

// Altitudes the camera flies to when a click changes band. Detail altitude is
// derived per country from its size (see geo.ts) and clamped to this range,
// which sits comfortably below DETAIL_EXIT so landing doesn't bounce back out.
export const GLOBE_VIEW_ALTITUDE = 2.5;
export const COUNTRIES_VIEW_ALTITUDE = 1.3;
export const DETAIL_VIEW_MIN_ALTITUDE = 0.12;
export const DETAIL_VIEW_MAX_ALTITUDE = 0.55;

// Zoom-driven band changes. `detail` is only ever *entered* by picking a
// country (see navigation.ts) — scrolling in from `countries` has nothing to
// focus on — but scrolling out of it still steps back down the ladder.
export function nextBand(current: ZoomBand, altitude: number): ZoomBand {
  switch (current) {
    case 'globe':
      return altitude <= COUNTRIES_ENTER ? 'countries' : 'globe';
    case 'countries':
      return altitude >= COUNTRIES_EXIT ? 'globe' : 'countries';
    case 'detail':
      if (altitude >= COUNTRIES_EXIT) return 'globe';
      if (altitude >= DETAIL_EXIT) return 'countries';
      return 'detail';
  }
}
