import type { Feature } from 'geojson';
import type { ZoomBand } from './zoomLevels';

export interface PolygonStyleContext {
  band: ZoomBand;
  hovered: Feature | null;
  // The country the detail view is focused on. Its border is highlighted so the
  // user always knows which country's subdivisions they're looking at.
  selected: Feature | null;
}

// Caps are invisible but still present: three-globe only builds (and therefore
// only raycasts) a polygon's top face when the cap accessor yields a colour, so
// a fully transparent fill is what keeps borderless countries hoverable.
const NO_FILL = 'rgba(255, 255, 255, 0)';
const HOVER_FILL = 'rgba(255, 190, 80, 0.35)';

// Idle borders sit just above the noise floor of the texture so they read as
// part of the globe; hover is what actually picks a shape out.
const HOVER_STROKE = 'rgba(255, 228, 160, 0.95)';
const COUNTRY_STROKE = 'rgba(190, 220, 250, 0.42)';
const SUBDIVISION_STROKE = 'rgba(160, 230, 255, 0.6)';

// High enough to clear the globe without z-fighting, low enough that the
// borders still look painted on rather than floating.
export const POLYGON_ALTITUDE = 0.005;

// The drill-down bands (detail, ward) show one shape's subdivisions. `selected`
// is that focus shape (a country, then a province); it's invisible in the
// polygon layer — its highlighted outline is drawn separately as a glowing path
// (see border.ts) — and kept in the polygon data only so clicks inside it still
// resolve to the focus, keeping the user at that level rather than open ocean.
function isSubdivided(band: PolygonStyleContext['band']): boolean {
  return band === 'detail' || band === 'ward';
}

function isFocusOverlay(f: Feature, ctx: PolygonStyleContext): boolean {
  return isSubdivided(ctx.band) && f === ctx.selected;
}

export function polygonCapColor(f: Feature, ctx: PolygonStyleContext): string | null {
  if (f === ctx.hovered) return HOVER_FILL;
  // No cap keeps the focus shape out of hover raycasting, so the subdivisions
  // overlaid beneath it stay hoverable and don't z-fight a coplanar cap.
  if (isFocusOverlay(f, ctx)) return null;
  return NO_FILL;
}

export function polygonStrokeColor(f: Feature, ctx: PolygonStyleContext): string | null {
  if (f === ctx.hovered) return HOVER_STROKE;
  // Falsy stroke tells three-globe to hide the line; the glow path replaces it.
  if (isFocusOverlay(f, ctx)) return null;
  return isSubdivided(ctx.band) ? SUBDIVISION_STROKE : COUNTRY_STROKE;
}
