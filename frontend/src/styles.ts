import type { Feature } from 'geojson';
import type { ZoomBand } from './zoomLevels';

export interface PolygonStyleContext {
  band: ZoomBand;
  hovered: Feature | null;
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

export function polygonCapColor(f: Feature, ctx: PolygonStyleContext): string {
  return f === ctx.hovered ? HOVER_FILL : NO_FILL;
}

export function polygonStrokeColor(f: Feature, ctx: PolygonStyleContext): string {
  if (f === ctx.hovered) return HOVER_STROKE;
  return ctx.band === 'detail' ? SUBDIVISION_STROKE : COUNTRY_STROKE;
}
