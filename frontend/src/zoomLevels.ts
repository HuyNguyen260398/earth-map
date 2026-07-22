export type ZoomBand = 'globe' | 'countries' | 'detail';

// Camera altitude thresholds in globe-radius units (default view ≈ 2.5).
// Enter/exit differ (hysteresis) so the view doesn't flicker at a boundary.
export const COUNTRIES_ENTER = 1.8;
export const COUNTRIES_EXIT = 2.0;
export const DETAIL_ENTER = 0.6;
export const DETAIL_EXIT = 0.75;

export function nextBand(current: ZoomBand, altitude: number): ZoomBand {
  switch (current) {
    case 'globe':
      if (altitude <= DETAIL_ENTER) return 'detail';
      if (altitude <= COUNTRIES_ENTER) return 'countries';
      return 'globe';
    case 'countries':
      if (altitude <= DETAIL_ENTER) return 'detail';
      if (altitude >= COUNTRIES_EXIT) return 'globe';
      return 'countries';
    case 'detail':
      if (altitude >= COUNTRIES_EXIT) return 'globe';
      if (altitude >= DETAIL_EXIT) return 'countries';
      return 'detail';
  }
}
