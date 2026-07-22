import type { GlobeInstance } from 'globe.gl';
import type { Feature } from 'geojson';
import { featureName } from './layers';
import { geometryCentroid } from './geo';

export const FLY_ALTITUDE = 0.5; // inside the detail band (enter ≤ 0.6)
const FLY_MS = 1200;

const BASE_FILL = 'rgba(60, 120, 220, 0.25)';
const HOVER_FILL = 'rgba(255, 200, 0, 0.55)';

export function attachInteractions(globe: GlobeInstance): void {
  let hovered: object | null = null;

  globe
    .polygonLabel((f) => `<b>${featureName(f as Feature)}</b>`)
    .polygonCapColor((d) => (d === hovered ? HOVER_FILL : BASE_FILL))
    .polygonStrokeColor((d) => (d === hovered ? '#ffd700' : '#ffffff'))
    .onPolygonHover((f) => {
      hovered = f;
      // Re-assign the accessors so globe.gl re-evaluates colors for the new
      // hover state; the closures above read the updated `hovered`.
      globe
        .polygonCapColor((d) => (d === hovered ? HOVER_FILL : BASE_FILL))
        .polygonStrokeColor((d) => (d === hovered ? '#ffd700' : '#ffffff'));
    })
    .onPolygonClick((f) => {
      const feature = f as Feature;
      if (!feature.geometry) return;
      const { lat, lng } = geometryCentroid(feature.geometry);
      globe.pointOfView({ lat, lng, altitude: FLY_ALTITUDE }, FLY_MS);
    });
}
