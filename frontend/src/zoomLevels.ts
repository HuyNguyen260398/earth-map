// globe → countries → one country's provinces → one province's wards.
export type ZoomBand = 'globe' | 'countries' | 'detail' | 'ward';

// Camera altitude thresholds in globe-radius units (default view ≈ 2.5).
// Enter/exit differ (hysteresis) so the view doesn't flicker at a boundary.
export const COUNTRIES_ENTER = 1.8;
export const COUNTRIES_EXIT = 2.0;
export const DETAIL_EXIT = 0.8;
// Scrolling out past this steps ward → detail; it sits above every ward landing
// altitude so arriving in the ward view never immediately bounces back out.
export const WARD_EXIT = 0.28;

// Altitudes the camera flies to when a click changes band. The detail and ward
// altitudes are derived per shape from its size (see geo.ts) and clamped to
// these ranges, each kept below its band's exit so landing doesn't bounce out.
export const GLOBE_VIEW_ALTITUDE = 2.5;
export const COUNTRIES_VIEW_ALTITUDE = 1.3;
export const DETAIL_VIEW_MIN_ALTITUDE = 0.12;
export const DETAIL_VIEW_MAX_ALTITUDE = 0.55;
export const WARD_VIEW_MIN_ALTITUDE = 0.04;
export const WARD_VIEW_MAX_ALTITUDE = 0.2;

// Zoom-driven band changes. `detail` and `ward` are only ever *entered* by
// clicking (a country, then a province) — scrolling in has nothing to focus on
// — but scrolling out still steps back down the ladder.
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
    case 'ward':
      if (altitude >= COUNTRIES_EXIT) return 'globe';
      if (altitude >= DETAIL_EXIT) return 'countries';
      if (altitude >= WARD_EXIT) return 'detail';
      return 'ward';
  }
}
